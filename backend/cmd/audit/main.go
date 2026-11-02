package main

import (
	"context"
	"log"
	"sync"

	"github.com/rafhael-viana/TCC/internal/applog"
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

const serviceName = "audit"

// Um consumer group por tópico: um rebalance em um não pausa os outros.
const (
	authGroup   = "audit"
	reportGroup = "audit-reports"
	logsGroup   = "audit-logs"
)

func main() {
	cfg := config.Load("AUDIT_PORT", "8083")

	db, err := database.Connect(context.Background(), cfg.DBDriver, cfg.DatabaseURL, repository.Schema)
	if err != nil {
		log.Fatal(err)
	}
	var (
		entries repository.EntryRepository = repository.NewMemoryEntryRepository()
		logs    repository.LogRepository   = repository.NewMemoryLogRepository()
	)
	if db != nil {
		entries = repository.NewPostgresEntryRepository(db)
		logs = repository.NewPostgresLogRepository(db)
	}
	auditHandler := handler.NewAuditHandler(entries, logs)

	logPublisher := eventbus.NewKafkaPublisher(cfg.KafkaBrokers, events.TopicLogs)
	logger := applog.New(serviceName, logPublisher)

	ctx, cancel := context.WithCancel(context.Background())
	var consumers sync.WaitGroup
	consume := func(topic, group string, h eventbus.Handler) {
		consumers.Go(func() {
			err := eventbus.Consume(ctx, eventbus.ConsumerConfig{Brokers: cfg.KafkaBrokers, Topic: topic, GroupID: group}, h)
			if err != nil {
				log.Printf("%s consumer stopped: %v", topic, err)
			}
		})
	}
	recorder := consumer.NewRecorder(entries)
	consume(events.TopicAuth, authGroup, logger.WrapHandler(recorder.Handle))
	consume(events.TopicReport, reportGroup, logger.WrapHandler(recorder.Handle))
	// Os logs não passam pelo WrapHandler: gravar um log geraria outro log.
	consume(events.TopicLogs, logsGroup, consumer.NewLogRecorder(logs).Handle)

	srv := server.New(cfg, router.New(auditHandler, []byte(cfg.JWTSecret), logger))
	err = srv.Run()

	cancel()
	consumers.Wait()
	if cerr := logPublisher.Close(); cerr != nil {
		log.Printf("close publisher: %v", cerr)
	}
	if db != nil {
		db.Close()
	}
	if err != nil {
		log.Fatalf("server error: %v", err)
	}
}
