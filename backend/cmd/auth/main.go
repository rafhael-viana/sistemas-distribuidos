package main

import (
	"crypto/rand"
	"log"

	"github.com/rafhael-viana/TCC/internal/auth/handler"
	"github.com/rafhael-viana/TCC/internal/auth/repository"
	"github.com/rafhael-viana/TCC/internal/auth/router"
	"github.com/rafhael-viana/TCC/internal/auth/service"
	"github.com/rafhael-viana/TCC/internal/config"
	"github.com/rafhael-viana/TCC/internal/eventbus"
	"github.com/rafhael-viana/TCC/internal/events"
	"github.com/rafhael-viana/TCC/internal/server"
)

func main() {
	cfg := config.Load("AUTH_PORT", "8081")

	if cfg.JWTSecret == "" {
		cfg.JWTSecret = rand.Text()
		log.Println("WARNING: JWT_SECRET not set, using a random secret (tokens are invalidated on restart)")
	}

	publisher := eventbus.NewKafkaPublisher(cfg.KafkaBrokers, events.TopicAuth)

	users := repository.NewMemoryUserRepository()
	authService := service.NewAuthService(users, publisher, cfg.JWTSecret, cfg.TokenTTL)
	authHandler := handler.NewAuthHandler(authService)

	srv := server.New(cfg, router.New(authHandler))

	err := srv.Run()

	// Envia os eventos que ainda estão no buffer antes de sair.
	if cerr := publisher.Close(); cerr != nil {
		log.Printf("close publisher: %v", cerr)
	}
	if err != nil {
		log.Fatalf("server error: %v", err)
	}
}
