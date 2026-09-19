import { BrowserRouter, Route, Routes } from "react-router-dom"
import AppShell from "./layouts/AppShell"
import HomePage from "../features/home/HomePage"
import ExplorePage from "../features/explore/ExplorePage"
import TribesPage from "../features/tribes/TribesPage"
import ProfilePage from "../features/profile/ProfilePage"
import LivePage from "../features/live/LivePage"
import MessagesPage from "../features/messages/MessagesPage"
import NotificationsPage from "../features/notifications/NotificationsPage"
import RequireAuth from "../features/auth/RequireAuth"
import SignInPage from "../features/auth/SignInPage"
import SignUpPage from "../features/auth/SignUpPage"
import OnboardingPage from "../features/auth/OnboardingPage"

export default function AppRouter() {
  return <BrowserRouter><Routes>
    <Route path="/login" element={<SignInPage />} />
    <Route path="/signup" element={<SignUpPage />} />
    <Route element={<RequireAuth allowMissingProfile />}><Route path="/onboarding" element={<OnboardingPage />} /></Route>
    <Route element={<RequireAuth />}><Route element={<AppShell />}>
    <Route path="/" element={<HomePage />} />
    <Route path="/explore" element={<ExplorePage />} />
    <Route path="/tribes" element={<TribesPage />} />
    <Route path="/live" element={<LivePage />} />
    <Route path="/messages" element={<MessagesPage />} />
    <Route path="/notifications" element={<NotificationsPage />} />
    <Route path="/profile" element={<ProfilePage />} />
    </Route></Route>
  </Routes></BrowserRouter>
}
