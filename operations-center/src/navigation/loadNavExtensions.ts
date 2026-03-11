import type { NavItem } from "./types"

type NavModule = {
  enterpriseNav?: NavItem[]
  pluginNav?: NavItem[]
}

export async function loadNavExtensions(): Promise<NavItem[]> {
  let items: NavItem[] = []

  const enterpriseModules = import.meta.glob("../enterprise/*.{ts,tsx}", {
    eager: true,
  })

  for (const mod of Object.values(enterpriseModules) as NavModule[]) {
    if (mod.enterpriseNav) {
      items = items.concat(mod.enterpriseNav)
    }
  }

  const pluginModules = import.meta.glob("../plugins/*.{ts,tsx}", {
    eager: true,
  })

  for (const mod of Object.values(pluginModules) as NavModule[]) {
    if (mod.pluginNav) {
      items = items.concat(mod.pluginNav)
    }
  }

  return items
}