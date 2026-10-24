.PHONY: up down restart ps logs migrate-up verify test test-unit test-api-mock test-api-integration test-e2e-mock

COMPOSE_FILE := deploy/docker-compose.yml

up:
	docker compose -f $(COMPOSE_FILE) up -d --build

down:
	docker compose -f $(COMPOSE_FILE) down

restart:
	docker compose -f $(COMPOSE_FILE) restart

ps:
	docker compose -f $(COMPOSE_FILE) ps

logs:
	docker compose -f $(COMPOSE_FILE) logs -f

migrate-up:
	docker exec -i otp-postgres psql -U otp -d otp < backend-go/db/migrations/000001_baseline.up.sql
	docker exec -i otp-postgres psql -U otp -d otp < backend-go/db/migrations/000002_enable_rls.up.sql

verify:
	python3 tools/cutover/verify_integrity.py

test: test-unit test-api-mock test-api-integration test-e2e-mock

test-unit:
	$(MAKE) -C backend-go test-unit
	npm --prefix frontend-react run test:unit

test-api-mock:
	$(MAKE) -C backend-go test-api-mock
	npm --prefix frontend-react run test:api

test-api-integration:
	$(MAKE) -C backend-go test-api-integration

test-e2e-mock:
	npm --prefix frontend-react run test:e2e
