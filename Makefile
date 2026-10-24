.PHONY: test test-unit test-api-mock test-api-integration test-e2e-mock

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
