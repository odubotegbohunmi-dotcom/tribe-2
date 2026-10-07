import { NavLink } from "react-router-dom"
import Button from "../ui/Button"
import { useNavigate } from "react-router-dom"
import { useComposer } from "../../context/ComposerContext"

const navigationItems = [
  ["/", "⌂", "Home"],
  ["/explore", "⌕", "Explore"],
  ["/tribes", "♟", "Tribes"],
  ["/live", "◉", "Live"],
  ["/tribe-wars", "⚔", "Tribe Wars"],
  ["/tribes?view=joined", "✦", "My Tribes"],
  ["/tribe-ai", "✦", "Tribe AI"],
  ["/messages", "▱", "Messages"],
  ["/notifications", "♡", "Notifications"],
  ["/profile", "○", "Profile"],
]

const secondaryItems = [
  ["/tribe-plus", "★", "Tribe Plus"],
  ["/safety", "◇", "Safety Center"],
  ["/devices", "▣", "Devices"],
  ["/transparency", "▤", "Transparency"],
  ["/settings", "⚙", "Settings"],
]

export default function Sidebar({ profile, onSignOut }) {
  const navigate = useNavigate()
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
      <Button className="create-tribe-button" variant="surface" onClick={() => navigate("/tribes?create=1")}>
        + Create Tribe
      </Button>

      <div className="tribe-sidebar-section-label">YOUR TRIBE</div>
      <nav aria-label="Tribe and account navigation">
        {secondaryItems.map(([to, icon, label]) => (
          <NavLink key={to} to={to} className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}>
            <span className="nav-item__icon">{icon}</span><span>{label}</span>
          </NavLink>
        ))}
      </nav>

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
