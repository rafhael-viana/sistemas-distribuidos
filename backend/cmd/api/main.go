package main

import (
	"log"

	"github.com/rafhael-viana/TCC/internal/config"
	"github.com/rafhael-viana/TCC/internal/handler"
	"github.com/rafhael-viana/TCC/internal/router"
	"github.com/rafhael-viana/TCC/internal/server"
)

func main() {
	cfg := config.Load("API_PORT", "8080")

	authProxy, err := handler.NewProxy(cfg.AuthServiceURL)
	if err != nil {
		log.Fatal(err)
	}

	srv := server.New(cfg, router.New(authProxy))

	if err := srv.Run(); err != nil {
		log.Fatalf("server error: %v", err)
	}
}
