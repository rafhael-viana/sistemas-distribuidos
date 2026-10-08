package config

import (
	"os"
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
}

// Load lê a configuração do ambiente. Cada serviço informa a variável de
// porta que usa (ex.: API_PORT, AUTH_PORT) e a porta padrão.
func Load(portEnv, defaultPort string) Config {
	return Config{
		Port:            getEnv(portEnv, defaultPort),
		ReadTimeout:     10 * time.Second,
		WriteTimeout:    10 * time.Second,
		IdleTimeout:     60 * time.Second,
		ShutdownTimeout: 15 * time.Second,
		JWTSecret:       getEnv("JWT_SECRET", ""),
		TokenTTL:        24 * time.Hour,
		AuthServiceURL:  getEnv("AUTH_SERVICE_URL", "http://localhost:8081"),
	}
}

func getEnv(key, fallback string) string {
	if v, ok := os.LookupEnv(key); ok && v != "" {
		return v
	}
	return fallback
}
