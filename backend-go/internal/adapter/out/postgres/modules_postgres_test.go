package postgres_test

import (
	"context"
	"os"
	"testing"

	"github.com/otp2025/backend-go/internal/adapter/out/postgres"
)

func TestStoreModulesIntegration(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping postgres modules integration test in -short mode")
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
	org1 := int64(1)

	t.Run("Wave 1.5: ListUsers and ListZones against live migrated PostgreSQL", func(t *testing.T) {
		users, err := store.ListUsers(ctx, &org1, "", 10, 0)
		if err != nil {
			t.Fatalf("ListUsers: %v", err)
		}
		if len(users) == 0 {
			t.Fatalf("expected users in org 1 from migrated DB")
		}

		zones, err := store.ListZones(ctx, &org1)
		if err != nil {
			t.Fatalf("ListZones: %v", err)
		}
		if len(zones) == 0 {
			t.Fatalf("expected zones in org 1 from migrated DB")
		}
	})

	t.Run("Wave 2: ListItems and ListTransactions against live migrated PostgreSQL", func(t *testing.T) {
		items, err := store.ListItems(ctx, nil)
		if err != nil {
			t.Fatalf("ListItems: %v", err)
		}
		if len(items) == 0 {
			t.Fatalf("expected inventory items from migrated DB")
		}

		txs, err := store.ListTransactions(ctx, nil)
		if err != nil {
			t.Fatalf("ListTransactions: %v", err)
		}
		if len(txs) == 0 {
			t.Fatalf("expected inventory transactions from migrated DB")
		}
	})

	t.Run("Wave 3: FoodWaste GetSummary against live migrated PostgreSQL", func(t *testing.T) {
		summary, err := store.GetSummary(ctx, nil)
		if err != nil {
			t.Fatalf("GetSummary: %v", err)
		}
		if summary.TotalBatches == 0 || len(summary.EmissionFactors) == 0 {
			t.Fatalf("expected compost batches and emission factors in migrated DB, got %+v", summary)
		}
	})

	t.Run("Wave 4: KeptKaya ListRecycleItems against live migrated PostgreSQL", func(t *testing.T) {
		items, err := store.ListRecycleItems(ctx, nil)
		if err != nil {
			t.Fatalf("ListRecycleItems: %v", err)
		}
		if len(items) == 0 {
			t.Fatalf("expected recycle bank items in migrated DB")
		}
	})

	t.Run("Wave 5: Tabwater ListMeters and ListInvoices against live migrated PostgreSQL", func(t *testing.T) {
		meters, err := store.ListMeters(ctx, &org1, 10, 0)
		if err != nil {
			t.Fatalf("ListMeters: %v", err)
		}
		if len(meters) == 0 {
			t.Fatalf("expected water meters in org 1 from migrated DB")
		}

		invoices, err := store.ListInvoices(ctx, &org1, "", 10, 0)
		if err != nil {
			t.Fatalf("ListInvoices: %v", err)
		}
		if len(invoices) == 0 {
			t.Fatalf("expected water invoices in org 1 from migrated DB")
		}
	})
}
