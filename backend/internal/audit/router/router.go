package router

import (
	"net/http"

	"github.com/rafhael-viana/TCC/internal/audit/handler"
	sharedhandler "github.com/rafhael-viana/TCC/internal/handler"
	"github.com/rafhael-viana/TCC/internal/router"
)

func New(audit *handler.AuditHandler) http.Handler {
	r := router.NewMux()

	r.HandleFunc("/health", sharedhandler.Health).Methods(http.MethodGet)

	api := r.PathPrefix("/api/v1/audit").Subrouter()
	api.HandleFunc("/events", audit.List).Methods(http.MethodGet)

	return router.Wrap(r)
}
