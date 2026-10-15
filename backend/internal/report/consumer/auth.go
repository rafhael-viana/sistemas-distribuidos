package consumer

import (
	"context"
	"encoding/json"
	"log"

	"github.com/rafhael-viana/TCC/internal/events"
	"github.com/rafhael-viana/TCC/internal/report/model"
	"github.com/rafhael-viana/TCC/internal/report/repository"
)

// AuthEvents copia os dados do serviço de autenticação que entram nos
// relatórios. O gerador nunca consulta o auth diretamente.
type AuthEvents struct {
	activity repository.ActivityRepository
}

func NewAuthEvents(activity repository.ActivityRepository) *AuthEvents {
	return &AuthEvents{activity: activity}
}

func (c *AuthEvents) Handle(ctx context.Context, e events.Event) error {
	switch e.Type {
	case events.TypeUserRegistered:
		var data events.UserRegistered
		if !decode(e, &data) {
			return nil
		}
		return c.activity.SaveUser(ctx, &model.User{
			ID:           data.UserID,
			Name:         data.Name,
			Username:     data.Username,
			Email:        data.Email,
			RegisteredAt: e.OccurredAt,
		})

	case events.TypeLoginSucceeded:
		var data events.LoginSucceeded
		if !decode(e, &data) {
			return nil
		}
		return c.activity.SaveLogin(ctx, &model.LoginAttempt{
			EventID:    e.ID,
			UserID:     data.UserID,
			Success:    true,
			OccurredAt: e.OccurredAt,
		})

	case events.TypeLoginFailed:
		var data events.LoginFailed
		if !decode(e, &data) {
			return nil
		}
		return c.activity.SaveLogin(ctx, &model.LoginAttempt{
			EventID:    e.ID,
			Login:      data.Login,
			Reason:     data.Reason,
			OccurredAt: e.OccurredAt,
		})

	default:
		return nil // eventos que não entram em relatórios
	}
}

// decode descarta o evento quando o conteúdo é inválido: nova tentativa não
// resolveria.
func decode(e events.Event, v any) bool {
	if err := json.Unmarshal(e.Data, v); err != nil {
		log.Printf("discarding event %s: invalid %s data: %v", e.ID, e.Type, err)
		return false
	}
	return true
}
