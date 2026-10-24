package problem_test

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/otp2025/backend-go/pkg/problem"
)

func TestWrite(t *testing.T) {
	tests := []struct {
		name   string
		status int
		detail string
		title  string
	}{
		{"401", http.StatusUnauthorized, "missing token", "Unauthorized"},
		{"403", http.StatusForbidden, "nope", "Forbidden"},
		{"404", http.StatusNotFound, "gone", "Not Found"},
		{"500", http.StatusInternalServerError, "oops", "Internal Server Error"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			rec := httptest.NewRecorder()
			if err := problem.Write(rec, tt.status, tt.detail, "/x"); err != nil {
				t.Fatal(err)
			}
			if ct := rec.Header().Get("Content-Type"); ct != "application/problem+json" {
				t.Fatalf("content-type %q", ct)
			}
			if rec.Code != tt.status {
				t.Fatalf("status %d", rec.Code)
			}
			var p problem.Problem
			if err := json.Unmarshal(rec.Body.Bytes(), &p); err != nil {
				t.Fatal(err)
			}
			if p.Status != tt.status || p.Title != tt.title || p.Detail != tt.detail || p.Instance != "/x" || p.Type != "about:blank" {
				t.Fatalf("unexpected body %+v", p)
			}
		})
	}
}
