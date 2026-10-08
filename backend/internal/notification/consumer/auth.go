package consumer

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log"

	"github.com/rafhael-viana/TCC/internal/events"
	"github.com/rafhael-viana/TCC/internal/notification/service"
)

// AuthEvents transforma eventos do serviço de autenticação em notificações.
type AuthEvents struct {
	emails *service.EmailService
}

func NewAuthEvents(emails *service.EmailService) *AuthEvents {
	return &AuthEvents{emails: emails}
}

func (c *AuthEvents) Handle(ctx context.Context, e events.Event) error {
	switch e.Type {
	case events.TypeUserRegistered:
		return c.welcome(ctx, e)
	default:
		return nil // eventos que não geram notificação
	}
}

func (c *AuthEvents) welcome(ctx context.Context, e events.Event) error {
	var data events.UserRegistered
	if err := json.Unmarshal(e.Data, &data); err != nil {
		log.Printf("discarding event %s: invalid %s data: %v", e.ID, e.Type, err)
		return nil
	}

	_, err := c.emails.Send(ctx, service.SendEmailInput{
		To:      data.Email,
		Subject: "Bem-vindo(a)!",
		Body:    fmt.Sprintf("Olá %s, sua conta (@%s) foi criada com sucesso.", data.Name, data.Username),
	})

	// Dado inválido não melhora com nova tentativa: descarta.
	var vErr *service.ValidationError
	if errors.As(err, &vErr) {
		log.Printf("discarding event %s: %v", e.ID, err)
		return nil
	}
	return err
}
