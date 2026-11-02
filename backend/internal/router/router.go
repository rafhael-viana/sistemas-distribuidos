package router

import (
	"net/http"

	"github.com/gorilla/mux"

	"github.com/rafhael-viana/TCC/internal/applog"
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

// Wrap aplica os middlewares fora do mux para cobrir também 404/405: o
// logger atribui o X-Request-ID, recupera panics e publica o log técnico.
func Wrap(r *mux.Router, logger *applog.Logger) http.Handler {
	return logger.Middleware(r)
}
