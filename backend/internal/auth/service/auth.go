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
	"github.com/rafhael-viana/TCC/internal/authn"
	"github.com/rafhael-viana/TCC/internal/events"
)

const (
	minPasswordLen = 8
	eventSource    = "auth"
)

var (
	ErrInvalidCredentials = errors.New("invalid credentials")
	ErrUserInactive       = errors.New("user is inactive")
	ErrTenantSuspended    = errors.New("organization is suspended")
	ErrTenantFull         = errors.New("organization user limit reached")
	ErrTenantNotEmpty     = errors.New("organization still has users")
	ErrForbidden          = errors.New("forbidden")
)

// ValidationError indica dados de entrada inválidos (vira 400 no handler).
type ValidationError struct{ Msg string }

func (e *ValidationError) Error() string { return e.Msg }

type RegisterInput struct {
	Name       string `json:"name"`
	Username   string `json:"username"`
	Email      string `json:"email"`
	Password   string `json:"password"`
	InviteCode string `json:"invite_code,omitempty"`
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
	tenants  repository.TenantRepository
	teams    repository.TeamRepository
	events   EventPublisher
	secret   []byte
	tokenTTL time.Duration
}

func NewAuthService(users repository.UserRepository, tenants repository.TenantRepository, teams repository.TeamRepository,
	publisher EventPublisher, secret string, tokenTTL time.Duration) *AuthService {
	return &AuthService{users: users, tenants: tenants, teams: teams, events: publisher, secret: []byte(secret), tokenTTL: tokenTTL}
}

// Register cria uma conta pelo cadastro público, sempre como profissional. A
// empresa vem do código de convite ou, sem ele, do domínio do e-mail.
func (s *AuthService) Register(ctx context.Context, in RegisterInput) (*model.User, error) {
	email := strings.ToLower(strings.TrimSpace(in.Email))
	if !validEmail(email) {
		return nil, &ValidationError{"invalid email"}
	}

	var (
		tenant *model.Tenant
		err    error
	)
	if code := strings.TrimSpace(in.InviteCode); code != "" {
		tenant, err = s.tenants.FindByInviteCode(ctx, code)
		if errors.Is(err, repository.ErrTenantNotFound) {
			return nil, &ValidationError{"invalid invite code"}
		}
	} else {
		tenant, err = s.tenants.FindByDomain(ctx, emailDomain(email))
		if errors.Is(err, repository.ErrTenantNotFound) {
			return nil, &ValidationError{"no organization for this email domain: use an invite code"}
		}
	}
	if err != nil {
		return nil, err
	}
	if err := s.checkJoin(ctx, tenant, email); err != nil {
		return nil, err
	}
	return s.create(ctx, in, model.RoleProfissional, tenant.ID, "", "")
}

// checkJoin aplica as regras da empresa para um novo usuário: não pode estar
// suspensa, precisa ter vaga e, se tiver domínios, o e-mail deve ser de um deles.
func (s *AuthService) checkJoin(ctx context.Context, t *model.Tenant, email string) error {
	if t.Status == model.TenantSuspended {
		return ErrTenantSuspended
	}
	if len(t.Domains) > 0 && !containsFold(t.Domains, emailDomain(email)) {
		return &ValidationError{"email domain not allowed for this organization"}
	}
	members, err := s.users.List(ctx, repository.UserFilter{TenantID: t.ID})
	if err != nil {
		return err
	}
	if len(members) >= t.MaxUsers {
		return ErrTenantFull
	}
	return nil
}

func (s *AuthService) create(ctx context.Context, in RegisterInput, role model.Role, tenantID, teamID, actorID string) (*model.User, error) {
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
	}
	hash, err := hashPassword(in.Password)
	if err != nil {
		return nil, err
	}

	u := &model.User{
		ID:           rand.Text(),
		Name:         in.Name,
		Username:     in.Username,
		Email:        in.Email,
		Role:         role,
		TenantID:     tenantID,
		TeamID:       teamID,
		Active:       true,
		PasswordHash: hash,
		CreatedAt:    time.Now().UTC(),
	}
	if err := s.users.Create(ctx, u); err != nil {
		return nil, err
	}

	s.publish(ctx, u.ID, events.TypeUserRegistered, u.TenantID, events.UserRegistered{
		UserID:   u.ID,
		Name:     u.Name,
		Username: u.Username,
		Email:    u.Email,
		Role:     string(u.Role),
		TenantID: u.TenantID,
		TeamID:   u.TeamID,
		ActorID:  actorID,
	})
	return u, nil
}

