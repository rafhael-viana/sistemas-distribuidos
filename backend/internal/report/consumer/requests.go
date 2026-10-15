package consumer

import (
	"context"
	"errors"
	"log"

	"github.com/rafhael-viana/TCC/internal/events"
	"github.com/rafhael-viana/TCC/internal/report/service"
)

// Requests gera os relatórios pedidos pelos eventos report.requested.
type Requests struct {
	reports *service.ReportService
}

func NewRequests(reports *service.ReportService) *Requests {
	return &Requests{reports: reports}
}

func (c *Requests) Handle(ctx context.Context, e events.Event) error {
	if e.Type != events.TypeReportRequested {
		return nil
	}

	var data events.ReportRequested
	if !decode(e, &data) {
		return nil
	}

	err := c.reports.Generate(ctx, data)

	// Pedido inválido não melhora com nova tentativa: descarta.
	var vErr *service.ValidationError
	if errors.As(err, &vErr) {
		log.Printf("discarding event %s: %v", e.ID, err)
		return nil
	}
	return err
}
