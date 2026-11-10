package router

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/golang-jwt/jwt/v5"

	"github.com/rafhael-viana/TCC/internal/applog"
	"github.com/rafhael-viana/TCC/internal/authn"
	"github.com/rafhael-viana/TCC/internal/notification/handler"
	"github.com/rafhael-viana/TCC/internal/notification/repository"
	"github.com/rafhael-viana/TCC/internal/notification/sender"
	"github.com/rafhael-viana/TCC/internal/notification/service"
)

func TestEmailRoutesRequireAdmin(t *testing.T) {
	secret := []byte("s3cret")
	svc := service.NewEmailService(repository.NewMemoryEmailRepository(), sender.NewMockSender())
	h := New(handler.NewEmailHandler(svc), secret, applog.New("test", nil))

	token := func(role string) string {
		tok, err := authn.Sign(secret, authn.Claims{Role: role, TenantID: "t1", RegisteredClaims: jwt.RegisteredClaims{
			Subject: "u1", ExpiresAt: jwt.NewNumericDate(time.Now().Add(time.Hour)),
		}})
		if err != nil {
			t.Fatal(err)
		}
		return tok
	}

	cases := []struct {
		name, method, role string
		want               int
	}{
		{"listar sem login", http.MethodGet, "", http.StatusUnauthorized},
		{"enviar sem login", http.MethodPost, "", http.StatusUnauthorized},
		{"listar como profissional", http.MethodGet, authn.RoleProfissional, http.StatusForbidden},
		{"listar como gestão", http.MethodGet, authn.RoleGestao, http.StatusForbidden},
		{"enviar como profissional", http.MethodPost, authn.RoleProfissional, http.StatusForbidden},
		{"listar como admin", http.MethodGet, authn.RoleAdmin, http.StatusOK},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			body := `{"to":"a@example.com","subject":"x","body":"y"}`
			req := httptest.NewRequest(c.method, "/api/v1/notifications/email", strings.NewReader(body))
			req.Header.Set("Content-Type", "application/json")
			if c.role != "" {
				req.Header.Set("Authorization", "Bearer "+token(c.role))
			}
			rec := httptest.NewRecorder()
			h.ServeHTTP(rec, req)
			if rec.Code != c.want {
				t.Fatalf("status %d, esperado %d: %s", rec.Code, c.want, rec.Body.String())
			}
		})
	}
}
