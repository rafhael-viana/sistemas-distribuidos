package handler

import (
	"encoding/json"
	"errors"
	"log"
	"net/http"

	"github.com/rafhael-viana/TCC/internal/auth/repository"
	"github.com/rafhael-viana/TCC/internal/auth/service"
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
	case errors.Is(err, repository.ErrEmailTaken), errors.Is(err, repository.ErrUsernameTaken):
		response.Error(w, http.StatusConflict, err.Error())
	case errors.Is(err, service.ErrInvalidCredentials):
		response.Error(w, http.StatusUnauthorized, err.Error())
	default:
		log.Printf("auth error: %v", err)
		response.Error(w, http.StatusInternalServerError, "internal server error")
	}
}
