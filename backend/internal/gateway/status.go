package gateway

import (
	"context"
	"net"
	"net/http"
	"slices"
	"strings"
	"sync"
	"time"

	"github.com/segmentio/kafka-go"

	"github.com/rafhael-viana/TCC/internal/database"
	"github.com/rafhael-viana/TCC/internal/response"
)

const checkTimeout = 2 * time.Second

// Component é o estado de uma peça da arquitetura no painel de status.
type Component struct {
	Name      string `json:"name"`
	Kind      string `json:"kind"` // gateway, service, broker, database
	Address   string `json:"address"`
	Status    string `json:"status"` // up, down, disabled
	LatencyMS int64  `json:"latency_ms"`
	Detail    string `json:"detail,omitempty"`
}

type StatusConfig struct {
	Services     map[string]string // nome -> URL base
	KafkaBrokers []string
	DBDriver     string
	PostgresAddr string
}

// Status verifica todos os componentes em paralelo.
type Status struct {
	cfg    StatusConfig
	client *http.Client
}

func NewStatus(cfg StatusConfig) *Status {
	return &Status{cfg: cfg, client: &http.Client{Timeout: checkTimeout}}
}

func (s *Status) Handle(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), checkTimeout)
	defer cancel()

	out := []Component{{Name: "api-gateway", Kind: "gateway", Address: r.Host, Status: "up", Detail: "Ponto de entrada da API"}}
	var (
		mu sync.Mutex
		wg sync.WaitGroup
	)
	add := func(c Component) {
		mu.Lock()
		out = append(out, c)
		mu.Unlock()
	}

	for name, url := range s.cfg.Services {
		wg.Go(func() { add(s.checkService(ctx, name, url)) })
	}
	wg.Go(func() { add(s.checkKafka(ctx)) })
	wg.Go(func() { add(s.checkPostgres(ctx)) })
	wg.Wait()

	order := map[string]int{"gateway": 0, "service": 1, "broker": 2, "database": 3}
	slices.SortFunc(out, func(a, b Component) int {
		if d := order[a.Kind] - order[b.Kind]; d != 0 {
			return d
		}
		return strings.Compare(a.Name, b.Name)
	})
	response.JSON(w, http.StatusOK, map[string]any{"checked_at": time.Now().UTC(), "components": out})
}

func (s *Status) checkService(ctx context.Context, name, url string) Component {
	c := Component{Name: name, Kind: "service", Address: url}
	start := time.Now()
	req, _ := http.NewRequestWithContext(ctx, http.MethodGet, url+"/health", nil)
	res, err := s.client.Do(req)
	c.LatencyMS = time.Since(start).Milliseconds()
	if err != nil {
		c.Status, c.Detail = "down", err.Error()
		return c
	}
	res.Body.Close()
	if res.StatusCode != http.StatusOK {
		c.Status, c.Detail = "down", res.Status
		return c
	}
	c.Status = "up"
	return c
}

func (s *Status) checkKafka(ctx context.Context) Component {
	c := Component{Name: "kafka", Kind: "broker", Address: strings.Join(s.cfg.KafkaBrokers, ",")}
	start := time.Now()
	conn, err := kafka.DialContext(ctx, "tcp", s.cfg.KafkaBrokers[0])
	if err != nil {
		c.Status, c.Detail = "down", err.Error()
		return c
	}
	defer conn.Close()
	_ = conn.SetDeadline(time.Now().Add(checkTimeout))
	partitions, err := conn.ReadPartitions()
	c.LatencyMS = time.Since(start).Milliseconds()
	if err != nil {
		c.Status, c.Detail = "down", err.Error()
		return c
	}
	topics := []string{}
	for _, p := range partitions {
		if !strings.HasPrefix(p.Topic, "__") && !slices.Contains(topics, p.Topic) {
			topics = append(topics, p.Topic)
		}
	}
	slices.Sort(topics)
	c.Status, c.Detail = "up", "Tópicos: "+strings.Join(topics, ", ")
	return c
}

func (s *Status) checkPostgres(ctx context.Context) Component {
	c := Component{Name: "postgres", Kind: "database", Address: s.cfg.PostgresAddr}
	if s.cfg.DBDriver != database.DriverPostgres {
		c.Status, c.Detail = "disabled", "DB_DRIVER="+s.cfg.DBDriver+": dados em memória"
		return c
	}
	start := time.Now()
	conn, err := (&net.Dialer{}).DialContext(ctx, "tcp", s.cfg.PostgresAddr)
	c.LatencyMS = time.Since(start).Milliseconds()
	if err != nil {
		c.Status, c.Detail = "down", err.Error()
		return c
	}
	conn.Close()
	c.Status, c.Detail = "up", "Um banco por serviço"
	return c
}
