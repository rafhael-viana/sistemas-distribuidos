package router

import (
	"net/http"

	"github.com/rafhael-viana/TCC/internal/applog"
	"github.com/rafhael-viana/TCC/internal/audit/handler"
	"github.com/rafhael-viana/TCC/internal/authn"
	sharedhandler "github.com/rafhael-viana/TCC/internal/handler"
	"github.com/rafhael-viana/TCC/internal/router"
)

func New(audit *handler.AuditHandler, secret []byte, logger *applog.Logger) http.Handler {
	r := router.NewMux()
	r.Use(authn.Authenticate(secret))

	r.HandleFunc("/health", sharedhandler.Health).Methods(http.MethodGet)

	api := r.PathPrefix("/api/v1/audit").Subrouter()
	api.Handle("/events", authn.Require(authn.RoleGestao, authn.RoleAdmin)(http.HandlerFunc(audit.List))).
		Methods(http.MethodGet)

	// Logs técnicos: só a equipe da plataforma (admin).
	logs := api.PathPrefix("/logs").Subrouter()
	logs.Use(authn.Require(authn.RoleAdmin))
	logs.HandleFunc("", audit.Logs).Methods(http.MethodGet)
	logs.HandleFunc("/trace/{id}", audit.Trace).Methods(http.MethodGet)

	return router.Wrap(r, logger)
}
