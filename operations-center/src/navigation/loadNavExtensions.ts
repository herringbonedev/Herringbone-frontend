import type { NavItem } from "./types"

type EnterpriseModule = {
  enterpriseNav?: NavItem[]
}

type PluginModule = {
  pluginNav?: NavItem[]
}

export async function loadNavExtensions(): Promise<NavItem[]> {
  let items: NavItem[] = []

  const enterprise = (await import("../enterprise/navigation").catch(
    () => null
  )) as EnterpriseModule | null

  if (enterprise?.enterpriseNav) {
    items = items.concat(enterprise.enterpriseNav)
  }

  const plugins = (await import("../plugins/navigation").catch(
    () => null
  )) as PluginModule | null

  if (plugins?.pluginNav) {
    items = items.concat(plugins.pluginNav)
  }

  return items
}