package router

import (
	"net/http"

	"github.com/rafhael-viana/TCC/internal/applog"
	"github.com/rafhael-viana/TCC/internal/authn"
	sharedhandler "github.com/rafhael-viana/TCC/internal/handler"
	"github.com/rafhael-viana/TCC/internal/report/handler"
	"github.com/rafhael-viana/TCC/internal/router"
)

func New(report *handler.ReportHandler, secret []byte, logger *applog.Logger) http.Handler {
	r := router.NewMux()
	r.Use(authn.Authenticate(secret))

	r.HandleFunc("/health", sharedhandler.Health).Methods(http.MethodGet)

	// Relatórios são da gestão (da própria empresa) e do admin.
	api := r.PathPrefix("/api/v1/reports").Subrouter()
	api.Use(authn.Require(authn.RoleGestao, authn.RoleAdmin))
	api.HandleFunc("", report.Request).Methods(http.MethodPost)
	api.HandleFunc("", report.List).Methods(http.MethodGet)
	api.HandleFunc("/{id}", report.Get).Methods(http.MethodGet)
	api.HandleFunc("/{id}/download", report.Download).Methods(http.MethodGet)

	return router.Wrap(r, logger)
}
