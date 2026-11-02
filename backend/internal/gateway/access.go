package gateway

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"sync"
	"time"

	"github.com/rafhael-viana/TCC/internal/authn"
	"github.com/rafhael-viana/TCC/internal/response"
)

// accessTTL é quanto tempo a resposta do auth fica em cache. Um bloqueio
// (empresa suspensa, usuário inativo) leva no máximo isso para valer.
const accessTTL = 10 * time.Second

type access struct {
	Allowed   bool   `json:"allowed"`
	Reason    string `json:"reason"`
	TenantID  string `json:"tenant_id"`
	RateLimit int    `json:"rate_limit"`
}

type cached struct {
	access  access
	expires time.Time
}

// AccessGuard barra, na borda, requisições de usuários inativos ou de
// empresas suspensas e aplica o limite de requisições por minuto da empresa.
type AccessGuard struct {
	authURL string
	client  *http.Client

	mu      sync.Mutex
	cache   map[string]cached
	windows map[string]*window
}

type window struct {
	start time.Time
	count int
}

func NewAccessGuard(authURL string) *AccessGuard {
	return &AccessGuard{
		authURL: authURL,
		client:  &http.Client{Timeout: 3 * time.Second},
		cache:   make(map[string]cached),
		windows: make(map[string]*window),
	}
}

// Middleware deve vir depois de authn.Authenticate. Sem token, segue: as
// rotas públicas (login, cadastro) e a checagem de cada serviço cuidam do resto.
func (g *AccessGuard) Middleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		c, ok := authn.FromContext(r.Context())
		if !ok {
			next.ServeHTTP(w, r)
			return
		}
		a, err := g.lookup(r.Context(), c.UserID())
		if err != nil {
			response.Error(w, http.StatusServiceUnavailable, "access check unavailable")
			return
		}
		if !a.Allowed {
			response.Error(w, http.StatusForbidden, a.Reason)
			return
		}
		if a.RateLimit > 0 && !g.allow(a.TenantID, a.RateLimit) {
			w.Header().Set("Retry-After", "60")
			response.Error(w, http.StatusTooManyRequests, "rate limit exceeded")
			return
		}
		next.ServeHTTP(w, r)
	})
}

func (g *AccessGuard) lookup(ctx context.Context, userID string) (access, error) {
	g.mu.Lock()
	if c, ok := g.cache[userID]; ok && time.Now().Before(c.expires) {
		g.mu.Unlock()
		return c.access, nil
	}
	g.mu.Unlock()

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, g.authURL+"/internal/access/"+userID, nil)
	if err != nil {
		return access{}, err
	}
	res, err := g.client.Do(req)
	if err != nil {
		return access{}, err
	}
	defer res.Body.Close()
	if res.StatusCode != http.StatusOK {
		return access{}, fmt.Errorf("access check: status %d", res.StatusCode)
	}
	var a access
	if err := json.NewDecoder(res.Body).Decode(&a); err != nil {
		return access{}, err
	}

	g.mu.Lock()
	g.cache[userID] = cached{access: a, expires: time.Now().Add(accessTTL)}
	g.mu.Unlock()
	return a, nil
}

// allow conta a requisição na janela de um minuto da empresa.
func (g *AccessGuard) allow(tenantID string, limit int) bool {
	g.mu.Lock()
	defer g.mu.Unlock()

	now := time.Now()
	w := g.windows[tenantID]
	if w == nil || now.Sub(w.start) >= time.Minute {
		w = &window{start: now}
		g.windows[tenantID] = w
	}
	w.count++
	return w.count <= limit
}
