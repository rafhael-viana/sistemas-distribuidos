package generator

import (
	"bytes"
	"encoding/csv"
	"fmt"
)

func renderCSV(t *Table) ([]byte, error) {
	var buf bytes.Buffer
	w := csv.NewWriter(&buf)

	if err := w.Write(t.Headers); err != nil {
		return nil, fmt.Errorf("write csv: %w", err)
	}
	if err := w.WriteAll(t.Rows); err != nil {
		return nil, fmt.Errorf("write csv: %w", err)
	}
	return buf.Bytes(), nil
}
