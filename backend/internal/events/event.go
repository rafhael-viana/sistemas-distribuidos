package events

import (
	"crypto/rand"
	"encoding/json"
	"fmt"
	"time"
)

// TopicAuth recebe os eventos publicados pelo serviço de autenticação.
const TopicAuth = "auth.events"

const (
	TypeUserRegistered = "user.registered"
	TypeLoginSucceeded = "user.login_succeeded"
	TypeLoginFailed    = "user.login_failed"
)

// Event é o envelope comum de todos os eventos de domínio. O conteúdo
// específico de cada tipo vai em Data.
type Event struct {
	ID         string          `json:"id"`
	Type       string          `json:"type"`
	Source     string          `json:"source"`
	OccurredAt time.Time       `json:"occurred_at"`
	Data       json.RawMessage `json:"data"`
}

func New(source, typ string, data any) (Event, error) {
	raw, err := json.Marshal(data)
	if err != nil {
		return Event{}, fmt.Errorf("marshal %s data: %w", typ, err)
	}
	return Event{
		ID:         rand.Text(),
		Type:       typ,
		Source:     source,
		OccurredAt: time.Now().UTC(),
		Data:       raw,
	}, nil
}

type UserRegistered struct {
	UserID   string `json:"user_id"`
	Name     string `json:"name"`
	Username string `json:"username"`
	Email    string `json:"email"`
}

type LoginSucceeded struct {
	UserID string `json:"user_id"`
}

type LoginFailed struct {
	Login  string `json:"login"` // email ou username informado
	Reason string `json:"reason"`
}
