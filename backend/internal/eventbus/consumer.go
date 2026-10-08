package eventbus

import (
	"context"
	"encoding/json"
	"errors"
	"log"
	"time"

	"github.com/segmentio/kafka-go"

	"github.com/rafhael-viana/TCC/internal/events"
)

const (
	maxAttempts  = 3
	retryBackoff = time.Second
)

// Handler processa um evento. Retornar erro faz o evento ser reprocessado
// algumas vezes antes de ser descartado.
type Handler func(ctx context.Context, e events.Event) error

type ConsumerConfig struct {
	Brokers []string
	Topic   string
	GroupID string // cada serviço usa o seu: todos recebem todos os eventos
}

// Consume lê o tópico como parte do consumer group e chama h para cada evento,
// até ctx ser cancelado. O offset só é confirmado depois do processamento
// (entrega at-least-once), então h deve tolerar eventos repetidos.
func Consume(ctx context.Context, cfg ConsumerConfig, h Handler) error {
	r := kafka.NewReader(kafka.ReaderConfig{
		Brokers:     cfg.Brokers,
		Topic:       cfg.Topic,
		GroupID:     cfg.GroupID,
		StartOffset: kafka.FirstOffset, // grupo novo lê o tópico desde o início
		MaxWait:     500 * time.Millisecond,
		ErrorLogger: kafka.LoggerFunc(func(msg string, args ...any) {
			log.Printf("eventbus: "+msg, args...)
		}),
	})
	defer r.Close()

	log.Printf("eventbus: consuming %s as group %s", cfg.Topic, cfg.GroupID)

	for {
		msg, err := r.FetchMessage(ctx)
		if err != nil {
			if ctx.Err() != nil {
				return nil
			}
			return err
		}

		handle(ctx, msg, h)

		if err := r.CommitMessages(ctx, msg); err != nil {
			if ctx.Err() != nil {
				return nil
			}
			log.Printf("eventbus: commit offset %d: %v", msg.Offset, err)
		}
	}
}

func handle(ctx context.Context, msg kafka.Message, h Handler) {
	var e events.Event
	if err := json.Unmarshal(msg.Value, &e); err != nil {
		// Mensagem malformada nunca vai ser processada: descarta.
		log.Printf("eventbus: discarding malformed message at %s/%d offset %d: %v",
			msg.Topic, msg.Partition, msg.Offset, err)
		return
	}

	for attempt := 1; ; attempt++ {
		err := h(ctx, e)
		if err == nil || errors.Is(err, context.Canceled) {
			return
		}
		if attempt == maxAttempts {
			log.Printf("eventbus: giving up on event %s (%s) after %d attempts: %v", e.ID, e.Type, attempt, err)
			return
		}
		log.Printf("eventbus: event %s (%s) attempt %d failed: %v", e.ID, e.Type, attempt, err)

		select {
		case <-ctx.Done():
			return
		case <-time.After(retryBackoff * time.Duration(attempt)):
		}
	}
}
