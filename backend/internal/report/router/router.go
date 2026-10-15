package router

import (
	"net/http"

	sharedhandler "github.com/rafhael-viana/TCC/internal/handler"
	"github.com/rafhael-viana/TCC/internal/report/handler"
	"github.com/rafhael-viana/TCC/internal/router"
)

func New(report *handler.ReportHandler) http.Handler {
	r := router.NewMux()

	r.HandleFunc("/health", sharedhandler.Health).Methods(http.MethodGet)

	api := r.PathPrefix("/api/v1/reports").Subrouter()
	api.HandleFunc("", report.Request).Methods(http.MethodPost)
	api.HandleFunc("", report.List).Methods(http.MethodGet)
	api.HandleFunc("/{id}", report.Get).Methods(http.MethodGet)
	api.HandleFunc("/{id}/download", report.Download).Methods(http.MethodGet)

	return router.Wrap(r)
}
