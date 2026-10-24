// Package problem implements RFC 7807 problem+json responses.
package problem

import (
	"encoding/json"
	"net/http"
)

// ContentType is the RFC 7807 media type.
const ContentType = "application/problem+json"

// Problem is an RFC 7807 problem details object.
type Problem struct {
	Type     string `json:"type"`
	Title    string `json:"title"`
	Status   int    `json:"status"`
	Detail   string `json:"detail,omitempty"`
	Instance string `json:"instance,omitempty"`
}

// Write encodes a problem document for status to w.
func Write(w http.ResponseWriter, status int, detail, instance string) error {
	w.Header().Set("Content-Type", ContentType)
	w.WriteHeader(status)
	return json.NewEncoder(w).Encode(Problem{
		Type:     "about:blank",
		Title:    http.StatusText(status),
		Status:   status,
		Detail:   detail,
		Instance: instance,
	})
}