func hashPassword(password string) (string, error) {
	switch {
	case len(password) < minPasswordLen:
		return "", &ValidationError{fmt.Sprintf("password must have at least %d characters", minPasswordLen)}
	case len(password) > 72: // limite do bcrypt
		return "", &ValidationError{"password must have at most 72 bytes"}
	}
	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return "", fmt.Errorf("hash password: %w", err)
	}
	return string(hash), nil
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
		s.publish(ctx, login, events.TypeLoginFailed, "", events.LoginFailed{Login: login, Reason: "user_not_found"})
		return nil, ErrInvalidCredentials
	}
	if err != nil {
		return nil, err
	}

	if bcrypt.CompareHashAndPassword([]byte(u.PasswordHash), []byte(in.Password)) != nil {
		s.publish(ctx, u.ID, events.TypeLoginFailed, u.TenantID, events.LoginFailed{Login: login, Reason: "wrong_password"})
		return nil, ErrInvalidCredentials
	}
	if err := s.checkAccess(ctx, u); err != nil {
		reason := "user_inactive"
		if errors.Is(err, ErrTenantSuspended) {
			reason = "tenant_suspended"
		}
		s.publish(ctx, u.ID, events.TypeLoginFailed, u.TenantID, events.LoginFailed{Login: login, Reason: reason})
		return nil, err
	}

	expiresAt := time.Now().Add(s.tokenTTL)
	token, err := authn.Sign(s.secret, authn.Claims{
		Role:     string(u.Role),
		TenantID: u.TenantID,
		RegisteredClaims: jwt.RegisteredClaims{
			Subject:   u.ID,
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			ExpiresAt: jwt.NewNumericDate(expiresAt),
		},
	})
	if err != nil {
		return nil, fmt.Errorf("sign token: %w", err)
	}

	s.publish(ctx, u.ID, events.TypeLoginSucceeded, u.TenantID, events.LoginSucceeded{UserID: u.ID})
	return &AuthResult{Token: token, ExpiresAt: expiresAt.UTC(), User: u}, nil
}

// checkAccess diz se o usuário pode usar a plataforma agora.
func (s *AuthService) checkAccess(ctx context.Context, u *model.User) error {
	if !u.Active {
		return ErrUserInactive
	}
	if u.TenantID == "" {
		return nil
	}
	t, err := s.tenants.FindByID(ctx, u.TenantID)
	if errors.Is(err, repository.ErrTenantNotFound) {
		return ErrTenantSuspended // empresa removida: trata como bloqueada
	}
	if err != nil {
		return err
	}
	if t.Status == model.TenantSuspended {
		return ErrTenantSuspended
	}
	return nil
}

// Access é o estado de acesso consultado pelo gateway a cada requisição
// autenticada (com cache curto), para que bloqueios valham na hora.
type Access struct {
	Allowed   bool   `json:"allowed"`
	Reason    string `json:"reason,omitempty"`
	TenantID  string `json:"tenant_id,omitempty"`
	RateLimit int    `json:"rate_limit"` // 0 = sem limite
}

func (s *AuthService) Access(ctx context.Context, userID string) (*Access, error) {
	u, err := s.users.FindByID(ctx, userID)
	if errors.Is(err, repository.ErrUserNotFound) {
		return &Access{Reason: "user not found"}, nil
	}
	if err != nil {
		return nil, err
	}
	if err := s.checkAccess(ctx, u); err != nil {
		return &Access{Reason: err.Error(), TenantID: u.TenantID}, nil
	}
	a := &Access{Allowed: true, TenantID: u.TenantID}
	if u.TenantID != "" {
		if t, err := s.tenants.FindByID(ctx, u.TenantID); err == nil {
			a.RateLimit = t.RateLimit
		}
	}
	return a, nil
}

// Me devolve o usuário autenticado.
func (s *AuthService) Me(ctx context.Context, userID string) (*model.User, error) {
	return s.users.FindByID(ctx, userID)
}

// publish é best effort: uma falha ao publicar é logada mas não desfaz a
// operação nem muda a resposta ao cliente.
func (s *AuthService) publish(ctx context.Context, key, typ, tenantID string, data any) {
	e, err := events.New(eventSource, typ, data)
	if err == nil {
		e.TenantID = tenantID
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

func emailDomain(email string) string {
	_, domain, _ := strings.Cut(email, "@")
	return strings.ToLower(domain)
}

func containsFold(list []string, s string) bool {
	for _, item := range list {
		if strings.EqualFold(item, s) {
			return true
		}
	}
	return false
}
