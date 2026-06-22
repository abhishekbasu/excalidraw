# Basudraw — convenience tasks.
#
# Override variables on the command line, e.g.:
#   make deploy DROPLET=root@203.0.113.10 DOMAIN=draw.example.com
#
# Local dev needs Node 18+ and yarn. Hosting needs only Docker on the target box:
# the static site is built here (or in CI) and shipped — never built on the box.

DROPLET    ?=
DOMAIN     ?=
REMOTE_DIR ?= ~/basudraw
COMPOSE    := docker compose -f docker-compose.prod.yml

.DEFAULT_GOAL := help

.PHONY: help install dev build preview clean lint typecheck test \
        up down restart logs ps deploy ssh

help: ## Show this help
	@echo "Basudraw — make targets:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) \
	  | awk 'BEGIN{FS=":.*?## "}{printf "  \033[36m%-12s\033[0m %s\n", $$1, $$2}'

# --- local development -------------------------------------------------------

install: ## Install dependencies
	yarn install

dev: ## Run the local dev server with hot reload
	yarn start

build: ## Build the static app into excalidraw-app/build
	yarn build:app

preview: build ## Build, then serve the production bundle locally on :5000
	npx -y serve -s excalidraw-app/build -l 5000

clean: ## Remove build artifacts
	rm -rf excalidraw-app/build

lint: ## Auto-fix formatting and lint
	yarn fix

typecheck: ## Type-check the project
	yarn test:typecheck

test: ## Run the test suite
	yarn test:update

# --- production stack (single Caddy container serving the static build) -------

up: build ## Build + serve the static site via Caddy (set DOMAIN for HTTPS)
	DOMAIN='$(DOMAIN)' $(COMPOSE) up -d --remove-orphans

down: ## Stop the Caddy stack
	$(COMPOSE) down

restart: down up ## Restart the Caddy stack

logs: ## Tail Caddy logs
	$(COMPOSE) logs -f

ps: ## Show stack status
	$(COMPOSE) ps

# --- deploy to a DigitalOcean Droplet ---------------------------------------
# Builds the static site HERE and ships only ./excalidraw-app/build + the
# compose/Caddy config. The Droplet just runs Caddy — no Node, no build, tiny RAM.

deploy: build ## Build locally + ship the static site to DROPLET. Requires DROPLET= (DOMAIN= for HTTPS)
	@test -n "$(DROPLET)" || { echo "ERROR: set DROPLET=user@host (e.g. root@203.0.113.10)"; exit 1; }
	ssh $(DROPLET) "mkdir -p $(REMOTE_DIR)/excalidraw-app/build"
	@echo ">> syncing static build to $(DROPLET):$(REMOTE_DIR)"
	rsync -az --delete excalidraw-app/build/ $(DROPLET):$(REMOTE_DIR)/excalidraw-app/build/
	scp docker-compose.prod.yml Caddyfile $(DROPLET):$(REMOTE_DIR)/
	@echo ">> starting Caddy on the Droplet"
	ssh $(DROPLET) "cd $(REMOTE_DIR) && DOMAIN='$(DOMAIN)' docker compose -f docker-compose.prod.yml up -d --remove-orphans"
	@echo ">> done. Visit https://$(DOMAIN) (or http://<droplet-ip> if no DOMAIN set)."

ssh: ## SSH into the Droplet (requires DROPLET=)
	@test -n "$(DROPLET)" || { echo "ERROR: set DROPLET=user@host"; exit 1; }
	ssh $(DROPLET)
