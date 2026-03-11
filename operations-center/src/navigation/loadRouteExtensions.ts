import type { RouteObject } from "react-router-dom"

type RouteModule = {
  enterpriseRoutes?: RouteObject[]
  pluginRoutes?: RouteObject[]
}

export async function loadRouteExtensions(): Promise<RouteObject[]> {
  let routes: RouteObject[] = []

  const enterpriseModules = import.meta.glob("../enterprise/*.{ts,tsx}", {
    eager: true,
  })

  for (const mod of Object.values(enterpriseModules) as RouteModule[]) {
    if (mod.enterpriseRoutes) {
      routes = routes.concat(mod.enterpriseRoutes)
    }
  }

  const pluginModules = import.meta.glob("../plugins/*.{ts,tsx}", {
    eager: true,
  })

  for (const mod of Object.values(pluginModules) as RouteModule[]) {
    if (mod.pluginRoutes) {
      routes = routes.concat(mod.pluginRoutes)
    }
  }

  return routes
}