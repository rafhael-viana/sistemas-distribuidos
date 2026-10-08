package handler

import (
	"log"
	"net/http"

	"github.com/rafhael-viana/TCC/internal/audit/repository"
	"github.com/rafhael-viana/TCC/internal/response"
)

type AuditHandler struct {
	entries repository.EntryRepository
}

func NewAuditHandler(entries repository.EntryRepository) *AuditHandler {
	return &AuditHandler{entries: entries}
}

// List retorna a trilha de auditoria. Aceita ?type= para filtrar por tipo de evento.
func (h *AuditHandler) List(w http.ResponseWriter, r *http.Request) {
	entries, err := h.entries.List(r.Context(), repository.Filter{Type: r.URL.Query().Get("type")})
	if err != nil {
		log.Printf("audit error: %v", err)
		response.Error(w, http.StatusInternalServerError, "internal server error")
		return
	}
	response.JSON(w, http.StatusOK, entries)
}
