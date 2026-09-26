import { NavLink } from "react-router-dom"
import Button from "../ui/Button"
import { useComposer } from "../../context/ComposerContext"

const navigationItems = [
  ["/", "⌂", "Home"],
  ["/explore", "⌕", "Explore"],
  ["/tribes", "♟", "Tribes"],
  ["/tribe-ai", "✦", "Tribe AI"],
  ["/messages", "▱", "Messages"],
  ["/notifications", "♡", "Notifications"],
  ["/profile", "○", "Profile"],
]

export default function Sidebar({ profile, onSignOut }) {
  const { open: openComposer } = useComposer()

  return (
    <aside className="sidebar">
      <div className="logo logo--rebrand">
        TRIBE
        <span className="ai-badge">AI</span>
      </div>

      <nav aria-label="Primary navigation">
        {navigationItems.map(([to, icon, label]) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            className={({ isActive }) =>
              isActive ? "nav-item active" : "nav-item"
            }
          >
            <span className="nav-item__icon">{icon}</span>
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      <Button className="create-button" onClick={openComposer}>
        + Create
      </Button>

      <div className="user-card">
        <span className="user-card__avatar">
          {profile?.avatar_url ? (
            <img src={profile.avatar_url} alt="" />
          ) : (
            profile?.display_name?.charAt(0).toUpperCase() || "?"
          )}
        </span>

        <div>
          <strong>
            {profile?.display_name || "Tribe member"}
          </strong>

          <small>
            @{profile?.username || "member"}
          </small>
        </div>

        <NavLink to="/settings" className="user-card__settings" title="Settings">
          ⚙
        </NavLink>
      </div>

      <Button
        className="sign-out"
        variant="surface"
        onClick={onSignOut}
      >
        Sign out
      </Button>
    </aside>
  )
}