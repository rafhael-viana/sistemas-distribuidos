// Package requestid propaga o ID de correlação de uma requisição entre os
// serviços: no header HTTP X-Request-ID e no envelope dos eventos do Kafka.
package requestid

import (
	"context"
	"crypto/rand"
	"strings"
)

const Header = "X-Request-ID"

type ctxKey struct{}

// New gera um ID curto no formato req_xxxxxxxxxxxx.
func New() string {
	return "req_" + strings.ToLower(rand.Text()[:12])
}

func With(ctx context.Context, id string) context.Context {
	return context.WithValue(ctx, ctxKey{}, id)
}

// From devolve o ID da requisição, ou "" fora de uma requisição.
func From(ctx context.Context) string {
	id, _ := ctx.Value(ctxKey{}).(string)
	return id
}
