import { NavLink } from "react-router-dom"

const navigationItems = [
  ["/", "⌂", "Home"],
  ["/explore", "⌕", "Explore"],
  ["/tribes", "♟", "Tribes"],
  ["/notifications", "♡", "Alerts"],
  ["/profile", "●", "Profile"],
]

export default function MobileNav() {
  return (
    <nav className="mobile-nav" aria-label="Mobile navigation">
      {navigationItems.map(([to, icon, label]) => (
        <NavLink key={to} to={to} end={to === "/"} className="mobile-nav__item">
          <span>{icon}</span><small>{label}</small>
        </NavLink>
      ))}
    </nav>
  )
}
