package main

import (
	"log"

	"github.com/rafhael-viana/TCC/internal/config"
	"github.com/rafhael-viana/TCC/internal/notification/handler"
	"github.com/rafhael-viana/TCC/internal/notification/repository"
	"github.com/rafhael-viana/TCC/internal/notification/router"
	"github.com/rafhael-viana/TCC/internal/notification/sender"
	"github.com/rafhael-viana/TCC/internal/notification/service"
	"github.com/rafhael-viana/TCC/internal/server"
)

func main() {
	cfg := config.Load("NOTIFICATION_PORT", "8082")

	// Envio de email mockado por enquanto: os emails só aparecem no log.
	emails := repository.NewMemoryEmailRepository()
	emailService := service.NewEmailService(emails, sender.NewMockSender())
	emailHandler := handler.NewEmailHandler(emailService)

	srv := server.New(cfg, router.New(emailHandler))

	if err := srv.Run(); err != nil {
		log.Fatalf("server error: %v", err)
	}
}
