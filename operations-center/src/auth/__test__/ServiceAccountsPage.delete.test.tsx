import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { describe, test, expect, vi, beforeEach } from "vitest"

beforeEach(() => {
  localStorage.clear()
  localStorage.setItem("hb_token", "test-token")
  vi.resetModules()
})

describe("deleteService", () => {
  test("deletes service", async () => {
    vi.doMock("../jwt", () => ({
      getUserFromToken: () => ({ role: "admin" }),
    }))

    window.confirm = vi.fn(() => true)

    globalThis.fetch = vi.fn((url: RequestInfo | URL) => {
      const u = String(url)

      if (u.includes("/services") && !u.includes("DELETE")) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              services: [
                {
                  id: "1",
                  service_name: "delete-me",
                  service_id: "abc",
                  scopes: [],
                  enabled: true,
                  created_at: null,
                },
              ],
            }),
        } as Response)
      }

      if (u.includes("/services/")) {
        return Promise.resolve({ ok: true } as Response)
      }

      if (u.includes("/scopes")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ scopes: [] }),
        } as Response)
      }

      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) } as Response)
    }) as unknown as typeof fetch

    const { default: Page } = await import("../ServiceAccountsPage")
    render(<Page />)

    await waitFor(() =>
      expect(screen.getByText("delete-me")).toBeInTheDocument()
    )

    fireEvent.click(screen.getAllByText("Delete")[0])

    await waitFor(() =>
      expect(globalThis.fetch).toHaveBeenCalled()
    )
  })
})
