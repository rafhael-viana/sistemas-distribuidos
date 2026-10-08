package server

import (
	"context"
	"errors"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/rafhael-viana/TCC/internal/config"
)

type Server struct {
	http            *http.Server
	shutdownTimeout time.Duration
}

func New(cfg config.Config, handler http.Handler) *Server {
	return &Server{
		http: &http.Server{
			Addr:         ":" + cfg.Port,
			Handler:      handler,
			ReadTimeout:  cfg.ReadTimeout,
			WriteTimeout: cfg.WriteTimeout,
			IdleTimeout:  cfg.IdleTimeout,
		},
		shutdownTimeout: cfg.ShutdownTimeout,
	}
}

// Run inicia o servidor e bloqueia até receber SIGINT/SIGTERM,
// então faz o graceful shutdown.
func (s *Server) Run() error {
	errCh := make(chan error, 1)

	go func() {
		log.Printf("server listening on %s", s.http.Addr)
		if err := s.http.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			errCh <- err
		}
	}()

	stop := make(chan os.Signal, 1)
	signal.Notify(stop, os.Interrupt, syscall.SIGTERM)

	select {
	case err := <-errCh:
		return err
	case <-stop:
	}

	log.Println("shutting down server...")
	ctx, cancel := context.WithTimeout(context.Background(), s.shutdownTimeout)
	defer cancel()

	return s.http.Shutdown(ctx)
}
