package generator

import (
	"bytes"
	"fmt"

	"github.com/go-pdf/fpdf"
)

const (
	pdfFontSize   = 8
	pdfLineHeight = 6
)

// renderPDF desenha a tabela em A4 paisagem, repetindo o cabeçalho a cada página.
func renderPDF(t *Table) ([]byte, error) {
	pdf := fpdf.New("L", "mm", "A4", "")
	// As fontes padrão do PDF usam cp1252: converte os textos para os acentos saírem certos.
	tr := pdf.UnicodeTranslatorFromDescriptor("")

	widths := columnWidths(pdf, t)

	header := func() {
		pdf.SetFont("Helvetica", "B", pdfFontSize)
		pdf.SetFillColor(230, 230, 230)
		for i, h := range t.Headers {
			pdf.CellFormat(widths[i], pdfLineHeight, tr(h), "1", 0, "L", true, 0, "")
		}
		pdf.Ln(-1)
		pdf.SetFont("Helvetica", "", pdfFontSize)
	}

	pdf.SetHeaderFunc(func() {
		if pdf.PageNo() == 1 {
			pdf.SetFont("Helvetica", "B", 14)
			pdf.CellFormat(0, 10, tr(t.Title), "", 1, "L", false, 0, "")
			pdf.SetFont("Helvetica", "", 9)
			info := fmt.Sprintf("Gerado em %s UTC • %d registro(s)", t.GeneratedAt.Format(timeLayout), len(t.Rows))
			pdf.CellFormat(0, 6, tr(info), "", 1, "L", false, 0, "")
			pdf.Ln(2)
		}
		header()
	})
	pdf.SetFooterFunc(func() {
		pdf.SetY(-12)
		pdf.SetFont("Helvetica", "", 8)
		pdf.CellFormat(0, 6, tr(fmt.Sprintf("Página %d", pdf.PageNo())), "", 0, "R", false, 0, "")
	})

	// O fpdf volta para a fonte de antes do AddPage depois do cabeçalho.
	pdf.SetFont("Helvetica", "", pdfFontSize)
	pdf.AddPage()
	if len(t.Rows) == 0 {
		pdf.CellFormat(0, pdfLineHeight, tr("Nenhum registro."), "", 1, "L", false, 0, "")
	}
	for _, row := range t.Rows {
		for i, cell := range row {
			pdf.CellFormat(widths[i], pdfLineHeight, fit(pdf, tr(cell), widths[i]), "1", 0, "L", false, 0, "")
		}
		pdf.Ln(-1)
	}

	var buf bytes.Buffer
	if err := pdf.Output(&buf); err != nil {
		return nil, fmt.Errorf("render pdf: %w", err)
	}
	return buf.Bytes(), nil
}

// columnWidths divide a largura da página proporcionalmente ao maior texto de
// cada coluna.
func columnWidths(pdf *fpdf.Fpdf, t *Table) []float64 {
	pdf.SetFont("Helvetica", "B", pdfFontSize)
	pageW, _ := pdf.GetPageSize()
	left, _, right, _ := pdf.GetMargins()
	available := pageW - left - right

	widths := make([]float64, len(t.Headers))
	for i, h := range t.Headers {
		widths[i] = pdf.GetStringWidth(h)
	}
	for _, row := range t.Rows {
		for i, cell := range row {
			widths[i] = max(widths[i], pdf.GetStringWidth(cell))
		}
	}

	var total float64
	for i := range widths {
		widths[i] += 4 // folga para o padding da célula
		total += widths[i]
	}
	for i := range widths {
		widths[i] = widths[i] / total * available
	}
	return widths
}

// fit corta o texto com "..." quando ele não cabe na coluna.
func fit(pdf *fpdf.Fpdf, s string, width float64) string {
	limit := width - 2
	if pdf.GetStringWidth(s) <= limit {
		return s
	}
	r := []byte(s) // já está em cp1252: um byte por caractere
	for len(r) > 0 && pdf.GetStringWidth(string(r)+"...") > limit {
		r = r[:len(r)-1]
	}
	return string(r) + "..."
}
