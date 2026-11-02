package handler

import (
	"encoding/json"
	"errors"
	"log"
	"net/http"

	"github.com/gorilla/mux"

	"github.com/rafhael-viana/TCC/internal/auth/model"
	"github.com/rafhael-viana/TCC/internal/auth/repository"
	"github.com/rafhael-viana/TCC/internal/auth/service"
	"github.com/rafhael-viana/TCC/internal/authn"
	"github.com/rafhael-viana/TCC/internal/response"
)

const maxBodyBytes = 1 << 20 // 1 MB

type AuthHandler struct {
	auth *service.AuthService
}

func NewAuthHandler(auth *service.AuthService) *AuthHandler {
	return &AuthHandler{auth: auth}
}

func (h *AuthHandler) Register(w http.ResponseWriter, r *http.Request) {
	var in service.RegisterInput
	if !decodeJSON(w, r, &in) {
		return
	}

	u, err := h.auth.Register(r.Context(), in)
	if err != nil {
		writeAuthError(w, err)
		return
	}
	response.JSON(w, http.StatusCreated, u)
}

func (h *AuthHandler) Login(w http.ResponseWriter, r *http.Request) {
	var in service.LoginInput
	if !decodeJSON(w, r, &in) {
		return
	}

	res, err := h.auth.Login(r.Context(), in)
	if err != nil {
		writeAuthError(w, err)
		return
	}
	response.JSON(w, http.StatusOK, res)
}

func (h *AuthHandler) Me(w http.ResponseWriter, r *http.Request) {
	u, err := h.auth.Me(r.Context(), actor(r).UserID())
	if err != nil {
		writeAuthError(w, err)
		return
	}
	response.JSON(w, http.StatusOK, u)
}

// Access é interno: o gateway consulta para aplicar bloqueios e limites.
func (h *AuthHandler) Access(w http.ResponseWriter, r *http.Request) {
	a, err := h.auth.Access(r.Context(), mux.Vars(r)["id"])
	if err != nil {
		writeAuthError(w, err)
		return
	}
	response.JSON(w, http.StatusOK, a)
}

// ---- empresas ----

func (h *AuthHandler) ListTenants(w http.ResponseWriter, r *http.Request) {
	v, err := h.auth.ListTenants(r.Context(), actor(r))
	reply(w, http.StatusOK, v, err)
}

func (h *AuthHandler) GetTenant(w http.ResponseWriter, r *http.Request) {
	v, err := h.auth.GetTenant(r.Context(), actor(r), mux.Vars(r)["id"])
	reply(w, http.StatusOK, v, err)
}

func (h *AuthHandler) CreateTenant(w http.ResponseWriter, r *http.Request) {
	var in service.TenantInput
	if decodeJSON(w, r, &in) {
		v, err := h.auth.CreateTenant(r.Context(), actor(r), in)
		reply(w, http.StatusCreated, v, err)
	}
}

func (h *AuthHandler) UpdateTenant(w http.ResponseWriter, r *http.Request) {
	var in service.TenantInput
	if decodeJSON(w, r, &in) {
		v, err := h.auth.UpdateTenant(r.Context(), actor(r), mux.Vars(r)["id"], in)
		reply(w, http.StatusOK, v, err)
	}
}

func (h *AuthHandler) DeleteTenant(w http.ResponseWriter, r *http.Request) {
	noContent(w, h.auth.DeleteTenant(r.Context(), actor(r), mux.Vars(r)["id"]))
}

// ---- equipes ----

func (h *AuthHandler) ListTeams(w http.ResponseWriter, r *http.Request) {
	v, err := h.auth.ListTeams(r.Context(), actor(r), r.URL.Query().Get("tenant_id"))
	reply(w, http.StatusOK, v, err)
}

func (h *AuthHandler) CreateTeam(w http.ResponseWriter, r *http.Request) {
	var in service.TeamInput
	if decodeJSON(w, r, &in) {
		v, err := h.auth.CreateTeam(r.Context(), actor(r), in)
		reply(w, http.StatusCreated, v, err)
	}
}

