package sender

import (
	"context"
	"log"

	"github.com/rafhael-viana/TCC/internal/notification/model"
)

// EmailSender entrega um email ao destinatário. Hoje só existe o mock; para
// enviar de verdade basta implementar esta interface (SMTP, SES, SendGrid...)
// e trocar no main.
type EmailSender interface {
	Send(ctx context.Context, e *model.Email) error
}

// MockSender não envia nada: apenas registra o email no log, simulando um
// envio bem-sucedido.
type MockSender struct{}

func NewMockSender() *MockSender {
	return &MockSender{}
}

func (MockSender) Send(ctx context.Context, e *model.Email) error {
	if err := ctx.Err(); err != nil {
		return err
	}
	log.Printf("[mock email] id=%s to=%s subject=%q\n%s", e.ID, e.To, e.Subject, e.Body)
	return nil
}
