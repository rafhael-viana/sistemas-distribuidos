package handler

import (
	"log"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/gorilla/mux"

	"github.com/rafhael-viana/TCC/internal/audit/repository"
	"github.com/rafhael-viana/TCC/internal/authn"
	"github.com/rafhael-viana/TCC/internal/response"
)

type AuditHandler struct {
	entries repository.EntryRepository
	logs    repository.LogRepository
}

func NewAuditHandler(entries repository.EntryRepository, logs repository.LogRepository) *AuditHandler {
	return &AuditHandler{entries: entries, logs: logs}
}

// List retorna a trilha de auditoria. Gestão vê só a própria empresa; admin
// vê todas ou filtra por ?tenant_id=. Aceita ?type= para filtrar por tipo.
func (h *AuditHandler) List(w http.ResponseWriter, r *http.Request) {
	c, _ := authn.FromContext(r.Context())
	q := r.URL.Query()
	entries, err := h.entries.List(r.Context(), repository.Filter{
		Type:     q.Get("type"),
		TenantID: authn.TenantScope(c, q.Get("tenant_id")),
	})
	if err != nil {
		internalError(w, err)
		return
	}
	response.JSON(w, http.StatusOK, entries)
}

const (
	defaultLogLimit = 25
	maxLogLimit     = 200
)

// Logs busca os logs técnicos. Filtros: level (lista separada por vírgula),
// service, q, since (RFC3339 ou duração como 24h), limit e offset.
func (h *AuditHandler) Logs(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	f := repository.LogFilter{
		Service: q.Get("service"),
		Query:   strings.TrimSpace(q.Get("q")),
		Limit:   defaultLogLimit,
	}
	if lv := q.Get("level"); lv != "" {
		f.Levels = strings.Split(lv, ",")
	}
	if s := q.Get("since"); s != "" {
		if d, err := time.ParseDuration(s); err == nil {
			f.Since = time.Now().Add(-d)
		} else if t, err := time.Parse(time.RFC3339, s); err == nil {
			f.Since = t
		} else {
			response.Error(w, http.StatusBadRequest, "since must be a duration (24h) or RFC3339 time")
			return
		}
	}
	if n, err := strconv.Atoi(q.Get("limit")); err == nil && n > 0 {
		f.Limit = min(n, maxLogLimit)
	}
	if n, err := strconv.Atoi(q.Get("offset")); err == nil && n > 0 {
		f.Offset = n
	}

	page, err := h.logs.List(r.Context(), f)
	if err != nil {
		internalError(w, err)
		return
	}
	response.JSON(w, http.StatusOK, page)
}

// Trace retorna todos os logs de uma requisição, de todos os serviços.
func (h *AuditHandler) Trace(w http.ResponseWriter, r *http.Request) {
	logs, err := h.logs.Trace(r.Context(), mux.Vars(r)["id"])
	if err != nil {
		internalError(w, err)
		return
	}
	response.JSON(w, http.StatusOK, logs)
}

func internalError(w http.ResponseWriter, err error) {
	log.Printf("audit error: %v", err)
	response.Error(w, http.StatusInternalServerError, "internal server error")
}
