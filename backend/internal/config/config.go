package config

import (
	"os"
	"strings"
	"time"
)

type Config struct {
	Port            string
	ReadTimeout     time.Duration
	WriteTimeout    time.Duration
	IdleTimeout     time.Duration
	ShutdownTimeout time.Duration
	JWTSecret       string
	TokenTTL        time.Duration
	AuthServiceURL  string
	// URLs dos serviços atrás do gateway.
	NotificationServiceURL string
	AuditServiceURL        string
	ReportServiceURL       string
	// PostgresAddr é host:porta do Postgres, usado só no painel de componentes.
	PostgresAddr string
	KafkaBrokers []string
	ReportsDir   string
	DBDriver     string
	DatabaseURL  string
}

// Load lê a configuração do ambiente. Cada serviço informa a variável de
// porta que usa (ex.: API_PORT, AUTH_PORT) e a porta padrão.
func Load(portEnv, defaultPort string) Config {
	return Config{
		Port:                   getEnv(portEnv, defaultPort),
		ReadTimeout:            10 * time.Second,
		WriteTimeout:           10 * time.Second,
		IdleTimeout:            60 * time.Second,
		ShutdownTimeout:        15 * time.Second,
		JWTSecret:              getEnv("JWT_SECRET", ""),
		TokenTTL:               24 * time.Hour,
		AuthServiceURL:         getEnv("AUTH_SERVICE_URL", "http://localhost:8081"),
		NotificationServiceURL: getEnv("NOTIFICATION_SERVICE_URL", "http://localhost:8082"),
		AuditServiceURL:        getEnv("AUDIT_SERVICE_URL", "http://localhost:8083"),
		ReportServiceURL:       getEnv("REPORT_SERVICE_URL", "http://localhost:8084"),
		PostgresAddr:           getEnv("POSTGRES_ADDR", "localhost:5432"),
		KafkaBrokers:           strings.Split(getEnv("KAFKA_BROKERS", "localhost:9092"), ","),
		ReportsDir:             getEnv("REPORTS_DIR", "data/reports"),
		DBDriver:               getEnv("DB_DRIVER", "memory"),
		DatabaseURL:            getEnv("DATABASE_URL", ""),
	}
}

func getEnv(key, fallback string) string {
	if v, ok := os.LookupEnv(key); ok && v != "" {
		return v
	}
	return fallback
}
