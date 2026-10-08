package handler

import (
	"encoding/json"
	"errors"
	"log"
	"net/http"

	"github.com/gorilla/mux"

	"github.com/rafhael-viana/TCC/internal/notification/repository"
	"github.com/rafhael-viana/TCC/internal/notification/service"
	"github.com/rafhael-viana/TCC/internal/response"
)

const maxBodyBytes = 1 << 20 // 1 MB

type EmailHandler struct {
	emails *service.EmailService
}

func NewEmailHandler(emails *service.EmailService) *EmailHandler {
	return &EmailHandler{emails: emails}
}

func (h *EmailHandler) Send(w http.ResponseWriter, r *http.Request) {
	var in service.SendEmailInput
	dec := json.NewDecoder(http.MaxBytesReader(w, r.Body, maxBodyBytes))
	dec.DisallowUnknownFields()
	if err := dec.Decode(&in); err != nil {
		response.Error(w, http.StatusBadRequest, "invalid JSON body")
		return
	}

	e, err := h.emails.Send(r.Context(), in)
	if err != nil {
		writeEmailError(w, err)
		return
	}
	response.JSON(w, http.StatusCreated, e)
}

func (h *EmailHandler) Get(w http.ResponseWriter, r *http.Request) {
	e, err := h.emails.Get(r.Context(), mux.Vars(r)["id"])
	if err != nil {
		writeEmailError(w, err)
		return
	}
	response.JSON(w, http.StatusOK, e)
}

func (h *EmailHandler) List(w http.ResponseWriter, r *http.Request) {
	emails, err := h.emails.List(r.Context())
	if err != nil {
		writeEmailError(w, err)
		return
	}
	response.JSON(w, http.StatusOK, emails)
}

func writeEmailError(w http.ResponseWriter, err error) {
	var vErr *service.ValidationError
	switch {
	case errors.As(err, &vErr):
		response.Error(w, http.StatusBadRequest, vErr.Msg)
	case errors.Is(err, repository.ErrEmailNotFound):
		response.Error(w, http.StatusNotFound, err.Error())
	default:
		log.Printf("notification error: %v", err)
		response.Error(w, http.StatusInternalServerError, "internal server error")
	}
}
