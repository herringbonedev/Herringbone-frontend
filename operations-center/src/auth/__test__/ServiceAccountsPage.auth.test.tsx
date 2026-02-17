import { render, screen } from "@testing-library/react"
import { describe, test, expect, vi, beforeEach } from "vitest"

beforeEach(() => {
  localStorage.clear()
  vi.resetModules()
})

describe("ServiceAccountsPage auth gating", () => {
  test("shows not authenticated", async () => {
    vi.doMock("../jwt", () => ({
      getUserFromToken: () => null,
    }))

    const { default: Page } = await import("../ServiceAccountsPage")

    render(<Page />)
    expect(screen.getByText("Not authenticated")).toBeInTheDocument()
  })

  test("blocks non-admin users", async () => {
    localStorage.setItem("hb_token", "test-token")

    vi.doMock("../jwt", () => ({
      getUserFromToken: () => ({ role: "user" }),
    }))

    const { default: Page } = await import("../ServiceAccountsPage")

    render(<Page />)
    expect(screen.getByText("Admin access required")).toBeInTheDocument()
  })
})
