package authn

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

func TestParseRejectsEmptySecret(t *testing.T) {
	tok, err := Sign([]byte(""), Claims{Role: RoleAdmin, RegisteredClaims: jwt.RegisteredClaims{
		Subject: "u1", ExpiresAt: jwt.NewNumericDate(time.Now().Add(time.Hour)),
	}})
	if err != nil {
		t.Fatal(err)
	}
	if _, err := Parse(nil, tok); err == nil {
		t.Fatal("token assinado com chave vazia foi aceito")
	}
}

func TestRequireInternal(t *testing.T) {
	secret := []byte("s3cret")
	ok := http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) { w.WriteHeader(http.StatusOK) })

	cases := []struct {
		name   string
		secret []byte
		header string
		want   int
	}{
		{"sem token", secret, "", http.StatusUnauthorized},
		{"token errado", secret, InternalToken([]byte("outro")), http.StatusUnauthorized},
		{"token certo", secret, InternalToken(secret), http.StatusOK},
		{"serviço sem segredo", nil, "", http.StatusUnauthorized},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodGet, "/internal/access/u1", nil)
			if c.header != "" {
				req.Header.Set(InternalHeader, c.header)
			}
			rec := httptest.NewRecorder()
			RequireInternal(c.secret)(ok).ServeHTTP(rec, req)
			if rec.Code != c.want {
				t.Fatalf("status %d, esperado %d", rec.Code, c.want)
			}
		})
	}
}
