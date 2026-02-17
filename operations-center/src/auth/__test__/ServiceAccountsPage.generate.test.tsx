import { render, screen, waitFor } from "@testing-library/react"
import { describe, test, expect, vi, beforeEach } from "vitest"

beforeEach(() => {
  localStorage.clear()
  localStorage.setItem("hb_token", "test-token")
  vi.resetModules()
})

describe("generateTokenForService", () => {
  test("generates token from table action", async () => {
    vi.doMock("../jwt", () => ({
      getUserFromToken: () => ({ role: "admin" }),
    }))

    globalThis.fetch = vi.fn((url: RequestInfo | URL) => {
      const u = String(url)

      if (u.includes("/services") && !u.includes("token")) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              services: [
                {
                  id: "1",
                  service_name: "svc",
                  service_id: "abc",
                  scopes: [],
                  enabled: true,
                  created_at: null,
                },
              ],
            }),
        } as Response)
      }

      if (u.includes("/service-token")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ access_token: "TABLE_TOKEN" }),
        } as Response)
      }

      if (u.includes("/scopes")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ scopes: [] }),
        } as Response)
      }

      return Promise.resolve({ ok: true } as Response)
    }) as unknown as typeof fetch

    const { default: Page } = await import("../ServiceAccountsPage")
    render(<Page />)

    await waitFor(() =>
      expect(screen.getByText("svc")).toBeInTheDocument()
    )

    const generateButton = screen.getByText("Generate token")
    generateButton.click()

    expect(await screen.findByText("TABLE_TOKEN")).toBeInTheDocument()
  })
})
