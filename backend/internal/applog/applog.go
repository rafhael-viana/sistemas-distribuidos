// Package applog publica os logs técnicos dos serviços no tópico logs.events.
// Cada requisição HTTP e cada evento processado vira um LogRecord com o ID de
// correlação, o que permite seguir uma falha ponta a ponta entre serviços.
package applog

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"runtime/debug"
	"strings"
	"time"

	"github.com/rafhael-viana/TCC/internal/authn"
	"github.com/rafhael-viana/TCC/internal/events"
	"github.com/rafhael-viana/TCC/internal/requestid"
	"github.com/rafhael-viana/TCC/internal/response"
)

// Publisher publica eventos (ex.: KafkaPublisher no tópico logs.events).
type Publisher interface {
	Publish(ctx context.Context, key string, e events.Event) error
}

type Logger struct {
	service string
	pub     Publisher
}

// New cria o logger do serviço. Com pub nil os registros só vão para o stdout.
func New(service string, pub Publisher) *Logger {
	return &Logger{service: service, pub: pub}
}

// Record completa e publica um registro. Também escreve uma linha no stdout.
func (l *Logger) Record(ctx context.Context, rec events.LogRecord) {
	l.record(ctx, rec, time.Time{})
}

// record publica com o horário em que a operação começou (zero = agora), para
// a linha do tempo de uma requisição sair na ordem certa entre os serviços.
func (l *Logger) record(ctx context.Context, rec events.LogRecord, startedAt time.Time) {
	rec.Service = l.service
	id := requestid.From(ctx)
	log.Printf("[%s] %s %s", rec.Level, id, rec.Message)
	if l.pub == nil {
		return
	}
	e, err := events.New(l.service, events.TypeLogRecorded, rec)
	if err == nil {
		e.CorrelationID = id
		if !startedAt.IsZero() {
			e.OccurredAt = startedAt.UTC()
		}
		err = l.pub.Publish(ctx, id, e)
	}
	if err != nil {
		log.Printf("applog: publish log: %v", err)
	}
}

// Error registra uma falha fora de uma requisição HTTP (ex.: um job).
func (l *Logger) Error(ctx context.Context, msg string, err error) {
	l.Record(ctx, events.LogRecord{Level: events.LevelError, Kind: "job", Message: msg, Error: err.Error()})
}

// maxErrorBody limita quanto do corpo de uma resposta de erro é guardado.
const maxErrorBody = 1024

type recorder struct {
	http.ResponseWriter
	status int
	body   bytes.Buffer
}

func (r *recorder) WriteHeader(code int) {
	r.status = code
	r.ResponseWriter.WriteHeader(code)
}

func (r *recorder) Write(b []byte) (int, error) {
	if r.status >= 400 && r.body.Len() < maxErrorBody {
		r.body.Write(b[:min(len(b), maxErrorBody-r.body.Len())])
	}
	return r.ResponseWriter.Write(b)
}

// Flush mantém o streaming do proxy reverso funcionando.
func (r *recorder) Flush() {
	if f, ok := r.ResponseWriter.(http.Flusher); ok {
		f.Flush()
	}
}

// Middleware atribui o X-Request-ID, recupera panics e registra a requisição.
// GETs bem-sucedidos não são publicados (só poluiriam a trilha); o resto é.
func (l *Logger) Middleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		id := r.Header.Get(requestid.Header)
		if id == "" {
			id = requestid.New()
			r.Header.Set(requestid.Header, id) // segue para os serviços atrás do proxy
		}
		w.Header().Set(requestid.Header, id)
		ctx := requestid.With(r.Context(), id)

		start := time.Now()
		rec := &recorder{ResponseWriter: w, status: http.StatusOK}
		var stack string
		func() {
			defer func() {
				if p := recover(); p != nil {
					stack = fmt.Sprintf("%v\n%s", p, debug.Stack())
					response.Error(rec, http.StatusInternalServerError, "internal server error")
				}
			}()
			next.ServeHTTP(rec, r.WithContext(ctx))
		}()

		if r.URL.Path == "/health" {
			return
		}
		level := levelFor(rec.status, stack != "")
		if level == events.LevelInfo && r.Method == http.MethodGet {
			return
		}
		lr := events.LogRecord{
			Level:      level,
			Kind:       "http",
			Message:    fmt.Sprintf("%s %s -> %d", r.Method, r.URL.Path, rec.status),
			Method:     r.Method,
			Path:       r.URL.Path,
			Status:     rec.status,
			DurationMS: time.Since(start).Milliseconds(),
			Error:      errorMessage(rec.body.Bytes()),
			Stack:      stack,
		}
		if c := authn.ParseUnverified(authn.BearerToken(r)); c != nil {
			lr.UserID = c.Subject
		}
		// Publica fora do caminho da resposta, que já foi enviada.
		l.record(context.WithoutCancel(ctx), lr, start)
	})
}

func levelFor(status int, panicked bool) string {
	switch {
	case panicked:
		return events.LevelCritical
	case status >= 500:
		return events.LevelError
	case status >= 400:
		return events.LevelWarn
	default:
		return events.LevelInfo
	}
}

func errorMessage(body []byte) string {
	var b struct {
		Error string `json:"error"`
	}
	if json.Unmarshal(body, &b) == nil && b.Error != "" {
		return b.Error
	}
	return strings.TrimSpace(string(body))
}

// Handler é o formato dos handlers de eventos do eventbus.
type Handler = func(ctx context.Context, e events.Event) error

// WrapHandler registra cada evento do Kafka processado pelo serviço, com a
// duração e o erro, quando houver.
func (l *Logger) WrapHandler(h Handler) Handler {
	return func(ctx context.Context, e events.Event) error {
		start := time.Now()
		err := h(ctx, e)
		lr := events.LogRecord{
			Level:      events.LevelInfo,
			Kind:       "event",
			Message:    "consumed " + e.Type,
			Method:     "CONSUME",
			Path:       e.Type,
			DurationMS: time.Since(start).Milliseconds(),
		}
		if err != nil {
			lr.Level = events.LevelError
			lr.Message = "failed to process " + e.Type
			lr.Error = err.Error()
		}
		l.record(ctx, lr, start)
		return err
	}
}
