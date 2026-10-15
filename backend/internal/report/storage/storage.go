package storage

import (
	"context"
	"errors"
	"fmt"
	"io"
	"os"
	"path/filepath"
)

var ErrObjectNotFound = errors.New("object not found")

// ObjectStore guarda os arquivos dos relatórios gerados. A implementação
// local pode ser trocada por um armazenamento de objetos (S3, MinIO) sem
// mudar o resto do serviço.
type ObjectStore interface {
	Put(ctx context.Context, key string, data []byte) error
	Get(ctx context.Context, key string) (io.ReadCloser, error)
}

// LocalStore grava os objetos como arquivos dentro de um diretório.
type LocalStore struct {
	dir string
}

func NewLocalStore(dir string) (*LocalStore, error) {
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return nil, fmt.Errorf("create storage dir: %w", err)
	}
	return &LocalStore{dir: dir}, nil
}

// Put grava num arquivo temporário e renomeia, para um download nunca ler um
// arquivo pela metade.
func (s *LocalStore) Put(_ context.Context, key string, data []byte) error {
	path, err := s.path(key)
	if err != nil {
		return err
	}
	tmp := path + ".tmp"
	if err := os.WriteFile(tmp, data, 0o644); err != nil {
		return fmt.Errorf("write object %s: %w", key, err)
	}
	if err := os.Rename(tmp, path); err != nil {
		return fmt.Errorf("commit object %s: %w", key, err)
	}
	return nil
}

func (s *LocalStore) Get(_ context.Context, key string) (io.ReadCloser, error) {
	path, err := s.path(key)
	if err != nil {
		return nil, err
	}
	f, err := os.Open(path)
	if errors.Is(err, os.ErrNotExist) {
		return nil, ErrObjectNotFound
	}
	return f, err
}

// path impede que uma chave saia do diretório (ex.: "../x").
func (s *LocalStore) path(key string) (string, error) {
	if key == "" || filepath.Base(key) != key {
		return "", fmt.Errorf("invalid object key %q", key)
	}
	return filepath.Join(s.dir, key), nil
}
