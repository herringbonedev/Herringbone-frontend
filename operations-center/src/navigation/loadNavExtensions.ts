import type { NavItem } from "./types"

export async function loadNavExtensions(): Promise<NavItem[]> {
  let items: NavItem[] = []

  try {
    // @ts-ignore
    const mod = await import("../enterprise/navigation")
    items = items.concat(mod.enterpriseNav || [])
  } catch {}

  try {
    // @ts-ignore
    const mod = await import("../plugins/navigation")
    items = items.concat(mod.pluginNav || [])
  } catch {}

  return items
}