package generator

import (
	"cmp"
	"context"
	"fmt"
	"strconv"
	"time"

	"github.com/rafhael-viana/TCC/internal/report/model"
	"github.com/rafhael-viana/TCC/internal/report/repository"
)

const timeLayout = "2006-01-02 15:04:05"

// Table é o conteúdo de um relatório, independente do formato do arquivo.
type Table struct {
	Title       string
	GeneratedAt time.Time
	Headers     []string
	Rows        [][]string
}

type Generator struct {
	activity repository.ActivityRepository
}

func New(activity repository.ActivityRepository) *Generator {
	return &Generator{activity: activity}
}

// Generate monta o relatório com os dados atuais e devolve o arquivo pronto.
func (g *Generator) Generate(ctx context.Context, typ model.Type, format model.Format) ([]byte, error) {
	var (
		t   *Table
		err error
	)
	switch typ {
	case model.TypeUsers:
		t, err = g.users(ctx)
	case model.TypeLogins:
		t, err = g.logins(ctx)
	default:
		return nil, fmt.Errorf("unknown report type %q", typ)
	}
	if err != nil {
		return nil, err
	}

	switch format {
	case model.FormatCSV:
		return renderCSV(t)
	case model.FormatPDF:
		return renderPDF(t)
	default:
		return nil, fmt.Errorf("unknown report format %q", format)
	}
}

func (g *Generator) users(ctx context.Context) (*Table, error) {
	users, err := g.activity.Users(ctx)
	if err != nil {
		return nil, fmt.Errorf("load users: %w", err)
	}

	t := &Table{
		Title:       "Usuários cadastrados",
		GeneratedAt: time.Now().UTC(),
		Headers:     []string{"Nome", "Username", "Email", "Cadastro", "Logins OK", "Logins com falha", "Último login"},
	}
	for _, u := range users {
		t.Rows = append(t.Rows, []string{
			u.Name,
			u.Username,
			u.Email,
			formatTime(u.RegisteredAt),
			strconv.Itoa(u.LoginsOK),
			strconv.Itoa(u.LoginsFailed),
			formatTime(u.LastLoginAt),
		})
	}
	return t, nil
}

func (g *Generator) logins(ctx context.Context) (*Table, error) {
	logins, err := g.activity.Logins(ctx)
	if err != nil {
		return nil, fmt.Errorf("load logins: %w", err)
	}
	users, err := g.activity.Users(ctx)
	if err != nil {
		return nil, fmt.Errorf("load users: %w", err)
	}
	usernames := make(map[string]string, len(users))
	for _, u := range users {
		usernames[u.ID] = u.Username
	}

	t := &Table{
		Title:       "Tentativas de login",
		GeneratedAt: time.Now().UTC(),
		Headers:     []string{"Data", "Login", "Resultado", "Motivo"},
	}
	for _, a := range logins {
		result := "falha"
		if a.Success {
			result = "sucesso"
		}
		// O evento de sucesso só traz o ID: mostra o username quando conhecido.
		login := a.Login
		if login == "" {
			login = cmp.Or(usernames[a.UserID], a.UserID)
		}
		t.Rows = append(t.Rows, []string{formatTime(a.OccurredAt), login, result, a.Reason})
	}
	return t, nil
}

func formatTime(t time.Time) string {
	if t.IsZero() {
		return ""
	}
	return t.UTC().Format(timeLayout)
}
