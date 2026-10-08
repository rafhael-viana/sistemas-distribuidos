package router

import (
	"net/http"

	"github.com/gorilla/mux"

	"github.com/rafhael-viana/TCC/internal/handler"
	"github.com/rafhael-viana/TCC/internal/middleware"
	"github.com/rafhael-viana/TCC/internal/response"
)

// NewMux cria um mux com respostas JSON para 404/405. Compartilhado entre os serviços.
func NewMux() *mux.Router {
	r := mux.NewRouter().StrictSlash(true)

	r.NotFoundHandler = http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		response.Error(w, http.StatusNotFound, "resource not found")
	})
	r.MethodNotAllowedHandler = http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		response.Error(w, http.StatusMethodNotAllowed, "method not allowed")
	})

	return r
}

// Wrap aplica os middlewares fora do mux para cobrir também 404/405.
func Wrap(r *mux.Router) http.Handler {
	return middleware.Recover(middleware.Logging(r))
}

// New monta as rotas da API principal. As rotas /api/v1/auth/* são
// repassadas para o serviço de autenticação.
func New(authProxy http.Handler) http.Handler {
	r := NewMux()

	r.HandleFunc("/health", handler.Health).Methods(http.MethodGet)

	api := r.PathPrefix("/api/v1").Subrouter()
	api.HandleFunc("/hello", handler.Hello).Methods(http.MethodGet)
	api.PathPrefix("/auth/").Handler(authProxy)

	return Wrap(r)
}
