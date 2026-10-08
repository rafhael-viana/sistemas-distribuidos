package service

import (
	"context"
	"crypto/rand"
	"fmt"
	"net/mail"
	"strings"
	"time"

	"github.com/rafhael-viana/TCC/internal/notification/model"
	"github.com/rafhael-viana/TCC/internal/notification/repository"
	"github.com/rafhael-viana/TCC/internal/notification/sender"
)

const (
	maxSubjectLen = 255
	maxBodyLen    = 100_000
)

// ValidationError indica dados de entrada inválidos (vira 400 no handler).
type ValidationError struct{ Msg string }

func (e *ValidationError) Error() string { return e.Msg }

type SendEmailInput struct {
	To      string `json:"to"`
	Subject string `json:"subject"`
	Body    string `json:"body"`
}

type EmailService struct {
	emails repository.EmailRepository
	sender sender.EmailSender
}

func NewEmailService(emails repository.EmailRepository, sender sender.EmailSender) *EmailService {
	return &EmailService{emails: emails, sender: sender}
}

// Send valida e envia o email, registrando o resultado no histórico. Uma
// falha do sender não é retornada como erro: o email fica com status "failed".
func (s *EmailService) Send(ctx context.Context, in SendEmailInput) (*model.Email, error) {
	in.To = strings.ToLower(strings.TrimSpace(in.To))
	in.Subject = strings.TrimSpace(in.Subject)

	switch {
	case !validEmail(in.To):
		return nil, &ValidationError{"invalid recipient email"}
	case in.Subject == "":
		return nil, &ValidationError{"subject is required"}
	case len(in.Subject) > maxSubjectLen:
		return nil, &ValidationError{fmt.Sprintf("subject must have at most %d characters", maxSubjectLen)}
	case strings.TrimSpace(in.Body) == "":
		return nil, &ValidationError{"body is required"}
	case len(in.Body) > maxBodyLen:
		return nil, &ValidationError{fmt.Sprintf("body must have at most %d characters", maxBodyLen)}
	}

	e := &model.Email{
		ID:        rand.Text(),
		To:        in.To,
		Subject:   in.Subject,
		Body:      in.Body,
		CreatedAt: time.Now().UTC(),
	}

	if err := s.sender.Send(ctx, e); err != nil {
		e.Status = model.StatusFailed
		e.Error = err.Error()
	} else {
		e.Status = model.StatusSent
		e.SentAt = time.Now().UTC()
	}

	if err := s.emails.Save(ctx, e); err != nil {
		return nil, fmt.Errorf("save email: %w", err)
	}
	return e, nil
}

func (s *EmailService) Get(ctx context.Context, id string) (*model.Email, error) {
	return s.emails.FindByID(ctx, id)
}

func (s *EmailService) List(ctx context.Context) ([]*model.Email, error) {
	return s.emails.List(ctx)
}

func validEmail(email string) bool {
	addr, err := mail.ParseAddress(email)
	return err == nil && addr.Address == email
}
