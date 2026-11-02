package router

import (
	"net/http"

	"github.com/rafhael-viana/TCC/internal/applog"
	"github.com/rafhael-viana/TCC/internal/auth/handler"
	"github.com/rafhael-viana/TCC/internal/authn"
	sharedhandler "github.com/rafhael-viana/TCC/internal/handler"
	"github.com/rafhael-viana/TCC/internal/router"
)

func New(auth *handler.AuthHandler, secret []byte, logger *applog.Logger) http.Handler {
	r := router.NewMux()
	r.Use(authn.Authenticate(secret))

	r.HandleFunc("/health", sharedhandler.Health).Methods(http.MethodGet)
	// Interno: não é exposto pelo gateway.
	r.HandleFunc("/internal/access/{id}", auth.Access).Methods(http.MethodGet)

	api := r.PathPrefix("/api/v1/auth").Subrouter()
	api.HandleFunc("/register", auth.Register).Methods(http.MethodPost)
	api.HandleFunc("/login", auth.Login).Methods(http.MethodPost)
	api.Handle("/me", authn.Require()(http.HandlerFunc(auth.Me))).Methods(http.MethodGet)

	manage := authn.Require(authn.RoleGestao, authn.RoleAdmin)

	tenants := r.PathPrefix("/api/v1/tenants").Subrouter()
	tenants.Use(manage)
	tenants.HandleFunc("", auth.ListTenants).Methods(http.MethodGet)
	tenants.HandleFunc("", auth.CreateTenant).Methods(http.MethodPost)
	tenants.HandleFunc("/{id}", auth.GetTenant).Methods(http.MethodGet)
	tenants.HandleFunc("/{id}", auth.UpdateTenant).Methods(http.MethodPatch)
	tenants.HandleFunc("/{id}", auth.DeleteTenant).Methods(http.MethodDelete)

	teams := r.PathPrefix("/api/v1/teams").Subrouter()
	teams.Use(manage)
	teams.HandleFunc("", auth.ListTeams).Methods(http.MethodGet)
	teams.HandleFunc("", auth.CreateTeam).Methods(http.MethodPost)
	teams.HandleFunc("/{id}", auth.UpdateTeam).Methods(http.MethodPatch)
	teams.HandleFunc("/{id}", auth.DeleteTeam).Methods(http.MethodDelete)

	users := r.PathPrefix("/api/v1/users").Subrouter()
	users.Use(manage)
	users.HandleFunc("", auth.ListUsers).Methods(http.MethodGet)
	users.HandleFunc("", auth.CreateUser).Methods(http.MethodPost)
	users.HandleFunc("/{id}", auth.UpdateUser).Methods(http.MethodPatch)
	users.HandleFunc("/{id}", auth.DeleteUser).Methods(http.MethodDelete)

	return router.Wrap(r, logger)
}
