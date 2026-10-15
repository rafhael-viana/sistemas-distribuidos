package handler

import (
	"encoding/json"
	"errors"
	"io"
	"log"
	"net/http"
	"strconv"

	"github.com/gorilla/mux"

	"github.com/rafhael-viana/TCC/internal/report/repository"
	"github.com/rafhael-viana/TCC/internal/report/service"
	"github.com/rafhael-viana/TCC/internal/response"
)

const maxBodyBytes = 1 << 20 // 1 MB

type ReportHandler struct {
	reports *service.ReportService
}

func NewReportHandler(reports *service.ReportService) *ReportHandler {
	return &ReportHandler{reports: reports}
}

// Request aceita o pedido e responde 202: o relatório é gerado de forma
// assíncrona e o cliente acompanha o status em GET /reports/{id}.
func (h *ReportHandler) Request(w http.ResponseWriter, r *http.Request) {
	var in service.RequestInput
	dec := json.NewDecoder(http.MaxBytesReader(w, r.Body, maxBodyBytes))
	dec.DisallowUnknownFields()
	if err := dec.Decode(&in); err != nil {
		response.Error(w, http.StatusBadRequest, "invalid JSON body")
		return
	}

	rep, err := h.reports.Request(r.Context(), in)
	if err != nil {
		writeReportError(w, err)
		return
	}
	w.Header().Set("Location", "/api/v1/reports/"+rep.ID)
	response.JSON(w, http.StatusAccepted, rep)
}

func (h *ReportHandler) Get(w http.ResponseWriter, r *http.Request) {
	rep, err := h.reports.Get(r.Context(), mux.Vars(r)["id"])
	if err != nil {
		writeReportError(w, err)
		return
	}
	response.JSON(w, http.StatusOK, rep)
}

func (h *ReportHandler) List(w http.ResponseWriter, r *http.Request) {
	reports, err := h.reports.List(r.Context())
	if err != nil {
		writeReportError(w, err)
		return
	}
	response.JSON(w, http.StatusOK, reports)
}

func (h *ReportHandler) Download(w http.ResponseWriter, r *http.Request) {
	rep, f, err := h.reports.Open(r.Context(), mux.Vars(r)["id"])
	if err != nil {
		writeReportError(w, err)
		return
	}
	defer f.Close()

	w.Header().Set("Content-Type", rep.Format.ContentType())
	w.Header().Set("Content-Disposition", `attachment; filename="`+rep.Filename()+`"`)
	w.Header().Set("Content-Length", strconv.Itoa(rep.Size))
	if _, err := io.Copy(w, f); err != nil {
		log.Printf("download report %s: %v", rep.ID, err)
	}
}

func writeReportError(w http.ResponseWriter, err error) {
	var vErr *service.ValidationError
	switch {
	case errors.As(err, &vErr):
		response.Error(w, http.StatusBadRequest, vErr.Msg)
	case errors.Is(err, repository.ErrReportNotFound):
		response.Error(w, http.StatusNotFound, err.Error())
	case errors.Is(err, service.ErrReportNotReady):
		response.Error(w, http.StatusConflict, err.Error())
	default:
		log.Printf("report error: %v", err)
		response.Error(w, http.StatusInternalServerError, "internal server error")
	}
}
