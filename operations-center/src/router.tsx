import { createBrowserRouter } from "react-router-dom"
import App from "./App"

import Dashboard from "./dashboards/index/Dashboard"
import EventsPage from "./units/logingestion/events/EventsPage"
import CardSetPage from "./units/parser/cardset/CardSetPage"
import RuleSetPage from "./units/detectionengine/ruleset/RuleSetPage"
import IncidentListPage from "./units/incidents/incidentset/IncidentListPage"
import IncidentDetailPage from "./units/incidents/incidentset/IncidentDetailPage"
import SearchPage from "./search/SearchPage"
import LoginPage from "./auth/LoginPage"
import RequireAuth from "./auth/RequireAuth"
import UserProfilePage from "./auth/UserProfilePage"
import TeamsPage from "./auth/TeamsPage"
import ServiceAccountsPage from "./auth/ServiceAccountsPage"

import type { RouteObject } from "react-router-dom"

// core routes
const coreRoutes: RouteObject[] = [
  { index: true, element: <Dashboard /> },
  { path: "logingestion", element: <EventsPage /> },
  { path: "cardset", element: <CardSetPage /> },
  { path: "ruleset", element: <RuleSetPage /> },
  { path: "incidents", element: <IncidentListPage /> },
  { path: "incidents/:incidentId", element: <IncidentDetailPage /> },
  { path: "search", element: <SearchPage /> },
  { path: "profile", element: <UserProfilePage /> },
  { path: "teams", element: <TeamsPage /> },
  { path: "services", element: <ServiceAccountsPage /> },
]

// optional enterprise routes
async function loadEnterpriseRoutes(): Promise<RouteObject[]> {
  try {
    // @ts-ignore
    const mod = await import("./enterprise/routes")
    return mod.enterpriseRoutes || []
  } catch {
    return []
  }
}

export async function createRouter() {
  const enterpriseRoutes = await loadEnterpriseRoutes()

  return createBrowserRouter([
    {
      path: "/login",
      element: <LoginPage />,
    },
    {
      path: "/",
      element: (
        <RequireAuth>
          <App />
        </RequireAuth>
      ),
      children: [...coreRoutes, ...enterpriseRoutes],
    },
  ])
}