func (h *AuthHandler) UpdateTeam(w http.ResponseWriter, r *http.Request) {
	var in service.TeamInput
	if decodeJSON(w, r, &in) {
		v, err := h.auth.UpdateTeam(r.Context(), actor(r), mux.Vars(r)["id"], in)
		reply(w, http.StatusOK, v, err)
	}
}

func (h *AuthHandler) DeleteTeam(w http.ResponseWriter, r *http.Request) {
	noContent(w, h.auth.DeleteTeam(r.Context(), actor(r), mux.Vars(r)["id"]))
}

// ---- usuários ----

func (h *AuthHandler) ListUsers(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	v, err := h.auth.ListUsers(r.Context(), actor(r), service.ListUsersInput{
		TenantID: q.Get("tenant_id"),
		TeamID:   q.Get("team_id"),
		Role:     model.Role(q.Get("role")),
		Query:    q.Get("q"),
	})
	reply(w, http.StatusOK, v, err)
}

func (h *AuthHandler) CreateUser(w http.ResponseWriter, r *http.Request) {
	var in service.CreateUserInput
	if decodeJSON(w, r, &in) {
		v, err := h.auth.CreateUser(r.Context(), actor(r), in)
		reply(w, http.StatusCreated, v, err)
	}
}

func (h *AuthHandler) UpdateUser(w http.ResponseWriter, r *http.Request) {
	var in service.UpdateUserInput
	if decodeJSON(w, r, &in) {
		v, err := h.auth.UpdateUser(r.Context(), actor(r), mux.Vars(r)["id"], in)
		reply(w, http.StatusOK, v, err)
	}
}

func (h *AuthHandler) DeleteUser(w http.ResponseWriter, r *http.Request) {
	noContent(w, h.auth.DeleteUser(r.Context(), actor(r), mux.Vars(r)["id"]))
}

// actor devolve quem chama. As rotas que usam passam por authn.Require.
func actor(r *http.Request) *authn.Claims {
	c, _ := authn.FromContext(r.Context())
	return c
}

func reply(w http.ResponseWriter, status int, v any, err error) {
	if err != nil {
		writeAuthError(w, err)
		return
	}
	response.JSON(w, status, v)
}

func noContent(w http.ResponseWriter, err error) {
	if err != nil {
		writeAuthError(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func decodeJSON(w http.ResponseWriter, r *http.Request, dst any) bool {
	dec := json.NewDecoder(http.MaxBytesReader(w, r.Body, maxBodyBytes))
	dec.DisallowUnknownFields()
	if err := dec.Decode(dst); err != nil {
		response.Error(w, http.StatusBadRequest, "invalid JSON body")
		return false
	}
	return true
}

func writeAuthError(w http.ResponseWriter, err error) {
	var vErr *service.ValidationError
	switch {
	case errors.As(err, &vErr):
		response.Error(w, http.StatusBadRequest, vErr.Msg)
	case errors.Is(err, repository.ErrEmailTaken), errors.Is(err, repository.ErrUsernameTaken),
		errors.Is(err, repository.ErrTenantIDTaken), errors.Is(err, repository.ErrInviteCodeTaken),
		errors.Is(err, repository.ErrTeamNameTaken), errors.Is(err, service.ErrTenantFull),
		errors.Is(err, service.ErrTenantNotEmpty):
		response.Error(w, http.StatusConflict, err.Error())
	case errors.Is(err, service.ErrInvalidCredentials):
		response.Error(w, http.StatusUnauthorized, err.Error())
	case errors.Is(err, service.ErrUserInactive), errors.Is(err, service.ErrTenantSuspended),
		errors.Is(err, service.ErrForbidden):
		response.Error(w, http.StatusForbidden, err.Error())
	case errors.Is(err, repository.ErrUserNotFound), errors.Is(err, repository.ErrTenantNotFound),
		errors.Is(err, repository.ErrTeamNotFound):
		response.Error(w, http.StatusNotFound, err.Error())
	default:
		log.Printf("auth error: %v", err)
		response.Error(w, http.StatusInternalServerError, "internal server error")
	}
}
