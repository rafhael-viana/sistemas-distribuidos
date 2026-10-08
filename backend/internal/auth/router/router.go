package router

import (
	"net/http"

	"github.com/rafhael-viana/TCC/internal/auth/handler"
	sharedhandler "github.com/rafhael-viana/TCC/internal/handler"
	"github.com/rafhael-viana/TCC/internal/router"
)

func New(auth *handler.AuthHandler) http.Handler {
	r := router.NewMux()

	r.HandleFunc("/health", sharedhandler.Health).Methods(http.MethodGet)

	api := r.PathPrefix("/api/v1/auth").Subrouter()
	api.HandleFunc("/register", auth.Register).Methods(http.MethodPost)
	api.HandleFunc("/login", auth.Login).Methods(http.MethodPost)

	return router.Wrap(r)
}
