package model

import "time"

// User é a visão local de um usuário, montada a partir dos eventos do auth.
type User struct {
	ID           string
	Name         string
	Username     string
	Email        string
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
