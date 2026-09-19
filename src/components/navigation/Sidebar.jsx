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

export default function Sidebar({ profile, onSignOut }) {
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
      <div className="user-card">
        <span className="user-card__avatar">{profile?.avatar_url ? <img src={profile.avatar_url} alt="" /> : profile?.display_name?.charAt(0).toUpperCase() || "?"}</span>
        <div><strong>{profile?.display_name || "Tribe member"}</strong><small>@{profile?.username || "member"}</small></div>
      </div>
      <Button className="sign-out" variant="surface" onClick={onSignOut}>Sign out</Button>
    </aside>
  )
}
