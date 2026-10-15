package service

import (
	"context"
	"crypto/rand"
	"errors"
	"fmt"
	"io"
	"log"
	"time"

	"github.com/rafhael-viana/TCC/internal/events"
	"github.com/rafhael-viana/TCC/internal/report/generator"
	"github.com/rafhael-viana/TCC/internal/report/model"
	"github.com/rafhael-viana/TCC/internal/report/repository"
	"github.com/rafhael-viana/TCC/internal/report/storage"
)

const eventSource = "report"

// ErrReportNotReady indica que o arquivo ainda não pode ser baixado.
var ErrReportNotReady = errors.New("report is not ready")

// ValidationError indica dados de entrada inválidos (vira 400 no handler).
type ValidationError struct{ Msg string }

func (e *ValidationError) Error() string { return e.Msg }

type RequestInput struct {
	Type   model.Type   `json:"type"`
	Format model.Format `json:"format"`
}

// EventPublisher publica eventos de domínio (ex.: no Kafka).
type EventPublisher interface {
	Publish(ctx context.Context, key string, e events.Event) error
}

type ReportService struct {
	reports   repository.ReportRepository
	objects   storage.ObjectStore
	generator *generator.Generator
	events    EventPublisher
}

func NewReportService(reports repository.ReportRepository, objects storage.ObjectStore, gen *generator.Generator, publisher EventPublisher) *ReportService {
	return &ReportService{reports: reports, objects: objects, generator: gen, events: publisher}
}

// Request registra o pedido como pendente e publica report.requested. A
// geração acontece depois, quando o evento é consumido.
func (s *ReportService) Request(ctx context.Context, in RequestInput) (*model.Report, error) {
	if err := validate(in.Type, in.Format); err != nil {
		return nil, err
	}

	rep := &model.Report{
		ID:        rand.Text(),
		Type:      in.Type,
		Format:    in.Format,
		Status:    model.StatusPending,
		CreatedAt: time.Now().UTC(),
	}
	if err := s.reports.Save(ctx, rep); err != nil {
		return nil, fmt.Errorf("save report: %w", err)
	}

	e, err := events.New(eventSource, events.TypeReportRequested, events.ReportRequested{
		ReportID: rep.ID,
		Type:     string(rep.Type),
		Format:   string(rep.Format),
	})
	if err == nil {
		err = s.events.Publish(ctx, rep.ID, e)
	}
	if err != nil {
		// Sem o evento o relatório nunca seria gerado: marca como falho.
		log.Printf("publish %s event: %v", events.TypeReportRequested, err)
		rep.Status = model.StatusFailed
		rep.Error = "could not enqueue report"
		rep.CompletedAt = time.Now().UTC()
		if err := s.reports.Save(ctx, rep); err != nil {
			return nil, fmt.Errorf("save report: %w", err)
		}
	}
	return rep, nil
}

// Generate processa um pedido vindo do Kafka. Pedidos publicados por outros
// serviços ainda não existem no repositório e são criados aqui. Um pedido já
// concluído é ignorado, então o evento pode ser entregue mais de uma vez.
func (s *ReportService) Generate(ctx context.Context, req events.ReportRequested) error {
	if req.ReportID == "" {
		return &ValidationError{"report_id is required"}
	}
	typ, format := model.Type(req.Type), model.Format(req.Format)
	if err := validate(typ, format); err != nil {
		return err
	}

	rep, err := s.reports.FindByID(ctx, req.ReportID)
	switch {
	case errors.Is(err, repository.ErrReportNotFound):
		rep = &model.Report{ID: req.ReportID, Type: typ, Format: format, CreatedAt: time.Now().UTC()}
	case err != nil:
		return err
	case rep.Status != model.StatusPending:
		return nil
	}

	data, genErr := s.generator.Generate(ctx, rep.Type, rep.Format)
	if genErr == nil {
		rep.ObjectKey = rep.Filename()
		genErr = s.objects.Put(ctx, rep.ObjectKey, data)
	}

	rep.CompletedAt = time.Now().UTC()
	if genErr != nil {
		log.Printf("generate report %s: %v", rep.ID, genErr)
		rep.Status = model.StatusFailed
		rep.Error = "report generation failed"
	} else {
		rep.Status = model.StatusDone
		rep.Size = len(data)
	}
	return s.reports.Save(ctx, rep)
}

func (s *ReportService) Get(ctx context.Context, id string) (*model.Report, error) {
	return s.reports.FindByID(ctx, id)
}

func (s *ReportService) List(ctx context.Context) ([]*model.Report, error) {
	return s.reports.List(ctx)
}

// Open devolve o relatório e o conteúdo do arquivo; quem chama fecha o reader.
func (s *ReportService) Open(ctx context.Context, id string) (*model.Report, io.ReadCloser, error) {
	rep, err := s.reports.FindByID(ctx, id)
	if err != nil {
		return nil, nil, err
	}
	if rep.Status != model.StatusDone {
		return nil, nil, ErrReportNotReady
	}
	f, err := s.objects.Get(ctx, rep.ObjectKey)
	if err != nil {
		return nil, nil, fmt.Errorf("open report %s: %w", id, err)
	}
	return rep, f, nil
}

func validate(typ model.Type, format model.Format) error {
	switch typ {
	case model.TypeUsers, model.TypeLogins:
	default:
		return &ValidationError{"type must be one of: users, logins"}
	}
	switch format {
	case model.FormatPDF, model.FormatCSV:
	default:
		return &ValidationError{"format must be one of: pdf, csv"}
	}
	return nil
}
