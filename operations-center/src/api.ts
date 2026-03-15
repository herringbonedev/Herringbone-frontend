export function getToken(): string | null {
  return localStorage.getItem("hb_token")
}

export function clearToken() {
  localStorage.removeItem("hb_token")
}

function redirectToLogin() {
  if (window.location.pathname === "/login") return

  setTimeout(() => {
    if (window.location.pathname !== "/login") {
      window.location.replace("/login")
    }
  }, 0)
}

export async function apiFetch(path: string, options: RequestInit = {}) {
  const token = getToken()

  const res = await fetch(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  })

  // Only treat 401 as expired session
  if (res.status === 401) {
    clearToken()
    redirectToLogin()
    throw new Error("Session expired")
  }

  // 403 = authenticated but not authorized
  if (res.status === 403) {
    throw new Error("Forbidden")
  }

  return res
}