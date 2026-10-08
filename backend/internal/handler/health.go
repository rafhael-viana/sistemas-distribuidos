package handler

import (
	"net/http"

	"github.com/rafhael-viana/TCC/internal/response"
)

func Health(w http.ResponseWriter, _ *http.Request) {
	response.JSON(w, http.StatusOK, map[string]string{"status": "ok"})
}
