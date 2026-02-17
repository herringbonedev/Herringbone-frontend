# Herringbone Frontend QA Guide

This document is intended to help an experienced QA engineer quickly
understand the Herringbone Operations Center frontend, begin exploratory
testing, and contribute meaningful automated test coverage.

The frontend lives in:

    Herringbone-frontend/operations-center

It is a Vite + React + TypeScript application with Vitest + Testing
Library for unit and component testing.

## 1. Project Structure Overview

High‑level structure (node_modules excluded):

    operations-center
    ├── docker/
    ├── public/
    ├── src/
    │   ├── App.tsx
    │   ├── main.tsx
    │   ├── router.tsx
    │   ├── auth/
    │   ├── dashboards/
    │   ├── search/
    │   └── units/
    ├── vite.config.ts
    ├── vitest.config.ts
    └── Makefile

### Source Layout

  Path             Purpose
  ---------------- -------------------------------------------------------
  src/auth         Authentication, service accounts, teams, user profile
  src/dashboards   Dashboard and metrics components
  src/search       Log search UI, filter builder, JSON viewer
  src/units        Feature UIs grouped by backend "Unit"
  src/router.tsx   Route definitions
  src/main.tsx     Application entry point

### Units Directory

    src/units
    ├── detectionengine/ruleset
    ├── incidents/incidentset
    ├── logingestion/events
    └── parser/cardset

Each unit mirrors backend architecture. This is important for QA
traceability.

  Unit                      Frontend Responsibility
  ------------------------- -----------------------------------
  detectionengine/ruleset   Rule authoring and testing
  incidents/incidentset     Incident list and detail views
  logingestion/events       Raw event viewing
  parser/cardset            Parser card authoring and testing

## 2. Test Structure

Tests currently exist primarily under:

    src/auth/__test__/

Vitest + Testing Library is used.

Example test categories already present:

  Category             Example
  -------------------- -----------------------------------
  Load / fetch flows   ServiceAccountsPage.load.test.tsx
  Auth gating          ServiceAccountsPage.auth.test.tsx
  Branch logic         delete.cancel, manage.apply
  Error handling       create.error
  Helper functions     misc

Run tests:

    npm run test

Coverage report is generated under:

    coverage/lcov-report/index.html

## 3. Architectural Flow (Frontend)

Basic data flow pattern:

    User Interaction
            │
            ▼
    Component State (useState)
            │
            ▼
    API Hook (useXApi.ts)
            │
            ▼
    fetch()
            │
            ▼
    Backend Service

Mermaid representation:

``` mermaid
flowchart LR
    UI[React Component] --> State[Local State]
    State --> API[useXApi Hook]
    API --> Fetch[fetch()]
    Fetch --> Backend[Herringbone Backend Service]
```

## 4. QA Focus Areas

### A. Auth Boundary Testing

-   Missing token
-   Expired token
-   Role mismatch (admin vs non-admin)
-   Route protection via RequireAuth

### B. State Transition Coverage

For each page:

  Action            Expected Result
  ----------------- -------------------------------
  Initial load      Loading state then data
  API failure       Error state rendered
  Empty data        Empty UI state
  Mutation action   Optimistic or refreshed state

### C. Edge Cases

-   Double click actions
-   Cancel flows
-   Form clearing
-   Dropdown open/close cycles
-   Scope selection add/remove behavior
-   Null created_at handling
-   Disabled button states

### D. API Contract Testing

Where possible, mock:

-   Success responses
-   Non-200 responses
-   Malformed payloads
-   Missing fields

Ensure UI does not crash on unexpected shapes.

## 5. Developing New Tests

When adding tests:

1.  Place tests adjacent to feature folder if possible.
2.  Use descriptive filenames:
    -   FeatureName.load.test.tsx
    -   FeatureName.error.test.tsx
    -   FeatureName.branch.test.tsx
3.  Mock fetch via vi.fn.
4.  Avoid testing implementation details.
5.  Prefer user interaction via userEvent.

Pattern example:

    render(<Component />)
    await waitFor(() => expect(...))
    await user.click(...)
    expect(...)

### Coverage Strategy

Target:

  Metric       Goal
  ------------ ------
  Statements   85%+
  Functions    80%+
  Branches     70%+

Focus especially on:

-   Conditional rendering branches
-   Error paths
-   Cancel flows
-   Disabled states

## 6. Manual Testing Checklist

Auth Pages - Login success/failure - Route blocking without token -
Admin-only actions

Service Accounts - Create - Delete confirm / cancel - Generate token
(table + manage panel) - Scope apply/remove - Clear form

Search - Basic search - Filter builder add/remove - JSON viewer
rendering

Ruleset - Create rule - Edit rule - Test rule - Save rule

Incidents - List loads - Detail loads - Missing data handling

Events - Pagination - Large payload rendering - Table sorting behavior

## 7. Risk Areas

  Area                    Risk
  ----------------------- -------------------------------
  Scope dropdown          Multiple identical text nodes
  Conditional UI blocks   Branch coverage gaps
  Token parsing           Unhandled null/invalid JWT
  Async effects           Missing act warnings
  Form state resets       Stale state leaks

## 8. Immediate Gaps

Current test coverage is strongest in auth/ServiceAccountsPage.

Gaps likely exist in:

-   dashboards/
-   search/
-   units/\*

Recommended next steps:

1.  Add load + error tests for each major page.
2.  Add one interaction test per primary action.
3.  Add branch coverage for empty states.
4.  Add negative tests for malformed API responses.

This document should be updated as frontend architecture evolves.