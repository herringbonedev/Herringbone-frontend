export type NavItem = {
  label?: string
  path?: string
  element?: React.ReactNode
  position?: "left" | "right"
  order?: number
}