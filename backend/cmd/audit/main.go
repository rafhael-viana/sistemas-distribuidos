package main

import (
	"context"
	"log"

	"github.com/rafhael-viana/TCC/internal/audit/consumer"
	"github.com/rafhael-viana/TCC/internal/audit/handler"
	"github.com/rafhael-viana/TCC/internal/audit/repository"
	"github.com/rafhael-viana/TCC/internal/audit/router"
	"github.com/rafhael-viana/TCC/internal/config"
	"github.com/rafhael-viana/TCC/internal/database"
	"github.com/rafhael-viana/TCC/internal/eventbus"
	"github.com/rafhael-viana/TCC/internal/events"
	"github.com/rafhael-viana/TCC/internal/server"
)

const consumerGroup = "audit"

func main() {
	cfg := config.Load("AUDIT_PORT", "8083")

	db, err := database.Connect(context.Background(), cfg.DBDriver, cfg.DatabaseURL, repository.Schema)
	if err != nil {
		log.Fatal(err)
	}
	var entries repository.EntryRepository = repository.NewMemoryEntryRepository()
	if db != nil {
		entries = repository.NewPostgresEntryRepository(db)
	}
	auditHandler := handler.NewAuditHandler(entries)

	ctx, cancel := context.WithCancel(context.Background())
	consumed := make(chan struct{})
	go func() {
		defer close(consumed)
		err := eventbus.Consume(ctx, eventbus.ConsumerConfig{
			Brokers: cfg.KafkaBrokers,
			Topic:   events.TopicAuth,
			GroupID: consumerGroup,
		}, consumer.NewRecorder(entries).Handle)
		if err != nil {
			log.Printf("auth events consumer stopped: %v", err)
		}
	}()

	srv := server.New(cfg, router.New(auditHandler))
	err = srv.Run()

	cancel()
	<-consumed
	if db != nil {
		db.Close()
	}
	if err != nil {
		log.Fatalf("server error: %v", err)
	}
}
