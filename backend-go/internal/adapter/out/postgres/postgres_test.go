package postgres_test

import (
	"context"
	"errors"
	"os"
	"testing"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"

	"github.com/otp2025/backend-go/internal/adapter/out/postgres"
	"github.com/otp2025/backend-go/internal/domain"
)

type fakeRow struct {
	org domain.Organization
	err error
}

func (r fakeRow) Scan(dest ...any) error {
	if r.err != nil {
		return r.err
	}
	*(dest[0].(*int64)) = r.org.ID
	*(dest[1].(*string)) = r.org.Code
	*(dest[2].(*string)) = r.org.Name
	*(dest[3].(*int64)) = r.org.TypeID
	return nil
}

type fakeRows struct {
	pgx.Rows
	orgs    []domain.Organization
	idx     int
	scanErr error
	rowsErr error
}

func (r *fakeRows) Close()          {}
func (r *fakeRows) Err() error      { return r.rowsErr }
func (r *fakeRows) CommandTag() pgconn.CommandTag { return pgconn.CommandTag{} }

func (r *fakeRows) Next() bool {
	if r.idx >= len(r.orgs) {
		return false
	}
	r.idx++
	return true
}

func (r *fakeRows) Scan(dest ...any) error {
	if r.scanErr != nil {
		return r.scanErr
	}
	return fakeRow{org: r.orgs[r.idx-1]}.Scan(dest...)
}

type fakeDB struct {
	orgs     []domain.Organization
	byID     map[int64]domain.Organization
	queryErr error
	scanErr  error
	rowsErr  error
	pingErr  error
}

func (f *fakeDB) Ping(context.Context) error { return f.pingErr }

func (f *fakeDB) Query(context.Context, string, ...any) (pgx.Rows, error) {
	if f.queryErr != nil {
		return nil, f.queryErr
	}
	return &fakeRows{orgs: f.orgs, scanErr: f.scanErr, rowsErr: f.rowsErr}, nil
}

func (f *fakeDB) QueryRow(_ context.Context, _ string, args ...any) pgx.Row {
	if f.queryErr != nil {
		return fakeRow{err: f.queryErr}
	}
	id := args[0].(int64)
	org, ok := f.byID[id]
	if !ok {
		return fakeRow{err: pgx.ErrNoRows}
	}
	return fakeRow{org: org}
}

func TestStoreList(t *testing.T) {
	db := &fakeDB{orgs: []domain.Organization{
		{ID: 1, Code: "HSG1", Name: "Houey Sai", TypeID: 2},
		{ID: 2, Code: "TNG1", Name: "Tha Ngon", TypeID: 1},
	}}
	store := postgres.NewStore(db)
	got, err := store.List(context.Background())
	if err != nil {
		t.Fatalf("unexpected err: %v", err)
	}
	if len(got) != 2 || got[0].Code != "HSG1" || got[1].Code != "TNG1" {
		t.Fatalf("unexpected orgs: %+v", got)
	}
}

func TestStoreListErrors(t *testing.T) {
	boom := errors.New("db error")
	for _, tc := range []struct {
		name string
		db   *fakeDB
	}{
		{"query error", &fakeDB{queryErr: boom}},
		{"scan error", &fakeDB{orgs: []domain.Organization{{ID: 1}}, scanErr: boom}},
		{"rows error", &fakeDB{orgs: []domain.Organization{{ID: 1}}, rowsErr: boom}},
	} {
		t.Run(tc.name, func(t *testing.T) {
			if _, err := postgres.NewStore(tc.db).List(context.Background()); !errors.Is(err, boom) {
				t.Fatalf("got %v, want %v", err, boom)
			}
		})
	}
}

func TestStoreGetByID(t *testing.T) {
	db := &fakeDB{byID: map[int64]domain.Organization{
		1: {ID: 1, Code: "HSG1", Name: "Houey Sai", TypeID: 2},
	}}
	store := postgres.NewStore(db)

	got, err := store.GetByID(context.Background(), 1)
	if err != nil {
		t.Fatalf("unexpected err: %v", err)
	}
	if got.ID != 1 || got.Code != "HSG1" || got.Name != "Houey Sai" || got.TypeID != 2 {
		t.Fatalf("unexpected org: %+v", got)
	}

	_, err = store.GetByID(context.Background(), 99)
	if !errors.Is(err, domain.ErrNotFound) {
		t.Fatalf("got %v, want ErrNotFound", err)
	}

	boom := errors.New("conn lost")
	db.queryErr = boom
	_, err = store.GetByID(context.Background(), 1)
	if !errors.Is(err, boom) {
		t.Fatalf("got %v, want %v", err, boom)
	}
}

func TestStorePing(t *testing.T) {
	db := &fakeDB{}
	store := postgres.NewStore(db)
	if err := store.Ping(context.Background()); err != nil {
		t.Fatalf("unexpected err: %v", err)
	}
	boom := errors.New("down")
	db.pingErr = boom
	if err := store.Ping(context.Background()); !errors.Is(err, boom) {
		t.Fatalf("got %v, want %v", err, boom)
	}
}

func TestNewPoolInvalidDSN(t *testing.T) {
	if _, err := postgres.NewPool(context.Background(), "://bad-dsn"); err == nil {
		t.Fatal("expected error for invalid DSN")
	}
}

func TestStoreIntegration(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping postgres integration test in -short mode")
	}
	dsn := os.Getenv("TEST_DATABASE_URL")
	if dsn == "" {
		dsn = "postgres://otp:otp_dev_password@127.0.0.1:5432/otp?sslmode=disable"
	}
	ctx := context.Background()
	pool, err := postgres.NewPool(ctx, dsn)
	if err != nil {
		t.Fatalf("new pool: %v", err)
	}
	defer pool.Close()

	store := postgres.NewStore(pool)
	if err := store.Ping(ctx); err != nil {
		t.Fatalf("ping: %v", err)
	}
	orgs, err := store.List(ctx)
	if err != nil {
		t.Fatalf("list: %v", err)
	}
	if len(orgs) > 0 {
		got, err := store.GetByID(ctx, orgs[0].ID)
		if err != nil {
			t.Fatalf("get by id: %v", err)
		}
		if got.ID != orgs[0].ID {
			t.Fatalf("got ID %d, want %d", got.ID, orgs[0].ID)
		}
	}
	if _, err := store.GetByID(ctx, -999999); !errors.Is(err, domain.ErrNotFound) {
		t.Fatalf("want ErrNotFound, got %v", err)
	}
}
