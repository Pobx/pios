.PHONY: build test vet lint docker run

build:
	CGO_ENABLED=0 go build -trimpath -o bin/api ./cmd/api

test:
	go test ./... -race -cover

vet:
	go vet ./...

docker:
	docker build -t otp-backend:local .

run:
	go run ./cmd/api
