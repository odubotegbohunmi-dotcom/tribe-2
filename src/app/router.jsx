import { BrowserRouter, Route, Routes } from "react-router-dom"
import AppShell from "./layouts/AppShell"
import SettingsPage from "../features/settings/SettingsPage"
import TribeAIPage from "../features/tribe-ai/TribeAIPage"
import HomePage from "../features/home/HomePage"
import ExplorePage from "../features/explore/ExplorePage"
import TribesPage from "../features/tribes/TribesPage"
import TribePage from "../features/tribes/TribePage"
import ProfilePage from "../features/profile/ProfilePage"
import LiveRoomPage from "../features/live/LiveRoomPage"
import MessagesPage from "../features/messages/MessagesPage"
import NotificationsPage from "../features/notifications/NotificationsPage"
import ComingSoonPage from "../features/navigation/ComingSoonPage"

import RequireAuth from "../features/auth/RequireAuth"
import SignInPage from "../features/auth/SignInPage"
import SignUpPage from "../features/auth/SignUpPage"
import OnboardingPage from "../features/auth/OnboardingPage"

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public auth */}
        <Route
          path="/login"
          element={<SignInPage />}
        />

        <Route
          path="/signup"
          element={<SignUpPage />}
        />

        {/* Onboarding */}
        <Route
          element={
            <RequireAuth allowMissingProfile />
          }
        >
          <Route
            path="/onboarding"
            element={<OnboardingPage />}
          />
        </Route>

        {/* Main authenticated app */}
        <Route element={<RequireAuth />}>
          <Route element={<AppShell />}>
            <Route
              path="/"
              element={<HomePage />}
            />

            <Route
              path="/explore"
              element={<ExplorePage />}
            />

            <Route
              path="/tribes"
              element={<TribesPage />}
            />

            <Route
              path="/tribes/:tribeId"
              element={<TribePage />}
            />

            <Route path="/tribe-wars" element={<ComingSoonPage title="Tribe Wars" icon="⚔" />} />
            <Route path="/tribe-plus" element={<ComingSoonPage title="Tribe Plus" icon="★" />} />
            <Route path="/safety" element={<ComingSoonPage title="Safety Center" icon="◇" />} />
            <Route path="/devices" element={<ComingSoonPage title="Devices" icon="▣" />} />
            <Route path="/transparency" element={<ComingSoonPage title="Transparency" icon="▤" />} />
            <Route path="/live" element={<ComingSoonPage title="Live" icon="◉" message="Live rooms open through their existing stream links. Tribe-specific voice is not available yet." />} />

            {/* Discover */}
           

          <Route path="/tribe-ai" element={<TribeAIPage />} />

            {/* Old Live routes — kept temporarily */}
            <Route
              path="/live/:streamId"
              element={<LiveRoomPage />}
            />

            <Route
              path="/live/:streamId/studio"
              element={<LiveRoomPage />}
            />

            <Route
              path="/messages"
              element={<MessagesPage />}
            />

            <Route
              path="/notifications"
              element={<NotificationsPage />}
            />

            <Route
              path="/profile"
              element={<ProfilePage />}
            />

            <Route
  path="/settings"
  element={<SettingsPage />}
/>
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
