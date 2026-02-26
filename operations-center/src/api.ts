export function getToken(): string | null {
  return localStorage.getItem("hb_token")
}

export function clearToken() {
  localStorage.removeItem("hb_token")
}

function redirectToLogin() {
  if (window.location.pathname !== "/login") {
    window.location.href = "/login"
  }
}

export async function apiFetch(
  path: string,
  options: RequestInit = {}
) {
  const token = getToken()

  const res = await fetch(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  })

  if (res.status === 401) {
    clearToken()
    redirectToLogin()
    throw new Error("Unauthorized")
  }

  return res
}