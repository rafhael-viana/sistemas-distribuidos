package model

import "time"

type Status string

const (
	StatusSent   Status = "sent"
	StatusFailed Status = "failed"
)

type Email struct {
	ID        string    `json:"id"`
	To        string    `json:"to"`
	Subject   string    `json:"subject"`
	Body      string    `json:"body"`
	Status    Status    `json:"status"`
	Error     string    `json:"error,omitempty"`
	CreatedAt time.Time `json:"created_at"`
	SentAt    time.Time `json:"sent_at,omitzero"`
}
