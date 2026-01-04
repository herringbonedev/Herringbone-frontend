import { createBrowserRouter } from "react-router-dom"
import App from "./App"

import Dashboard from "./dashboards/index/Dashboard"
import EventsPage from "./units/logingestion/events/EventsPage"
import CardSetPage from "./units/parser/cardset/CardSetPage"
import RuleSetPage from "./units/detectionengine/ruleset/RuleSetPage"
import IncidentListPage from "./units/incidents/incidentset/IncidentListPage"
import IncidentDetailPage from "./units/incidents/incidentset/IncidentDetailPage"

export const router = createBrowserRouter([
	{
		path: "/",
		element: <App />,
		children: [
			{ index: true, element: <Dashboard /> },
			{ path: "logingestion", element: <EventsPage /> },
			{ path: "cardset", element: <CardSetPage /> },
			{ path: "ruleset", element: <RuleSetPage /> },

			// Incidents
			{ path: "incidents", element: <IncidentListPage /> },
			{ path: "incidents/:id", element: <IncidentDetailPage /> },
		],
	},
])
