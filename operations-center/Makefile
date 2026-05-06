COMPOSE = docker compose -f docker/docker-compose.yml
SERVICE = operations-center

.PHONY: up down rebuild logs shell test fmt lint

up:
	$(COMPOSE) up -d

down:
	$(COMPOSE) down -v

rebuild:
	$(COMPOSE) build --no-cache

logs:
	$(COMPOSE) logs -f $(SERVICE)

shell:
	$(COMPOSE) exec $(SERVICE) sh

test:
	$(COMPOSE) exec $(SERVICE) npm run test

fmt:
	$(COMPOSE) exec $(SERVICE) npm run fmt

lint:
	$(COMPOSE) exec $(SERVICE) npm run lint