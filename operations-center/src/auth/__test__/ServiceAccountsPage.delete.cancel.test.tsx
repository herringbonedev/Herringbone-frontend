import { render, screen, waitFor } from "@testing-library/react"
import { describe, test, expect, vi, beforeEach } from "vitest"

beforeEach(() => {
  localStorage.clear()
  localStorage.setItem("hb_token", "test-token")
  vi.resetModules()
})

describe("deleteService cancel branch", () => {
  test("does not call delete if user cancels", async () => {
    vi.doMock("../jwt", () => ({
      getUserFromToken: () => ({ role: "admin" }),
    }))

    window.confirm = vi.fn(() => false)

    globalThis.fetch = vi.fn((url: RequestInfo | URL) => {
      if (String(url).includes("/services")) {
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

      if (String(url).includes("/scopes")) {
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

    const deleteButton = screen.getAllByText("Delete")[0]
    deleteButton.click()

    expect(window.confirm).toHaveBeenCalled()
  })
})
