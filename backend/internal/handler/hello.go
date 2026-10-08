package handler

import (
	"net/http"

	"github.com/rafhael-viana/TCC/internal/response"
)

func Hello(w http.ResponseWriter, _ *http.Request) {
	response.JSON(w, http.StatusOK, map[string]string{"message": "Hello World"})
}
