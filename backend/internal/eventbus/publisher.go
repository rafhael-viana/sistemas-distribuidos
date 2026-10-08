package eventbus

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"time"

	"github.com/segmentio/kafka-go"

	"github.com/rafhael-viana/TCC/internal/events"
)

// KafkaPublisher publica eventos em um tópico do Kafka. A escrita é
// assíncrona: Publish não espera o broker confirmar, então uma indisponibilidade
// do Kafka não deixa as requisições lentas. Falhas de entrega são logadas.
type KafkaPublisher struct {
	w *kafka.Writer
}

func NewKafkaPublisher(brokers []string, topic string) *KafkaPublisher {
	return &KafkaPublisher{w: &kafka.Writer{
		Addr:         kafka.TCP(brokers...),
		Topic:        topic,
		Balancer:     &kafka.Hash{}, // mesma chave -> mesma partição -> ordem preservada
		RequiredAcks: kafka.RequireAll,
		BatchTimeout: 10 * time.Millisecond,
		Async:        true,
		Completion: func(msgs []kafka.Message, err error) {
			if err != nil {
				log.Printf("eventbus: failed to publish %d event(s) to %s: %v", len(msgs), topic, err)
			}
		},
	}}
}

// Publish envia o evento usando key como chave de partição.
func (p *KafkaPublisher) Publish(ctx context.Context, key string, e events.Event) error {
	value, err := json.Marshal(e)
	if err != nil {
		return fmt.Errorf("marshal event: %w", err)
	}
	return p.w.WriteMessages(ctx, kafka.Message{
		Key:     []byte(key),
		Value:   value,
		Headers: []kafka.Header{{Key: "event-type", Value: []byte(e.Type)}},
	})
}

// Close envia o que estiver pendente e fecha a conexão.
func (p *KafkaPublisher) Close() error {
	return p.w.Close()
}
