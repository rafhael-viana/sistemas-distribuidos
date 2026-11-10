package router

import (
	"net/http"

	"github.com/rafhael-viana/TCC/internal/applog"
	"github.com/rafhael-viana/TCC/internal/authn"
	sharedhandler "github.com/rafhael-viana/TCC/internal/handler"
	"github.com/rafhael-viana/TCC/internal/notification/handler"
	"github.com/rafhael-viana/TCC/internal/router"
)

func New(email *handler.EmailHandler, secret []byte, logger *applog.Logger) http.Handler {
	r := router.NewMux()
	r.Use(authn.Authenticate(secret))

	r.HandleFunc("/health", sharedhandler.Health).Methods(http.MethodGet)

	// Os e-mails guardam destinatários de todas as empresas e o envio manual
	// serve só para suporte: apenas a equipe da plataforma (admin) acessa.
	api := r.PathPrefix("/api/v1/notifications/email").Subrouter()
	api.Use(authn.Require(authn.RoleAdmin))
	api.HandleFunc("", email.Send).Methods(http.MethodPost)
	api.HandleFunc("", email.List).Methods(http.MethodGet)
	api.HandleFunc("/{id}", email.Get).Methods(http.MethodGet)

	return router.Wrap(r, logger)
}
