# Herringbone Frontend

This repository contains the **Herringbone Operations Center frontend**, a web-based UI for operating and observing the Herringbone platform.

The frontend is implemented as a modern **React + TypeScript** application, built with **Vite**, and designed to run both locally (for development) and in Kubernetes (for deployment alongside the backend services).

---

## Repository Structure

```text
Herringbone-frontend/
├── operations-center/        # Main frontend application
│   ├── src/                  # React / TypeScript source code
│   ├── docker/               # Docker + NGINX runtime assets
│   ├── Makefile              # Common build / run targets
│   ├── package.json          # Frontend dependencies
│   └── vite.config.ts        # Vite configuration
├── kustomization/
│   └── operations-center/    # Kubernetes manifests (deployment + service)
├── .github/workflows/        # CI workflows (build, test, push, sign)
└── LICENSE
```

---

## Operations Center

The **Operations Center** is the primary UI for interacting with Herringbone.

Key capabilities include:
- Authentication and user context handling
- Viewing and managing incidents
- Inspecting parsed and enriched data
- Interacting with detection and parser outputs
- Administrative and operational workflows

The frontend communicates with backend Herringbone APIs and expects authentication tokens issued by the Herringbone auth service.

---

## Prerequisites

For local development you will need:

- Node.js 18+
- npm (or compatible package manager)
- Docker (optional, for containerized runs)

---

## Local Development

All frontend development happens in the `operations-center/` directory.

### Install dependencies

```bash
cd operations-center
npm install
```

### Run the dev server

```bash
npm run dev
```

By default, Vite will start a local development server and hot-reload changes.

Backend API endpoints are configured via environment variables and/or Vite configuration.

---

## Building the Frontend

To produce a production build:

```bash
npm run build
```

This outputs static assets suitable for serving behind NGINX or another web server.

---

## Docker

A Dockerfile is provided for running the Operations Center as a container.

Build the image:

```bash
cd operations-center
docker build -t herringbone-operations-center .
```

A `docker-compose.yml` is also included for local container testing.

---

## Kubernetes Deployment

Kubernetes manifests are provided under:

```text
kustomization/operations-center/
```

These include:
- Deployment
- Service
- Kustomization file

They are intended to be used as part of a larger Herringbone deployment (for example via GitOps or Argo CD).

---

## CI / CD

GitHub Actions workflows are included to:

- Build the frontend
- Run tests
- Build and push container images
- Sign images

These workflows are designed to integrate with the broader Herringbone release pipeline.

---

## Authentication Model

The Operations Center relies on:
- JWT-based authentication
- Tokens issued by the Herringbone auth service
- Client-side token storage and enforcement via route guards

Auth-related components live under:

```text
operations-center/src/auth/
```

---

## Relationship to the Backend

This repository contains **only frontend code**.

It is designed to work alongside:
- The main Herringbone backend repository
- The `hbctl` control-plane CLI (for local orchestration)

The frontend does not start or manage backend services directly.

---

## License

See the `LICENSE` file for licensing information.
