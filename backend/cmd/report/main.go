package main

import (
	"context"
	"log"
	"sync"

	"github.com/rafhael-viana/TCC/internal/config"
	"github.com/rafhael-viana/TCC/internal/eventbus"
	"github.com/rafhael-viana/TCC/internal/events"
	"github.com/rafhael-viana/TCC/internal/report/consumer"
	"github.com/rafhael-viana/TCC/internal/report/generator"
	"github.com/rafhael-viana/TCC/internal/report/handler"
	"github.com/rafhael-viana/TCC/internal/report/repository"
	"github.com/rafhael-viana/TCC/internal/report/router"
	"github.com/rafhael-viana/TCC/internal/report/service"
	"github.com/rafhael-viana/TCC/internal/report/storage"
	"github.com/rafhael-viana/TCC/internal/server"
)

// Um consumer group por tópico: um rebalance em um não pausa o outro.
const (
	activityGroup  = "report-activity"
	generatorGroup = "report-generator"
)

func main() {
	cfg := config.Load("REPORT_PORT", "8084")

	// Arquivos gerados ficam num diretório local por enquanto; ObjectStore
	// permite trocar por S3/MinIO depois.
	objects, err := storage.NewLocalStore(cfg.ReportsDir)
	if err != nil {
		log.Fatal(err)
	}

	publisher := eventbus.NewKafkaPublisher(cfg.KafkaBrokers, events.TopicReport)

	activity := repository.NewMemoryActivityRepository()
	reports := repository.NewMemoryReportRepository()
	reportService := service.NewReportService(reports, objects, generator.New(activity), publisher)
	reportHandler := handler.NewReportHandler(reportService)

	ctx, cancel := context.WithCancel(context.Background())
	var consumers sync.WaitGroup
	consume := func(topic, group string, h eventbus.Handler) {
		consumers.Go(func() {
			err := eventbus.Consume(ctx, eventbus.ConsumerConfig{
				Brokers: cfg.KafkaBrokers,
				Topic:   topic,
				GroupID: group,
			}, h)
			if err != nil {
				log.Printf("%s consumer stopped: %v", topic, err)
			}
		})
	}
	consume(events.TopicAuth, activityGroup, consumer.NewAuthEvents(activity).Handle)
	consume(events.TopicReport, generatorGroup, consumer.NewRequests(reportService).Handle)

	srv := server.New(cfg, router.New(reportHandler))
	err = srv.Run()

	cancel()
	consumers.Wait()
	if cerr := publisher.Close(); cerr != nil {
		log.Printf("close publisher: %v", cerr)
	}
	if err != nil {
		log.Fatalf("server error: %v", err)
	}
}
