import { BrowserRouter, Route, Routes } from "react-router-dom"
import AppShell from "./layouts/AppShell"
import HomePage from "../features/home/HomePage"
import ExplorePage from "../features/explore/ExplorePage"
import TribesPage from "../features/tribes/TribesPage"
import ProfilePage from "../features/profile/ProfilePage"
import LivePage from "../features/live/LivePage"
import MessagesPage from "../features/messages/MessagesPage"
import NotificationsPage from "../features/notifications/NotificationsPage"

export default function AppRouter() {
  return <BrowserRouter><Routes><Route element={<AppShell />}>
    <Route path="/" element={<HomePage />} />
    <Route path="/explore" element={<ExplorePage />} />
    <Route path="/tribes" element={<TribesPage />} />
    <Route path="/live" element={<LivePage />} />
    <Route path="/messages" element={<MessagesPage />} />
    <Route path="/notifications" element={<NotificationsPage />} />
    <Route path="/profile" element={<ProfilePage />} />
  </Route></Routes></BrowserRouter>
}
