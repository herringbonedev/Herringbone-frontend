# Herringbone Frontend

This repository contains the Herringbone Operations Center UI.

It is a React + TypeScript application built with Vite. It runs locally
for development and is deployed as static assets behind NGINX in
Kubernetes.

The UI talks to Herringbone backend services over HTTP and assumes a
working auth service issuing JWTs.

## What This Repo Is

This repo is the operational UI for:

-   Service account management
-   Authentication flows
-   Search
-   Incidents
-   Rule management
-   Parser card management
-   Dashboards
-   Log inspection

Everything here exists to operate Herringbone.

## High-Level Architecture

Browser │ │ JWT ▼ Operations Center (React + Vite build) │ ├── /auth ├──
/search ├── /units/\* ├── /dashboards │ ▼ Herringbone API Services ├──
auth ├── search ├── detectionengine ├── parser ├── incidents └──
logingestion

The frontend is intentionally thin. Most business logic belongs in
backend services.

## Repository Structure

operations-center/ │ ├── src/ │ ├── App.tsx │ ├── main.tsx │ ├──
router.tsx │ │ │ ├── auth/ │ │ ├── LoginPage.tsx │ │ ├──
ServiceAccountsPage.tsx │ │ ├── RequireAuth.tsx │ │ ├── useAuth.ts │ │
└── **test**/ │ │ │ ├── search/ │ ├── dashboards/ │ └── units/ │ ├──
detectionengine/ │ ├── incidents/ │ ├── logingestion/ │ └── parser/ │
├── docker/ │ ├── Dockerfile │ ├── docker-compose.yml │ └── nginx.conf │
├── vitest.config.ts ├── vite.config.ts └── Makefile

All frontend code lives under operations-center/src.

Tests live next to their features under **test**/.

## Local Development

Requirements:

-   Node 18+
-   npm

Install:

cd operations-center npm install

Run dev server:

npm run dev

Build:

npm run build

Preview production build:

npm run preview

## Testing

Vitest + Testing Library are used.

Run tests:

npm run test

Run with coverage:

npm run test -- --coverage

Coverage thresholds are enforced in CI.

If you add a page or hook, you are expected to add tests.

## Docker

Production image serves static build through NGINX.

Build:

cd operations-center docker build -t herringbone-operations-center .

Local container test:

docker compose up

NGINX config lives in docker/nginx.conf.

## Kubernetes

Kubernetes manifests are in:

kustomization/operations-center/

The frontend is deployed as:

-   Deployment
-   Service

It expects backend services to already exist in-cluster.

## Authentication

Auth is JWT-based.

Flow:

LoginPage ↓ JWT stored in localStorage ↓ RequireAuth route guard ↓ API
calls include Authorization: Bearer `<token>`{=html}

Auth code lives in:

src/auth/

If auth changes in the backend, frontend must match claim structure.

## Adding a New Page

Minimum expectations:

1.  Page component under appropriate domain folder
2.  Hook for API calls
3.  Route registration in router.tsx
4.  Tests under **test**/
5.  Coverage maintained above threshold

Pattern:

FeaturePage.tsx useFeatureApi.ts **test**/FeaturePage.test.tsx

Keep logic in hooks where possible. Keep components mostly declarative.

## Design Philosophy

-   No heavy state libraries
-   No unnecessary abstraction
-   Hooks for API
-   Explicit state
-   Deterministic UI
-   Backend owns real logic

If something becomes hard to test, the design is probably wrong.

## CI

There is a required workflow that:

-   Runs on changes to operations-center
-   Executes tests
-   Enforces coverage
-   Auto-passes for unrelated changes

If coverage drops, the check fails.
