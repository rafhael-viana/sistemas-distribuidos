package main

import (
	"context"
	"crypto/rand"
	"log"
	"os"

	"github.com/rafhael-viana/TCC/internal/auth/handler"
	"github.com/rafhael-viana/TCC/internal/auth/repository"
	"github.com/rafhael-viana/TCC/internal/auth/router"
	"github.com/rafhael-viana/TCC/internal/auth/service"
	"github.com/rafhael-viana/TCC/internal/config"
	"github.com/rafhael-viana/TCC/internal/database"
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

	db, err := database.Connect(context.Background(), cfg.DBDriver, cfg.DatabaseURL, repository.Schema)
	if err != nil {
		log.Fatal(err)
	}
	var users repository.UserRepository = repository.NewMemoryUserRepository()
	if db != nil {
		users = repository.NewPostgresUserRepository(db)
	}

	authService := service.NewAuthService(users, publisher, cfg.JWTSecret, cfg.TokenTTL)
	if path := os.Getenv("AUTH_SEED_FILE"); path != "" {
		if err := authService.SeedFromFile(context.Background(), path); err != nil {
			log.Fatal(err)
		}
	}
	authHandler := handler.NewAuthHandler(authService)

	srv := server.New(cfg, router.New(authHandler))

	err = srv.Run()

	// Envia os eventos que ainda estão no buffer antes de sair.
	if cerr := publisher.Close(); cerr != nil {
		log.Printf("close publisher: %v", cerr)
	}
	if db != nil {
		db.Close()
	}
	if err != nil {
		log.Fatalf("server error: %v", err)
	}
}
