package main

import (
	"context"
	"crypto/rand"
	"log"
	"os"

	"github.com/rafhael-viana/TCC/internal/applog"
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

const serviceName = "auth"

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
	var (
		users   repository.UserRepository   = repository.NewMemoryUserRepository()
		tenants repository.TenantRepository = repository.NewMemoryTenantRepository()
		teams   repository.TeamRepository   = repository.NewMemoryTeamRepository()
	)
	if db != nil {
		users = repository.NewPostgresUserRepository(db)
		tenants = repository.NewPostgresTenantRepository(db)
		teams = repository.NewPostgresTeamRepository(db)
	}

	authService := service.NewAuthService(users, tenants, teams, publisher, cfg.JWTSecret, cfg.TokenTTL)
	if path := os.Getenv("AUTH_SEED_FILE"); path != "" {
		if err := authService.SeedFromFile(context.Background(), path); err != nil {
			log.Fatal(err)
		}
	}
	authHandler := handler.NewAuthHandler(authService)

	logs := eventbus.NewKafkaPublisher(cfg.KafkaBrokers, events.TopicLogs)
	logger := applog.New(serviceName, logs)

	srv := server.New(cfg, router.New(authHandler, []byte(cfg.JWTSecret), logger))

	err = srv.Run()

	// Envia os eventos que ainda estão no buffer antes de sair.
	for _, p := range []*eventbus.KafkaPublisher{publisher, logs} {
		if cerr := p.Close(); cerr != nil {
			log.Printf("close publisher: %v", cerr)
		}
	}
	if db != nil {
		db.Close()
	}
	if err != nil {
		log.Fatalf("server error: %v", err)
	}
}
