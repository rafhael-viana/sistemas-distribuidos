package generator

import (
	"cmp"
	"context"
	"fmt"
	"strconv"
	"strings"
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

// Generate monta o relatório com os dados atuais do escopo pedido (empresa e
// equipes) e devolve o arquivo pronto.
func (g *Generator) Generate(ctx context.Context, rep *model.Report) ([]byte, error) {
	teams, err := g.activity.Teams(ctx)
	if err != nil {
		return nil, fmt.Errorf("load teams: %w", err)
	}
	teamNames := make(map[string]string, len(teams))
	for _, t := range teams {
		teamNames[t.ID] = t.Name
	}

	var t *Table
	switch rep.Type {
	case model.TypeUsers:
		t, err = g.users(ctx, rep.Scope(), teamNames)
	case model.TypeLogins:
		t, err = g.logins(ctx, rep.Scope())
	default:
		return nil, fmt.Errorf("unknown report type %q", rep.Type)
	}
	if err != nil {
		return nil, err
	}
	if len(rep.TeamIDs) > 0 {
		names := make([]string, 0, len(rep.TeamIDs))
		for _, id := range rep.TeamIDs {
			names = append(names, cmp.Or(teamNames[id], id))
		}
		t.Title += " - Equipes: " + strings.Join(names, ", ")
	}

	switch rep.Format {
	case model.FormatCSV:
		return renderCSV(t)
	case model.FormatPDF:
		return renderPDF(t)
	default:
		return nil, fmt.Errorf("unknown report format %q", rep.Format)
	}
}

func (g *Generator) users(ctx context.Context, scope model.Scope, teamNames map[string]string) (*Table, error) {
	users, err := g.activity.Users(ctx, scope)
	if err != nil {
		return nil, fmt.Errorf("load users: %w", err)
	}

	t := &Table{
		Title:       "Usuários cadastrados",
		GeneratedAt: time.Now().UTC(),
		Headers:     []string{"Nome", "Username", "Email", "Equipe", "Status", "Cadastro", "Logins OK", "Logins com falha", "Último login"},
	}
	for _, u := range users {
		status := "ativo"
		if !u.Active {
			status = "inativo"
		}
		t.Rows = append(t.Rows, []string{
			u.Name,
			u.Username,
			u.Email,
			teamNames[u.TeamID],
			status,
			formatTime(u.RegisteredAt),
			strconv.Itoa(u.LoginsOK),
			strconv.Itoa(u.LoginsFailed),
			formatTime(u.LastLoginAt),
		})
	}
	return t, nil
}

// logins lista as tentativas dos usuários do escopo. Sem escopo (relatório da
// plataforma), entram também as tentativas com login desconhecido.
func (g *Generator) logins(ctx context.Context, scope model.Scope) (*Table, error) {
	logins, err := g.activity.Logins(ctx)
	if err != nil {
		return nil, fmt.Errorf("load logins: %w", err)
	}
	users, err := g.activity.Users(ctx, scope)
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
	scoped := scope.TenantID != "" || len(scope.TeamIDs) > 0
	for _, a := range logins {
		if _, known := usernames[a.UserID]; scoped && !known {
			continue
		}
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
