.PHONY: up down rebuild logs shell test fmt lint

up:
	docker compose -f docker/docker-compose.yml up -d

down:
	docker compose -f docker/docker-compose.yml down -v

rebuild:
	docker compose -f docker/docker-compose.yml build --no-cache

logs:
	docker compose -f docker/docker-compose.yml logs -f operations-center

shell:
	docker compose -f docker/docker-compose.yml exec operations-center sh

test:
	docker compose -f docker/docker-compose.yml exec operations-center npm test || true

fmt:
	docker compose -f docker/docker-compose.yml exec operations-center npm run fmt || true

lint:
	docker compose -f docker/docker-compose.yml exec operations-center npm run lint || true