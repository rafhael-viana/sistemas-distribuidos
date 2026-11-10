package main

import (
	"log"
	"net/http"

	"github.com/rafhael-viana/TCC/internal/applog"
	"github.com/rafhael-viana/TCC/internal/config"
	"github.com/rafhael-viana/TCC/internal/eventbus"
	"github.com/rafhael-viana/TCC/internal/events"
	"github.com/rafhael-viana/TCC/internal/gateway"
	"github.com/rafhael-viana/TCC/internal/handler"
	"github.com/rafhael-viana/TCC/internal/server"
)

const serviceName = "api-gateway"

func main() {
	cfg := config.Load("API_PORT", "8080")
	if cfg.JWTSecret == "" {
		log.Fatal("JWT_SECRET is required: the gateway validates the tokens issued by auth")
	}

	proxy := func(target string) http.Handler {
		h, err := handler.NewProxy(target)
		if err != nil {
			log.Fatal(err)
		}
		return h
	}
	up := gateway.Upstreams{
		Auth:         proxy(cfg.AuthServiceURL),
		Notification: proxy(cfg.NotificationServiceURL),
		Audit:        proxy(cfg.AuditServiceURL),
		Report:       proxy(cfg.ReportServiceURL),
	}
	status := gateway.NewStatus(gateway.StatusConfig{
		Services: map[string]string{
			"auth":         cfg.AuthServiceURL,
			"notification": cfg.NotificationServiceURL,
			"audit":        cfg.AuditServiceURL,
			"report":       cfg.ReportServiceURL,
		},
		KafkaBrokers: cfg.KafkaBrokers,
		DBDriver:     cfg.DBDriver,
		PostgresAddr: cfg.PostgresAddr,
	})

	logs := eventbus.NewKafkaPublisher(cfg.KafkaBrokers, events.TopicLogs)
	logger := applog.New(serviceName, logs)
	guard := gateway.NewAccessGuard(cfg.AuthServiceURL, []byte(cfg.JWTSecret))

	srv := server.New(cfg, gateway.New(up, []byte(cfg.JWTSecret), guard, status, logger))
	err := srv.Run()

	if cerr := logs.Close(); cerr != nil {
		log.Printf("close log publisher: %v", cerr)
	}
	if err != nil {
		log.Fatalf("server error: %v", err)
	}
}
