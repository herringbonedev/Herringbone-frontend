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

export const router = createBrowserRouter([
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
    children: [
      { index: true, element: <Dashboard /> },
      { path: "logingestion", element: <EventsPage /> },
      { path: "cardset", element: <CardSetPage /> },
      { path: "ruleset", element: <RuleSetPage /> },
      { path: "incidents", element: <IncidentListPage /> },
      { path: "incidents/:incidentId", element: <IncidentDetailPage /> },
      { path: "search", element: <SearchPage /> },
    ],
  },
])
