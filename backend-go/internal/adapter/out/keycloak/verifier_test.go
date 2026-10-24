package keycloak_test

import (
	"context"
	"crypto/rand"
	"crypto/rsa"
	"errors"
	"net/http"
	"net/http/httptest"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"github.com/lestrrat-go/jwx/v2/jwa"
	"github.com/lestrrat-go/jwx/v2/jwk"
	"github.com/lestrrat-go/jwx/v2/jwt"

	"github.com/otp2025/backend-go/internal/adapter/out/keycloak"
	"github.com/otp2025/backend-go/internal/domain"
)

const (
	issuer   = "http://localhost:8081/realms/otp"
	audience = "otp-api"
)

type signer struct {
	kid string
	key *rsa.PrivateKey
}

func newSigner(t *testing.T, kid string) signer {
	t.Helper()
	k, err := rsa.GenerateKey(rand.Reader, 2048)
	if err != nil {
		t.Fatal(err)
	}
	return signer{kid: kid, key: k}
}

func (s signer) publicJWK(t *testing.T) jwk.Key {
	t.Helper()
	pub, err := jwk.FromRaw(s.key.Public())
	if err != nil {
		t.Fatal(err)
	}
	_ = pub.Set(jwk.KeyIDKey, s.kid)
	_ = pub.Set(jwk.AlgorithmKey, jwa.RS256)
	_ = pub.Set(jwk.KeyUsageKey, "sig")
	return pub
}

// fakeJWKS serves a mutable key set and counts hits.
type fakeJWKS struct {
	srv  *httptest.Server
	mu   sync.Mutex
	set  jwk.Set
	hits atomic.Int32
}

func newFakeJWKS(t *testing.T, signers ...signer) *fakeJWKS {
	t.Helper()
	f := &fakeJWKS{}
	f.setKeys(t, signers...)
	f.srv = httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		f.hits.Add(1)
		f.mu.Lock()
		defer f.mu.Unlock()
		w.Header().Set("Content-Type", "application/json")
		_ = jsonEncode(w, f.set)
	}))
	t.Cleanup(f.srv.Close)
	return f
}

func (f *fakeJWKS) setKeys(t *testing.T, signers ...signer) {
	t.Helper()
	set := jwk.NewSet()
	for _, s := range signers {
		_ = set.AddKey(s.publicJWK(t))
	}
	f.mu.Lock()
	f.set = set
	f.mu.Unlock()
}

type tokenOpts struct {
	iss      string
	aud      []string
	exp      time.Duration
	nbf      time.Duration
	claims   map[string]any
	omitKid  bool
	alg      jwa.SignatureAlgorithm
	username string
}

func defaultOpts() tokenOpts {
	return tokenOpts{
		iss: issuer, aud: []string{audience}, exp: time.Hour, username: "admin1",
		claims: map[string]any{
			"realm_access": map[string]any{"roles": []any{"admin", "user"}},
			"org_id":       float64(1),
		},
	}
}

func (s signer) token(t *testing.T, o tokenOpts) string {
	t.Helper()
	now := time.Now()
	b := jwt.NewBuilder().
		Issuer(o.iss).
		Subject("sub-123").
		Audience(o.aud).
		IssuedAt(now).
		Expiration(now.Add(o.exp)).
		NotBefore(now.Add(o.nbf)).
		Claim("preferred_username", o.username)
	for k, v := range o.claims {
		b = b.Claim(k, v)
	}
	tok, err := b.Build()
	if err != nil {
		t.Fatal(err)
	}
	jk, err := jwk.FromRaw(s.key)
	if err != nil {
		t.Fatal(err)
	}
	_ = jk.Set(jwk.KeyIDKey, s.kid)
	alg := o.alg
	if alg == "" {
		alg = jwa.RS256
	}
	signed, err := jwt.Sign(tok, jwt.WithKey(alg, jk))
	if err != nil {
		t.Fatal(err)
	}
	return string(signed)
}

func newVerifier(f *fakeJWKS, cooldown time.Duration) *keycloak.Verifier {
	return keycloak.NewVerifier(keycloak.Config{
		Issuer: issuer, JWKSURL: f.srv.URL, Audience: audience,
		Timeout: 2 * time.Second, RefreshCooldown: cooldown,
	})
}

