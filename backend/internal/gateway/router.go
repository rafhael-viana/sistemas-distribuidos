// Package gateway é a API principal: o único ponto de entrada do frontend.
// Valida o token, aplica bloqueios e limites e repassa para os serviços.
package gateway

import (
	"net/http"

	"github.com/rafhael-viana/TCC/internal/applog"
	"github.com/rafhael-viana/TCC/internal/authn"
	"github.com/rafhael-viana/TCC/internal/handler"
	"github.com/rafhael-viana/TCC/internal/router"
)

// Upstreams são os proxies para cada serviço.
type Upstreams struct {
	Auth, Notification, Audit, Report http.Handler
}

func New(up Upstreams, secret []byte, guard *AccessGuard, status *Status, logger *applog.Logger) http.Handler {
	r := router.NewMux()
	r.HandleFunc("/health", handler.Health).Methods(http.MethodGet)

	api := r.PathPrefix("/api/v1").Subrouter()
	api.Use(authn.Authenticate(secret), guard.Middleware)

	api.HandleFunc("/hello", handler.Hello).Methods(http.MethodGet)
	api.Handle("/system/status", authn.Require(authn.RoleAdmin)(http.HandlerFunc(status.Handle))).Methods(http.MethodGet)

	for _, prefix := range []string{"/auth/", "/tenants", "/teams", "/users"} {
		api.PathPrefix(prefix).Handler(up.Auth)
	}
	api.PathPrefix("/notifications").Handler(up.Notification)
	api.PathPrefix("/audit").Handler(up.Audit)
	api.PathPrefix("/reports").Handler(up.Report)

	return router.Wrap(r, logger)
}
