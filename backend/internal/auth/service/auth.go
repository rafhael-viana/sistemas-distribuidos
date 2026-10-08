package service

import (
	"context"
	"crypto/rand"
	"errors"
	"fmt"
	"log"
	"net/mail"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"

	"github.com/rafhael-viana/TCC/internal/auth/model"
	"github.com/rafhael-viana/TCC/internal/auth/repository"
	"github.com/rafhael-viana/TCC/internal/events"
)

const (
	minPasswordLen = 8
	eventSource    = "auth"
)

var ErrInvalidCredentials = errors.New("invalid credentials")

// ValidationError indica dados de entrada inválidos (vira 400 no handler).
type ValidationError struct{ Msg string }

func (e *ValidationError) Error() string { return e.Msg }

type RegisterInput struct {
	Name     string `json:"name"`
	Username string `json:"username"`
	Email    string `json:"email"`
	Password string `json:"password"`
}

type LoginInput struct {
	Login    string `json:"login"` // email ou username
	Password string `json:"password"`
}

type AuthResult struct {
	Token     string      `json:"token"`
	ExpiresAt time.Time   `json:"expires_at"`
	User      *model.User `json:"user"`
}

// EventPublisher publica eventos de domínio (ex.: no Kafka). key define a
// partição, garantindo a ordem dos eventos de um mesmo usuário.
type EventPublisher interface {
	Publish(ctx context.Context, key string, e events.Event) error
}

type AuthService struct {
	users    repository.UserRepository
	events   EventPublisher
	secret   []byte
	tokenTTL time.Duration
}

func NewAuthService(users repository.UserRepository, publisher EventPublisher, secret string, tokenTTL time.Duration) *AuthService {
	return &AuthService{users: users, events: publisher, secret: []byte(secret), tokenTTL: tokenTTL}
}

func (s *AuthService) Register(ctx context.Context, in RegisterInput) (*model.User, error) {
	in.Name = strings.TrimSpace(in.Name)
	in.Username = strings.TrimSpace(in.Username)
	in.Email = strings.ToLower(strings.TrimSpace(in.Email))

	switch {
	case in.Name == "":
		return nil, &ValidationError{"name is required"}
	case in.Username == "":
		return nil, &ValidationError{"username is required"}
	case strings.ContainsAny(in.Username, "@ \t"):
		return nil, &ValidationError{"username must not contain spaces or '@'"}
	case !validEmail(in.Email):
		return nil, &ValidationError{"invalid email"}
	case len(in.Password) < minPasswordLen:
		return nil, &ValidationError{fmt.Sprintf("password must have at least %d characters", minPasswordLen)}
	case len(in.Password) > 72: // limite do bcrypt
		return nil, &ValidationError{"password must have at most 72 bytes"}
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(in.Password), bcrypt.DefaultCost)
	if err != nil {
		return nil, fmt.Errorf("hash password: %w", err)
	}

	u := &model.User{
		ID:           rand.Text(),
		Name:         in.Name,
		Username:     in.Username,
		Email:        in.Email,
		PasswordHash: string(hash),
		CreatedAt:    time.Now().UTC(),
	}
	if err := s.users.Create(ctx, u); err != nil {
		return nil, err
	}

	s.publish(ctx, u.ID, events.TypeUserRegistered, events.UserRegistered{
		UserID:   u.ID,
		Name:     u.Name,
		Username: u.Username,
		Email:    u.Email,
	})
	return u, nil
}

func (s *AuthService) Login(ctx context.Context, in LoginInput) (*AuthResult, error) {
	login := strings.TrimSpace(in.Login)
	if login == "" || in.Password == "" {
		return nil, &ValidationError{"login and password are required"}
	}

	var (
		u   *model.User
		err error
	)
	if strings.Contains(login, "@") {
		u, err = s.users.FindByEmail(ctx, strings.ToLower(login))
	} else {
		u, err = s.users.FindByUsername(ctx, login)
	}
	if errors.Is(err, repository.ErrUserNotFound) {
		s.publish(ctx, login, events.TypeLoginFailed, events.LoginFailed{Login: login, Reason: "user_not_found"})
		return nil, ErrInvalidCredentials
	}
	if err != nil {
		return nil, err
	}

	if bcrypt.CompareHashAndPassword([]byte(u.PasswordHash), []byte(in.Password)) != nil {
		s.publish(ctx, u.ID, events.TypeLoginFailed, events.LoginFailed{Login: login, Reason: "wrong_password"})
		return nil, ErrInvalidCredentials
	}

	expiresAt := time.Now().Add(s.tokenTTL)
	token, err := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.RegisteredClaims{
		Subject:   u.ID,
		IssuedAt:  jwt.NewNumericDate(time.Now()),
		ExpiresAt: jwt.NewNumericDate(expiresAt),
	}).SignedString(s.secret)
	if err != nil {
		return nil, fmt.Errorf("sign token: %w", err)
	}

	s.publish(ctx, u.ID, events.TypeLoginSucceeded, events.LoginSucceeded{UserID: u.ID})
	return &AuthResult{Token: token, ExpiresAt: expiresAt.UTC(), User: u}, nil
}

// publish é best effort: uma falha ao publicar é logada mas não desfaz a
// operação nem muda a resposta ao cliente.
func (s *AuthService) publish(ctx context.Context, key, typ string, data any) {
	e, err := events.New(eventSource, typ, data)
	if err == nil {
		err = s.events.Publish(ctx, key, e)
	}
	if err != nil {
		log.Printf("publish %s event: %v", typ, err)
	}
}

func validEmail(email string) bool {
	addr, err := mail.ParseAddress(email)
	return err == nil && addr.Address == email
}
