import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, test, expect, vi, beforeEach } from "vitest"

beforeEach(() => {
  localStorage.clear()
  localStorage.setItem("hb_token", "test-token")
  vi.resetModules()
})

describe("createService flow", () => {
  test("creates service and displays token", async () => {
    vi.doMock("../jwt", () => ({
      getUserFromToken: () => ({ role: "admin" }),
    }))

    globalThis.fetch = vi.fn((url: RequestInfo | URL) => {
      const u = String(url)

      if (u.includes("/register")) {
        return Promise.resolve({ ok: true } as Response)
      }

      if (u.includes("/service-token")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ access_token: "NEW_TOKEN" }),
        } as Response)
      }

      if (u.includes("/services")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ services: [] }),
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

    const user = userEvent.setup()

    await user.type(
      screen.getByPlaceholderText("e.g. parser-extractor"),
      "test-service"
    )

    // Target the actual button, not the card title
    const button = screen.getByRole("button", { name: "Create service" })
    await user.click(button)

    await waitFor(() =>
      expect(screen.getByText("NEW_TOKEN")).toBeInTheDocument()
    )
  })
})
