package main

import (
	"context"
	"log"

	"github.com/rafhael-viana/TCC/internal/config"
	"github.com/rafhael-viana/TCC/internal/eventbus"
	"github.com/rafhael-viana/TCC/internal/events"
	"github.com/rafhael-viana/TCC/internal/notification/consumer"
	"github.com/rafhael-viana/TCC/internal/notification/handler"
	"github.com/rafhael-viana/TCC/internal/notification/repository"
	"github.com/rafhael-viana/TCC/internal/notification/router"
	"github.com/rafhael-viana/TCC/internal/notification/sender"
	"github.com/rafhael-viana/TCC/internal/notification/service"
	"github.com/rafhael-viana/TCC/internal/server"
)

const consumerGroup = "notification"

func main() {
	cfg := config.Load("NOTIFICATION_PORT", "8082")

	// Envio de email mockado por enquanto: os emails só aparecem no log.
	emails := repository.NewMemoryEmailRepository()
	emailService := service.NewEmailService(emails, sender.NewMockSender())
	emailHandler := handler.NewEmailHandler(emailService)

	ctx, cancel := context.WithCancel(context.Background())
	consumed := make(chan struct{})
	go func() {
		defer close(consumed)
		err := eventbus.Consume(ctx, eventbus.ConsumerConfig{
			Brokers: cfg.KafkaBrokers,
			Topic:   events.TopicAuth,
			GroupID: consumerGroup,
		}, consumer.NewAuthEvents(emailService).Handle)
		if err != nil {
			log.Printf("auth events consumer stopped: %v", err)
		}
	}()

	srv := server.New(cfg, router.New(emailHandler))
	err := srv.Run()

	cancel()
	<-consumed
	if err != nil {
		log.Fatalf("server error: %v", err)
	}
}
