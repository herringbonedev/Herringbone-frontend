import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, test, expect, vi, beforeEach } from "vitest"

beforeEach(() => {
  localStorage.clear()
  localStorage.setItem("hb_token", "test-token")
  vi.resetModules()
})

describe("createService error path", () => {
  test("shows error if register fails", async () => {
    vi.doMock("../jwt", () => ({
      getUserFromToken: () => ({ role: "admin" }),
    }))

    globalThis.fetch = vi.fn(() =>
      Promise.resolve({
        ok: false,
        text: () => Promise.resolve("Register failed"),
      } as Response)
    ) as unknown as typeof fetch

    const { default: Page } = await import("../ServiceAccountsPage")
    render(<Page />)

    const user = userEvent.setup()

    await user.type(
      screen.getByPlaceholderText("e.g. parser-extractor"),
      "bad-service"
    )

    await user.click(
      screen.getByRole("button", { name: "Create service" })
    )

    expect(await screen.findByText("Register failed")).toBeInTheDocument()
  })
})
