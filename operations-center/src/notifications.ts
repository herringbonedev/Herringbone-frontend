type Notification = {
  type: "error" | "success" | "info"
  message: string
}

export function pushNotification(notification: Notification) {
  window.dispatchEvent(
    new CustomEvent("hb-notification", { detail: notification })
  )
}