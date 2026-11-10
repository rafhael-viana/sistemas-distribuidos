// Package authn valida os tokens JWT emitidos pelo serviço de autenticação.
// Os demais serviços usam o mesmo JWT_SECRET para conferir quem chama.
package authn

import (
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"net/http"
	"slices"
	"strings"

	"github.com/golang-jwt/jwt/v5"

	"github.com/rafhael-viana/TCC/internal/response"
)

// Perfis de acesso.
const (
	RoleProfissional = "profissional"
	RoleGestao       = "gestao"
	RoleAdmin        = "admin"
)

// Claims são as informações gravadas no token.
type Claims struct {
	Role     string `json:"role"`
	TenantID string `json:"tenant_id,omitempty"`
	jwt.RegisteredClaims
}

func (c *Claims) UserID() string { return c.Subject }

func Sign(secret []byte, c Claims) (string, error) {
	return jwt.NewWithClaims(jwt.SigningMethodHS256, c).SignedString(secret)
}

var ErrInvalidToken = errors.New("invalid token")

func Parse(secret []byte, token string) (*Claims, error) {
	// Sem segredo configurado, qualquer um assinaria um token com a chave
	// vazia: nenhum token é aceito.
	if len(secret) == 0 {
		return nil, ErrInvalidToken
	}
	var c Claims
	_, err := jwt.ParseWithClaims(token, &c, func(*jwt.Token) (any, error) { return secret, nil },
		jwt.WithValidMethods([]string{jwt.SigningMethodHS256.Alg()}))
	if err != nil {
		return nil, ErrInvalidToken
	}
	return &c, nil
}

// ParseUnverified lê as claims sem conferir a assinatura. Só serve para
// enriquecer logs; nunca para decidir acesso.
func ParseUnverified(token string) *Claims {
	var c Claims
	if _, _, err := jwt.NewParser().ParseUnverified(token, &c); err != nil {
		return nil
	}
	return &c
}

// BearerToken extrai o token do header Authorization.
func BearerToken(r *http.Request) string {
	h := r.Header.Get("Authorization")
	if t, ok := strings.CutPrefix(h, "Bearer "); ok {
		return strings.TrimSpace(t)
	}
	return ""
}

type ctxKey struct{}

func WithClaims(ctx context.Context, c *Claims) context.Context {
	return context.WithValue(ctx, ctxKey{}, c)
}

func FromContext(ctx context.Context) (*Claims, bool) {
	c, ok := ctx.Value(ctxKey{}).(*Claims)
	return c, ok
}

// Authenticate valida o token quando ele existe e guarda as claims no
// contexto. Token inválido ou expirado responde 401; sem token, segue.
func Authenticate(secret []byte) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			token := BearerToken(r)
			if token == "" {
				next.ServeHTTP(w, r)
				return
			}
			c, err := Parse(secret, token)
			if err != nil {
				response.Error(w, http.StatusUnauthorized, "invalid or expired token")
				return
			}
			next.ServeHTTP(w, r.WithContext(WithClaims(r.Context(), c)))
		})
	}
}

// Require exige um token válido com um dos perfis informados. Deve vir depois
// de Authenticate.
func Require(roles ...string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			c, ok := FromContext(r.Context())
			if !ok {
				response.Error(w, http.StatusUnauthorized, "authentication required")
				return
			}
			if len(roles) > 0 && !slices.Contains(roles, c.Role) {
				response.Error(w, http.StatusForbidden, "forbidden")
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}

// InternalHeader leva o token das chamadas entre serviços (ex.: gateway →
// auth na consulta de acesso). Essas rotas não passam pelo gateway, mas a
// porta do serviço pode estar exposta; sem o token, respondem 401.
const InternalHeader = "X-Internal-Token"

// InternalToken deriva do JWT_SECRET o token das chamadas internas, para não
// exigir mais uma variável de ambiente. Quem não conhece o segredo não o calcula.
func InternalToken(secret []byte) string {
	if len(secret) == 0 {
		return ""
	}
	m := hmac.New(sha256.New, secret)
	m.Write([]byte("mindsync/internal-access/v1"))
	return hex.EncodeToString(m.Sum(nil))
}

// RequireInternal só deixa passar requisições com o token interno correto.
func RequireInternal(secret []byte) func(http.Handler) http.Handler {
	want := InternalToken(secret)
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			got := r.Header.Get(InternalHeader)
			if want == "" || !hmac.Equal([]byte(got), []byte(want)) {
				response.Error(w, http.StatusUnauthorized, "internal token required")
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}

// TenantScope decide de qual empresa são os dados de uma requisição: gestão
// fica presa à própria empresa; admin escolhe pela query/corpo (requested,
// pode ser vazio = todas).
func TenantScope(c *Claims, requested string) string {
	if c.Role == RoleAdmin {
		return requested
	}
	return c.TenantID
}
