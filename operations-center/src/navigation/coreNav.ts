import type { NavItem } from "./types"

export const coreNav: NavItem[] = [
  { label: "Home", path: "/", order: 10 },
  { label: "Log Ingestion", path: "/logingestion", order: 20 },
  { label: "CardSet", path: "/cardset", order: 30 },
  { label: "RuleSet", path: "/ruleset", order: 40 },
  { label: "Incidents", path: "/incidents", order: 50 },
  { label: "Search", path: "/search", order: 60 },
  { label: "Teams", path: "/teams", order: 70 },
  { label: "Services", path: "/services", order: 80 },
]