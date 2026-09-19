import { Outlet } from "react-router-dom"
import Sidebar from "../../components/navigation/Sidebar"
import MobileNav from "../../components/navigation/MobileNav"

export default function AppShell() {
  return (
    <div className="tribe-app">
      <Sidebar />
      <main className="feed"><Outlet /></main>
      <MobileNav />
    </div>
  )
}
