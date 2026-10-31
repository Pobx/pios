FROM golang:1.27-alpine AS build
WORKDIR /src

COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -trimpath -ldflags="-s -w" -o /out/api ./cmd/api

FROM alpine:latest
RUN apk --no-cache add ca-certificates && \
    addgroup -S -g 10001 app && \
    adduser -S -u 10001 -G app app

COPY --from=build /out/api /usr/local/bin/api

USER 10001:10001
EXPOSE 8080
ENTRYPOINT ["/usr/local/bin/api"]
