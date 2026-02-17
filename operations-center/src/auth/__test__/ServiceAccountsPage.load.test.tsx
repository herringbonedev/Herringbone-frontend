import { render, screen, waitFor } from "@testing-library/react"
import { describe, test, expect, vi, beforeEach } from "vitest"

beforeEach(() => {
  localStorage.clear()
  localStorage.setItem("hb_token", "test-token")
  vi.resetModules()
})

describe("ServiceAccountsPage service loading", () => {
  test("loads and displays services", async () => {
    vi.doMock("../jwt", () => ({
      getUserFromToken: () => ({ role: "admin" }),
    }))

    globalThis.fetch = vi.fn((url: RequestInfo | URL) => {
      const u = String(url)

      if (u.includes("/services")) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              services: [
                {
                  id: "1",
                  service_name: "test-service",
                  service_id: "abc",
                  scopes: ["auth:read"],
                  enabled: true,
                  created_at: "2024-01-01T00:00:00Z",
                },
              ],
            }),
        } as Response)
      }

      if (u.includes("/scopes")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ scopes: [] }),
        } as Response)
      }

      return Promise.reject(new Error("unknown route"))
    }) as unknown as typeof fetch

    const { default: Page } = await import("../ServiceAccountsPage")

    render(<Page />)

    await waitFor(() =>
      expect(screen.getByText("test-service")).toBeInTheDocument()
    )
  })
})
