package model

import "time"

// User é a visão local de um usuário, montada a partir dos eventos do auth.
type User struct {
	ID           string
	Name         string
	Username     string
	Email        string
	Role         string
	TenantID     string
	TeamID       string
	Active       bool
	RegisteredAt time.Time
	LoginsOK     int
	LoginsFailed int
	LastLoginAt  time.Time
}

// LoginAttempt é uma tentativa de login. Login é o que foi digitado (email ou
// username); UserID fica vazio quando o usuário não existe.
type LoginAttempt struct {
	EventID    string
	UserID     string
	Login      string
	Success    bool
	Reason     string
	OccurredAt time.Time
}

// Team é a visão local de uma equipe, montada a partir dos eventos team.*.
type Team struct {
	ID       string
	TenantID string
	Name     string
}

// Scope restringe os dados de um relatório: uma empresa (vazio = todas) e,
// dentro dela, algumas equipes (vazio = todas).
type Scope struct {
	TenantID string
	TeamIDs  []string
}

func (s Scope) Match(u *User) bool {
	if s.TenantID != "" && u.TenantID != s.TenantID {
		return false
	}
	if len(s.TeamIDs) == 0 {
		return true
	}
	for _, id := range s.TeamIDs {
		if u.TeamID == id {
			return true
		}
	}
	return false
}
