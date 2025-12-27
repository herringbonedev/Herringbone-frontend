import { createBrowserRouter } from "react-router-dom"
import App from "./App"
import EventsPage from "./units/logingestion/events/EventsPage"
import CardSetPage from "./units/parser/cardset/CardSetPage"
import RuleSetPage from "./units/detectionengine/ruleset/RuleSetPage"

export const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      {
        index: true,
        element: <div>Welcome to Herringbone</div>,
      },
      {
        path: "logingestion",
        element: <EventsPage />,
      },
      {
        path: "cardset",
        element: <CardSetPage />,
      },
      {
        path: "ruleset",
        element: <RuleSetPage />,
      },
    ],
  },
])
