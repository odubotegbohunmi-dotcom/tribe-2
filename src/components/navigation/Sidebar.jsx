import { NavLink } from "react-router-dom"
import Button from "../ui/Button"

const navigationItems = [
  ["/", "⌂", "Home"],
  ["/explore", "◉", "Explore"],
  ["/tribes", "♟", "Tribes"],
  ["/live", "◉", "Live"],
  ["/messages", "✉", "Messages"],
  ["/notifications", "♡", "Notifications"],
  ["/profile", "●", "Profile"],
]

export default function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="logo">TRIBE</div>
      <nav aria-label="Primary navigation">
        {navigationItems.map(([to, icon, label]) => (
          <NavLink key={to} to={to} end={to === "/"} className="nav-item">
            {icon} <span>{label}</span>
          </NavLink>
        ))}
      </nav>
      <Button className="create-button">+ Create</Button>
    </aside>
  )
}
