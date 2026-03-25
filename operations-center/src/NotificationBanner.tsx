import { useEffect, useState } from "react"

type Notification = {
  type: "error" | "success" | "info"
  message: string
}

export default function NotificationBanner() {
  const [notif, setNotif] = useState<Notification | null>(null)

  useEffect(() => {
    function handler(e: any) {
      setNotif(e.detail)
      setTimeout(() => setNotif(null), 4000)
    }

    window.addEventListener("hb-notification", handler)
    return () => window.removeEventListener("hb-notification", handler)
  }, [])

  if (!notif) return null

  const bg =
    notif.type === "error"
      ? "#b91c1c"
      : notif.type === "success"
      ? "#15803d"
      : "#1d4ed8"

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        background: bg,
        color: "white",
        padding: "10px",
        textAlign: "center",
        zIndex: 9999,
        fontWeight: "bold",
      }}
    >
      {notif.message}
    </div>
  )
}