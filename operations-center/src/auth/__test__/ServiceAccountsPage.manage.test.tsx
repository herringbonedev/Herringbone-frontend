import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { describe, test, expect, vi, beforeEach } from "vitest"

beforeEach(() => {
  localStorage.clear()
  localStorage.setItem("hb_token", "test-token")
  vi.resetModules()
})

describe("manage scopes", () => {
  test("adds and removes scopes", async () => {
    vi.doMock("../jwt", () => ({
      getUserFromToken: () => ({ role: "admin" }),
    }))

    globalThis.fetch = vi.fn((url: RequestInfo | URL) => {
      const u = String(url)

      if (u.includes("/services") && !u.includes("scopes")) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              services: [
                {
                  id: "1",
                  service_name: "svc",
                  service_id: "abc",
                  scopes: ["auth:read"],
                  enabled: true,
                  created_at: null,
                },
              ],
            }),
        } as Response)
      }

      if (u.includes("/scopes")) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              scopes: [
                { scope: "auth:read", tier: "free" },
                { scope: "auth:write", tier: "enterprise" },
              ],
            }),
        } as Response)
      }

      return Promise.resolve({ ok: true } as Response)
    }) as unknown as typeof fetch

    const { default: Page } = await import("../ServiceAccountsPage")
    render(<Page />)

    await waitFor(() =>
      expect(screen.getByText("svc")).toBeInTheDocument()
    )

    fireEvent.click(screen.getByText("Manage"))

    fireEvent.click(screen.getByText("Save scopes"))

    await waitFor(() =>
      expect(globalThis.fetch).toHaveBeenCalled()
    )
  })
})