func TestVerify(t *testing.T) {
	good := newSigner(t, "kid-1")
	other := newSigner(t, "kid-1") // same kid, different key => bad signature

	tests := []struct {
		name    string
		signer  signer
		mutate  func(*tokenOpts)
		wantErr bool
		check   func(*testing.T, domain.Claims)
	}{
		{name: "valid token", signer: good, check: func(t *testing.T, c domain.Claims) {
			if c.Subject != "sub-123" || c.Username != "admin1" {
				t.Fatalf("bad identity %+v", c)
			}
			if !c.HasAnyRole("admin") || !c.HasAnyRole("user") {
				t.Fatalf("roles %v", c.Roles)
			}
			if c.OrgID == nil || *c.OrgID != 1 {
				t.Fatalf("org %v", c.OrgID)
			}
		}},
		{name: "missing org_id is allowed", signer: good,
			mutate: func(o *tokenOpts) { delete(o.claims, "org_id") },
			check: func(t *testing.T, c domain.Claims) {
				if c.OrgID != nil {
					t.Fatalf("want nil org, got %d", *c.OrgID)
				}
			}},
		{name: "org_id as string", signer: good,
			mutate: func(o *tokenOpts) { o.claims["org_id"] = "7" },
			check: func(t *testing.T, c domain.Claims) {
				if c.OrgID == nil || *c.OrgID != 7 {
					t.Fatalf("org %v", c.OrgID)
				}
			}},
		{name: "malformed org_id", signer: good, wantErr: true,
			mutate: func(o *tokenOpts) { o.claims["org_id"] = "abc" }},
		{name: "missing realm_access gives no roles", signer: good,
			mutate: func(o *tokenOpts) { delete(o.claims, "realm_access") },
			check: func(t *testing.T, c domain.Claims) {
				if len(c.Roles) != 0 {
					t.Fatalf("roles %v", c.Roles)
				}
			}},
		{name: "expired", signer: good, wantErr: true, mutate: func(o *tokenOpts) { o.exp = -time.Hour }},
		{name: "not yet valid", signer: good, wantErr: true, mutate: func(o *tokenOpts) { o.nbf = time.Hour }},
		{name: "wrong issuer", signer: good, wantErr: true, mutate: func(o *tokenOpts) { o.iss = "http://keycloak:8080/realms/otp" }},
		{name: "wrong audience", signer: good, wantErr: true, mutate: func(o *tokenOpts) { o.aud = []string{"other"} }},
		{name: "audience among many", signer: good, mutate: func(o *tokenOpts) { o.aud = []string{"account", audience} }},
		{name: "bad signature", signer: other, wantErr: true},
		{name: "unsupported alg HS256", signer: good, wantErr: true, mutate: func(o *tokenOpts) { o.alg = jwa.HS256 }},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			f := newFakeJWKS(t, good)
			v := newVerifier(f, time.Nanosecond)
			o := defaultOpts()
			if tt.mutate != nil {
				tt.mutate(&o)
			}
			var raw string
			if o.alg == jwa.HS256 {
				raw = hs256Token(t, o)
			} else {
				raw = tt.signer.token(t, o)
			}
			c, err := v.Verify(context.Background(), raw)
			if tt.wantErr {
				if !errors.Is(err, domain.ErrUnauthorized) {
					t.Fatalf("want ErrUnauthorized, got %v", err)
				}
				return
			}
			if err != nil {
				t.Fatalf("unexpected err %v", err)
			}
			if tt.check != nil {
				tt.check(t, c)
			}
		})
	}
}

func TestVerifyGarbageToken(t *testing.T) {
	f := newFakeJWKS(t, newSigner(t, "kid-1"))
	_, err := newVerifier(f, time.Nanosecond).Verify(context.Background(), "not-a-jwt")
	if !errors.Is(err, domain.ErrUnauthorized) {
		t.Fatalf("got %v", err)
	}
}

func TestVerifyUnknownKidRefreshesJWKS(t *testing.T) {
	old := newSigner(t, "kid-old")
	rotated := newSigner(t, "kid-new")
	f := newFakeJWKS(t, old)
	v := newVerifier(f, time.Nanosecond)

	if _, err := v.Verify(context.Background(), old.token(t, defaultOpts())); err != nil {
		t.Fatalf("old: %v", err)
	}
	hits := f.hits.Load()

	f.setKeys(t, old, rotated)
	if _, err := v.Verify(context.Background(), rotated.token(t, defaultOpts())); err != nil {
		t.Fatalf("rotated: %v", err)
	}
	if f.hits.Load() <= hits {
		t.Fatal("expected JWKS refresh on unknown kid")
	}
}

func TestVerifyKeysAreCached(t *testing.T) {
	s := newSigner(t, "kid-1")
	f := newFakeJWKS(t, s)
	v := newVerifier(f, time.Minute)
	for i := 0; i < 3; i++ {
		if _, err := v.Verify(context.Background(), s.token(t, defaultOpts())); err != nil {
			t.Fatal(err)
		}
	}
	if got := f.hits.Load(); got != 1 {
		t.Fatalf("jwks hits = %d, want 1", got)
	}
}

func TestVerifyUnknownKidRespectsCooldown(t *testing.T) {
	known := newSigner(t, "kid-1")
	unknown := newSigner(t, "kid-x")
	f := newFakeJWKS(t, known)
	v := newVerifier(f, time.Minute)
	_, _ = v.Verify(context.Background(), known.token(t, defaultOpts()))
	for i := 0; i < 5; i++ {
		if _, err := v.Verify(context.Background(), unknown.token(t, defaultOpts())); !errors.Is(err, domain.ErrUnauthorized) {
			t.Fatalf("got %v", err)
		}
	}
	if got := f.hits.Load(); got != 1 {
		t.Fatalf("jwks hits = %d, want 1 (cooldown should block refresh storms)", got)
	}
}

func TestVerifyJWKSUnavailable(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		http.Error(w, "down", http.StatusInternalServerError)
	}))
	defer srv.Close()
	v := keycloak.NewVerifier(keycloak.Config{Issuer: issuer, JWKSURL: srv.URL, Audience: audience, Timeout: time.Second})
	s := newSigner(t, "kid-1")
	_, err := v.Verify(context.Background(), s.token(t, defaultOpts()))
	if !errors.Is(err, domain.ErrUnauthorized) {
		t.Fatalf("got %v", err)
	}
}

func TestVerifyJWKSTimeout(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		select {
		case <-r.Context().Done():
		case <-time.After(2 * time.Second):
		}
	}))
	defer srv.Close()
	v := keycloak.NewVerifier(keycloak.Config{Issuer: issuer, JWKSURL: srv.URL, Audience: audience, Timeout: 100 * time.Millisecond})
	s := newSigner(t, "kid-1")
	start := time.Now()
	_, err := v.Verify(context.Background(), s.token(t, defaultOpts()))
	if !errors.Is(err, domain.ErrUnauthorized) {
		t.Fatalf("got %v", err)
	}
	if time.Since(start) > time.Second {
		t.Fatal("timeout not honoured")
	}
}
