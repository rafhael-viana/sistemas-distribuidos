package handler

import (
	"fmt"
	"log"
	"net/http"
	"net/http/httputil"
	"net/url"

	"github.com/rafhael-viana/TCC/internal/response"
)

// NewProxy repassa as requisições para outro serviço, mantendo o path original.
func NewProxy(target string) (http.Handler, error) {
	u, err := url.Parse(target)
	if err != nil {
		return nil, fmt.Errorf("parse proxy target %q: %w", target, err)
	}

	p := &httputil.ReverseProxy{
		Rewrite: func(pr *httputil.ProxyRequest) {
			pr.SetURL(u)
			pr.SetXForwarded()
		},
		ErrorHandler: func(w http.ResponseWriter, r *http.Request, err error) {
			log.Printf("proxy %s %s -> %s: %v", r.Method, r.URL.Path, target, err)
			response.Error(w, http.StatusBadGateway, "service unavailable")
		},
	}
	return p, nil
}
