package keycloak_test

import (
	"encoding/json"
	"io"
	"testing"

	"github.com/lestrrat-go/jwx/v2/jwa"
	"github.com/lestrrat-go/jwx/v2/jwt"
)

func jsonEncode(w io.Writer, v any) error { return json.NewEncoder(w).Encode(v) }

// hs256Token builds an HMAC-signed token to prove non-RS256 algs are rejected.
func hs256Token(t *testing.T, o tokenOpts) string {
	t.Helper()
	b := jwt.NewBuilder().Issuer(o.iss).Subject("sub-123").Audience(o.aud)
	tok, err := b.Build()
	if err != nil {
		t.Fatal(err)
	}
	signed, err := jwt.Sign(tok, jwt.WithKey(jwa.HS256, []byte("0123456789abcdef0123456789abcdef")))
	if err != nil {
		t.Fatal(err)
	}
	return string(signed)
}
