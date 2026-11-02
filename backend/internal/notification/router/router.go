package router

import (
	"net/http"

	"github.com/rafhael-viana/TCC/internal/applog"
	sharedhandler "github.com/rafhael-viana/TCC/internal/handler"
	"github.com/rafhael-viana/TCC/internal/notification/handler"
	"github.com/rafhael-viana/TCC/internal/router"
)

func New(email *handler.EmailHandler, logger *applog.Logger) http.Handler {
	r := router.NewMux()

	r.HandleFunc("/health", sharedhandler.Health).Methods(http.MethodGet)

	api := r.PathPrefix("/api/v1/notifications/email").Subrouter()
	api.HandleFunc("", email.Send).Methods(http.MethodPost)
	api.HandleFunc("", email.List).Methods(http.MethodGet)
	api.HandleFunc("/{id}", email.Get).Methods(http.MethodGet)

	return router.Wrap(r, logger)
}
