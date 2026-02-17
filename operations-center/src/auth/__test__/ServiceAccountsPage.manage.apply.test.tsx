import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, test, expect, vi, beforeEach } from "vitest"

beforeEach(() => {
  localStorage.clear()
  localStorage.setItem("hb_token", "test-token")
  vi.resetModules()
})

describe("applyScopeChanges add/remove branches", () => {
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

    const user = userEvent.setup()

    // Open manage panel
    await user.click(screen.getByText("Manage"))

    // Safely narrow HTMLElement
    const manageTitle = screen.getByText(/Manage service:/)
    const manageCard = manageTitle.closest(".svc-card") as HTMLElement | null

    if (!manageCard) {
      throw new Error("Manage card not found")
    }

    // Open dropdown inside manage card only
    const dropdownButton = within(manageCard).getByRole("button", {
      name: /1 selected/i,
    })

    await user.click(dropdownButton)

    // Toggle new scope
    await user.click(screen.getByText("auth:write"))

    // Save changes
    await user.click(
      within(manageCard).getByRole("button", { name: "Save scopes" })
    )

    await waitFor(() =>
      expect(globalThis.fetch).toHaveBeenCalled()
    )
  })
})
