import { describe, test, expect } from "vitest"
import {
  groupByPrefix,
  safeDateString,
  authHeaders,
  type ScopeItem,
} from "../utils"

describe("groupByPrefix", () => {
  test("groups by prefix and sorts", () => {
    const input: ScopeItem[] = [
      { scope: "auth:read", tier: "free" },
      { scope: "auth:write", tier: "enterprise" },
      { scope: "logs:view", tier: "free" },
    ]

    const result = groupByPrefix(input)

    expect(result.length).toBe(2)

    // Groups sorted alphabetically
    expect(result[0][0]).toBe("auth")
    expect(result[1][0]).toBe("logs")

    // Items sorted within group
    expect(result[0][1][0].scope).toBe("auth:read")
    expect(result[0][1][1].scope).toBe("auth:write")
  })
})

describe("safeDateString", () => {
  test("returns dash for null", () => {
    expect(safeDateString(null)).toBe("-")
  })

  test("formats valid ISO date", () => {
    const output = safeDateString("2024-01-01T00:00:00Z")
    expect(typeof output).toBe("string")
    expect(output.length).toBeGreaterThan(0)
  })

  test("returns original string for invalid date", () => {
    expect(safeDateString("not-a-date")).toBe("not-a-date")
  })
})

describe("authHeaders", () => {
  test("adds authorization header", () => {
    const headers = authHeaders("abc123")
    expect(headers.Authorization).toBe("Bearer abc123")
  })

  test("merges extra headers", () => {
    const headers = authHeaders("abc", {
      "Content-Type": "application/json",
    })

    expect(headers.Authorization).toBe("Bearer abc")
    expect(headers["Content-Type"]).toBe("application/json")
  })

  test("returns extra headers if no token", () => {
    const headers = authHeaders(null, { A: "B" })

    expect(headers.A).toBe("B")
    expect(headers.Authorization).toBeUndefined()
  })
})
