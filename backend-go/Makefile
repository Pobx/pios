.PHONY: build test test-unit test-api-mock test-api-integration vet lint docker run

build:
	CGO_ENABLED=0 go build -trimpath -o bin/api ./cmd/api

test:
	go test ./... -race -cover

test-unit:
	go test -short ./internal/domain/... ./internal/app/... ./internal/adapter/out/... ./pkg/... -race -cover

test-api-mock:
	go test -short -v ./internal/adapter/in/http -run "TestAPIMock|TestHealthzAndReadyz|TestMeEndpoint|TestOrganizationsEndpoint|TestCORSHeaders" -race -cover

test-api-integration:
	go test -v ./internal/adapter/in/http ./internal/adapter/out/postgres -run "Integration" -race -cover

vet:
	go vet ./...

docker:
	docker build -t otp-backend:local .

run:
	go run ./cmd/api
