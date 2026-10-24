COMPOSE := docker compose -f docker-compose.yml

.PHONY: help config up up-infra down reset logs ps k8s-validate verify-keycloak

help: ## Show available targets
	@grep -E '^[a-zA-Z0-9_-]+:.*?## ' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  %-18s %s\n", $$1, $$2}'

config: ## Validate docker-compose.yml syntax
	$(COMPOSE) config -q

up: ## Start all local services (postgres, keycloak, backend, frontend, nginx)
	$(COMPOSE) up -d --build

up-infra: ## Start only infrastructure services (postgres, keycloak)
	$(COMPOSE) up -d postgres keycloak

down: ## Stop all containers (preserves database volume)
	$(COMPOSE) down

reset: ## Stop all containers and wipe volumes (forces DB init + Keycloak realm re-import)
	$(COMPOSE) down -v

logs: ## Tail container logs
	$(COMPOSE) logs -f

ps: ## List container status
	$(COMPOSE) ps

verify-keycloak: ## Obtain a dev token for admin1 from Keycloak and print decoded JWT claims
	@curl -fsS -X POST "http://localhost:8081/realms/otp/protocol/openid-connect/token" \
		-d "client_id=otp-cli-test" \
		-d "grant_type=password" \
		-d "username=admin1" \
		-d "password=admin1" \
	| python3 -c "import sys,json,base64; t=json.load(sys.stdin)['access_token'].split('.')[1]; print(json.dumps(json.loads(base64.urlsafe_b64decode(t+'===')), indent=2))"

k8s-validate: ## Dry-run validate all Kubernetes manifests in k8s/
	kubectl apply --dry-run=client --validate=false -f k8s/
