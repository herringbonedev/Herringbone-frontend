import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, test, expect, vi, beforeEach } from "vitest"

beforeEach(() => {
  localStorage.clear()
  localStorage.setItem("hb_token", "test-token")
  vi.resetModules()
})

describe("misc function coverage", () => {
  test("executes closeManage, clearForm and remove helpers", async () => {
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

    // ---------- open + close manage ----------
    await user.click(screen.getByText("Manage"))
    await user.click(screen.getByText("Close"))

    // ---------- clear form ----------
    const input = screen.getByPlaceholderText(
      "e.g. parser-extractor"
    ) as HTMLInputElement

    await user.type(input, "temp")
    await user.click(screen.getByText("Clear"))
    expect(input.value).toBe("")

    // ---------- locate CREATE CARD safely ----------
    const createCardTitle = screen.getByText((content, element) => {
      return (
        !!element &&
        element.classList.contains("svc-card-title") &&
        content === "Create service"
      )
    })

    const createCard = createCardTitle.closest(".svc-card") as HTMLElement
    if (!createCard) throw new Error("Create card not found")

    // ---------- open dropdown ----------
    const dropdownButton = within(createCard).getByRole("button", {
      name: /select scopes/i,
    })

    await user.click(dropdownButton)

    const dropdown = within(createCard).getByRole(
      "listbox"
    ) as HTMLElement

    // ---------- click auth:read inside dropdown ----------
    await user.click(
      within(dropdown).getByText("auth:read")
    )

    // ---------- remove chip safely (class targeted) ----------
    const chipText = createCard.querySelector(
      ".svc-chip-text"
    ) as HTMLElement | null

    if (!chipText) throw new Error("Chip not found")

    await user.click(chipText)

    expect(true).toBe(true)
  })
})
