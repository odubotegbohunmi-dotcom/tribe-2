import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import Button from "../../components/ui/Button"
import useAuth from "../../hooks/useAuth"
import { supabase } from "../../lib/supabase"

const STORAGE_KEY = "tribe-settings"

const ACCENT_PRESETS = [
  { name: "Violet", value: "#7c3aed" },
  { name: "Blue", value: "#2563eb" },
  { name: "Cyan", value: "#0891b2" },
  { name: "Pink", value: "#db2777" },
  { name: "Green", value: "#16a34a" },
  { name: "Orange", value: "#ea580c" },
  { name: "Red", value: "#dc2626" },
  { name: "Gold", value: "#d97706" },
]

const DEFAULT_LOCAL_SETTINGS = {
  accentColor: "#7c3aed",
  theme: "dark",
  compactMode: false,
  animations: true,
  largeText: false,
}

function loadLocalSettings() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)

    if (!saved) {
      return DEFAULT_LOCAL_SETTINGS
    }

    return {
      ...DEFAULT_LOCAL_SETTINGS,
      ...JSON.parse(saved),
    }
  } catch {
    return DEFAULT_LOCAL_SETTINGS
  }
}

function saveLocalSettings(settings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
}

function applyVisualSettings(settings) {
  const root = document.documentElement

  root.style.setProperty("--accent", settings.accentColor)

  root.dataset.theme = settings.theme
  root.dataset.density = settings.compactMode
    ? "compact"
    : "comfortable"

  root.dataset.animations = settings.animations
    ? "on"
    : "off"

  root.dataset.textSize = settings.largeText
    ? "large"
    : "normal"
}

function Switch({ checked, onChange, disabled = false }) {
  return (
    <button
      type="button"
      className={`settings-switch ${checked ? "is-on" : ""}`}
      onClick={onChange}
      disabled={disabled}
      aria-pressed={checked}
    >
      <span className="settings-switch__thumb" />
    </button>
  )
}

function SettingRow({
  icon,
  title,
  description,
  children,
}) {
  return (
    <div className="settings-item">
      <div className="settings-item__icon">
        {icon}
      </div>

      <div className="settings-item__content">
        <strong>{title}</strong>
        <span>{description}</span>
      </div>

      <div className="settings-item__control">
        {children}
      </div>
    </div>
  )
}

function SettingsSection({
  icon,
  title,
  description,
  children,
  danger = false,
}) {
  return (
    <section
      className={`settings-card ${
        danger ? "settings-card--danger" : ""
      }`}
    >
      <div className="settings-card__header">
        <div className="settings-card__header-icon">
          {icon}
        </div>

        <div>
          <h3>{title}</h3>
          {description && <p>{description}</p>}
        </div>
      </div>

      <div className="settings-card__body">
        {children}
      </div>
    </section>
  )
}

export default function SettingsPage() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [error, setError] = useState("")
  const [message, setMessage] = useState("")

  const [profile, setProfile] = useState(null)

  const [emailNotifications, setEmailNotifications] =
    useState(true)

  const [pushNotifications, setPushNotifications] =
    useState(true)

  const [privateAccount, setPrivateAccount] =
    useState(false)

  const [localSettings, setLocalSettings] = useState(
    DEFAULT_LOCAL_SETTINGS
  )

  const [newEmail, setNewEmail] = useState("")
  const [newPassword, setNewPassword] = useState("")

  const [showDeleteConfirm, setShowDeleteConfirm] =
    useState(false)

  const [showPassword, setShowPassword] =
    useState(false)

  /*
   * Load local visual settings immediately.
   */
  useEffect(() => {
    const settings = loadLocalSettings()

    setLocalSettings(settings)
    applyVisualSettings(settings)
  }, [])

  /*
   * Load account settings from Supabase.
   */
  useEffect(() => {
    if (!user?.id) return

    async function loadSettings() {
      setLoading(true)
      setError("")

      const { data, error: loadError } = await supabase
        .from("profiles")
        .select(
          "id, username, display_name, avatar_url, email_notifications, push_notifications, private_account, accent_color"
        )
        .eq("id", user.id)
        .single()

      if (loadError) {
        setError(loadError.message)
        setLoading(false)
        return
      }

      setProfile(data)

      setEmailNotifications(
        data.email_notifications ?? true
      )

      setPushNotifications(
        data.push_notifications ?? true
      )

      setPrivateAccount(
        data.private_account ?? false
      )

      const local = loadLocalSettings()

      /*
       * Supabase accent wins if one exists.
       */
      const databaseAccent =
        data.accent_color || local.accentColor

      const updatedLocal = {
        ...local,
        accentColor: databaseAccent,
      }

      setLocalSettings(updatedLocal)
      saveLocalSettings(updatedLocal)
      applyVisualSettings(updatedLocal)

      setNewEmail(user.email || "")
      setLoading(false)
    }

    void loadSettings()
  }, [user?.id, user?.email])

  function clearMessages() {
    setError("")
    setMessage("")
  }

  async function updateDatabaseSetting(
    column,
    value
  ) {
    if (!user?.id) return false

    setSaving(true)
    setError("")
    setMessage("")

    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        [column]: value,
      })
      .eq("id", user.id)

    if (updateError) {
      setError(updateError.message)
      setSaving(false)
      return false
    }

    setSaving(false)
    return true
  }

  async function changeEmailNotifications() {
    const next = !emailNotifications

    setEmailNotifications(next)

    const success = await updateDatabaseSetting(
      "email_notifications",
      next
    )

    if (!success) {
      setEmailNotifications(!next)
      return
    }

    setMessage(
      next
        ? "Email notifications enabled."
        : "Email notifications disabled."
    )
  }

  async function changePushNotifications() {
    const next = !pushNotifications

    setPushNotifications(next)

    const success = await updateDatabaseSetting(
      "push_notifications",
      next
    )

    if (!success) {
      setPushNotifications(!next)
      return
    }

    setMessage(
      next
        ? "Push notifications enabled."
        : "Push notifications disabled."
    )
  }

  async function changePrivateAccount() {
    const next = !privateAccount

    setPrivateAccount(next)

    const success = await updateDatabaseSetting(
      "private_account",
      next
    )

    if (!success) {
      setPrivateAccount(!next)
      return
    }

    setMessage(
      next
        ? "Your account is now private."
        : "Your account is now public."
    )
  }

  async function changeAccentColor(color) {
    const previous = localSettings.accentColor

    const updated = {
      ...localSettings,
      accentColor: color,
    }

    setLocalSettings(updated)
    saveLocalSettings(updated)
    applyVisualSettings(updated)

    const success = await updateDatabaseSetting(
      "accent_color",
      color
    )

    if (!success) {
      const reverted = {
        ...localSettings,
        accentColor: previous,
      }

      setLocalSettings(reverted)
      saveLocalSettings(reverted)
      applyVisualSettings(reverted)
      return
    }

    setMessage("Accent color updated.")
  }

  function updateLocalSetting(key, value) {
    const updated = {
      ...localSettings,
      [key]: value,
    }

    setLocalSettings(updated)
    saveLocalSettings(updated)
    applyVisualSettings(updated)

    const messages = {
      theme:
        value === "dark"
          ? "Dark theme enabled."
          : "Light theme enabled.",

      compactMode: value
        ? "Compact layout enabled."
        : "Comfortable layout enabled.",

      animations: value
        ? "Animations enabled."
        : "Animations reduced.",

      largeText: value
        ? "Larger text enabled."
        : "Normal text size restored.",
    }

    setMessage(messages[key] || "Appearance updated.")
  }

  async function handleEmailUpdate(event) {
    event.preventDefault()

    const email = newEmail.trim()

    if (!email) {
      setError("Enter an email address.")
      return
    }

    if (email === user?.email) {
      setError(
        "That's already the email on your account."
      )
      return
    }

    setSaving(true)
    clearMessages()

    const { error: updateError } =
      await supabase.auth.updateUser({
        email,
      })

    if (updateError) {
      setError(updateError.message)
    } else {
      setMessage(
        "Check your inbox to confirm your new email address."
      )
    }

    setSaving(false)
  }

  async function handlePasswordUpdate(event) {
    event.preventDefault()

    const password = newPassword.trim()

    if (!password) {
      setError("Enter a new password.")
      return
    }

    if (password.length < 6) {
      setError(
        "Your password must be at least 6 characters."
      )
      return
    }

    setSaving(true)
    clearMessages()

    const { error: updateError } =
      await supabase.auth.updateUser({
        password,
      })

    if (updateError) {
      setError(updateError.message)
    } else {
      setMessage("Password updated successfully.")
      setNewPassword("")
    }

    setSaving(false)
  }

  async function handleSignOut() {
    setSaving(true)
    clearMessages()

    const { error: signOutError } =
      await signOut()

    if (signOutError) {
      setError(signOutError.message)
      setSaving(false)
      return
    }

    navigate("/login", {
      replace: true,
    })
  }

  function requestAccountDeletion() {
    /*
     * Client-side Supabase cannot securely delete an Auth user.
     * This keeps the UI safe instead of pretending deletion happened.
     */
    setShowDeleteConfirm(false)

    setMessage(
      "Account deletion needs to be connected to a secure server function before it can be completed."
    )
  }

  if (loading) {
    return (
      <>
        <header className="topbar">
          <h2>Settings</h2>
        </header>

        <div className="settings-page">
          <div className="settings-loading-card">
            <div className="settings-loading-spinner" />
            <strong>Loading your settings</strong>
            <span>
              Getting your Tribe preferences ready...
            </span>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <header className="topbar">
        <h2>Settings</h2>
      </header>

      <main className="settings-page">
        {/* HERO */}

        <section className="settings-hero">
          <div className="settings-hero__glow" />

          <div className="settings-hero__avatar">
            {profile?.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt=""
              />
            ) : (
              profile?.display_name
                ?.charAt(0)
                ?.toUpperCase() || "T"
            )}
          </div>

          <div className="settings-hero__content">
            <span className="settings-eyebrow">
              TRIBE CONTROL CENTER
            </span>

            <h1>Make Tribe yours.</h1>

            <p>
              Customize how Tribe looks, feels, and
              behaves for you.
            </p>

            <div className="settings-user">
              <strong>
                {profile?.display_name ||
                  "Tribe member"}
              </strong>

              <span>
                @{profile?.username || "member"}
              </span>
            </div>
          </div>
        </section>

        {/* STATUS */}

        {error && (
          <div className="settings-banner settings-banner--error">
            <span>!</span>
            <div>
              <strong>Something went wrong</strong>
              <p>{error}</p>
            </div>

            <button
              type="button"
              onClick={() => setError("")}
            >
              ✕
            </button>
          </div>
        )}

        {message && (
          <div className="settings-banner settings-banner--success">
            <span>✓</span>
            <div>
              <strong>Saved</strong>
              <p>{message}</p>
            </div>

            <button
              type="button"
              onClick={() => setMessage("")}
            >
              ✕
            </button>
          </div>
        )}

        {/* APPEARANCE */}

        <SettingsSection
          icon="✦"
          title="Appearance"
          description="Customize the visual experience of Tribe."
        >
          <div className="settings-subsection">
            <div className="settings-subsection__heading">
              <strong>Accent color</strong>
              <span>
                Choose the color Tribe uses for active
                controls and highlights.
              </span>
            </div>

            <div className="settings-color-grid">
              {ACCENT_PRESETS.map((preset) => {
                const active =
                  localSettings.accentColor ===
                  preset.value

                return (
                  <button
                    key={preset.value}
                    type="button"
                    className={`settings-color ${
                      active ? "is-active" : ""
                    }`}
                    style={{
                      "--swatch": preset.value,
                    }}
                    onClick={() =>
                      changeAccentColor(
                        preset.value
                      )
                    }
                    aria-label={`Use ${preset.name}`}
                    title={preset.name}
                  >
                    <span />

                    {active && (
                      <b>✓</b>
                    )}

                    <small>
                      {preset.name}
                    </small>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="settings-divider" />

          <div className="settings-subsection">
            <div className="settings-subsection__heading">
              <strong>Theme</strong>
              <span>
                Pick the atmosphere you want while using Tribe.
              </span>
            </div>

            <div className="settings-choice-grid">
              <button
                type="button"
                className={`settings-choice ${
                  localSettings.theme ===
                  "dark"
                    ? "is-active"
                    : ""
                }`}
                onClick={() =>
                  updateLocalSetting(
                    "theme",
                    "dark"
                  )
                }
              >
                <div className="settings-choice__preview settings-preview--dark">
                  <span>◐</span>
                </div>

                <strong>Dark</strong>
                <small>
                  The classic Tribe experience
                </small>
              </button>

              <button
                type="button"
                className={`settings-choice ${
                  localSettings.theme ===
                  "light"
                    ? "is-active"
                    : ""
                }`}
                onClick={() =>
                  updateLocalSetting(
                    "theme",
                    "light"
                  )
                }
              >
                <div className="settings-choice__preview settings-preview--light">
                  <span>☀</span>
                </div>

                <strong>Light</strong>
                <small>
                  A brighter, cleaner experience
                </small>
              </button>
            </div>
          </div>

          <div className="settings-divider" />

          <SettingRow
            icon="↔"
            title="Compact layout"
            description="Fit more posts and controls on the screen."
          >
            <Switch
              checked={localSettings.compactMode}
              onChange={() =>
                updateLocalSetting(
                  "compactMode",
                  !localSettings.compactMode
                )
              }
            />
          </SettingRow>

          <SettingRow
            icon="✧"
            title="Animations"
            description="Use Tribe's transitions and motion effects."
          >
            <Switch
              checked={localSettings.animations}
              onChange={() =>
                updateLocalSetting(
                  "animations",
                  !localSettings.animations
                )
              }
            />
          </SettingRow>

          <SettingRow
            icon="A"
            title="Larger text"
            description="Increase text size across the Tribe interface."
          >
            <Switch
              checked={localSettings.largeText}
              onChange={() =>
                updateLocalSetting(
                  "largeText",
                  !localSettings.largeText
                )
              }
            />
          </SettingRow>
        </SettingsSection>

        {/* NOTIFICATIONS */}

        <SettingsSection
          icon="♢"
          title="Notifications"
          description="Control how Tribe keeps you updated."
        >
          <SettingRow
            icon="✉"
            title="Email notifications"
            description="Receive important Tribe activity by email."
          >
            <Switch
              checked={emailNotifications}
              onChange={changeEmailNotifications}
              disabled={saving}
            />
          </SettingRow>

          <SettingRow
            icon="●"
            title="Push notifications"
            description="Receive notifications from Tribe on this device."
          >
            <Switch
              checked={pushNotifications}
              onChange={changePushNotifications}
              disabled={saving}
            />
          </SettingRow>
        </SettingsSection>

        {/* PRIVACY */}

        <SettingsSection
          icon="⌾"
          title="Privacy"
          description="Control who can interact with your account."
        >
          <SettingRow
            icon="◉"
            title="Private account"
            description="Only approved followers can see your posts."
          >
            <Switch
              checked={privateAccount}
              onChange={changePrivateAccount}
              disabled={saving}
            />
          </SettingRow>

          <div className="settings-info-box">
            <span>ⓘ</span>
            <p>
              Private-account enforcement also needs
              matching Row Level Security policies in
              Supabase. This setting stores your preference;
              your database policies determine access.
            </p>
          </div>
        </SettingsSection>

        {/* ACCOUNT */}

        <SettingsSection
          icon="◎"
          title="Account"
          description="Manage your login information and security."
        >
          <form
            className="settings-form-modern"
            onSubmit={handleEmailUpdate}
          >
            <div className="settings-form-modern__heading">
              <div>
                <strong>Email address</strong>
                <span>
                  Your current login email is shown below.
                </span>
              </div>
            </div>

            <div className="settings-input-wrap">
              <span>✉</span>

              <input
                type="email"
                value={newEmail}
                onChange={(event) =>
                  setNewEmail(event.target.value)
                }
                placeholder="you@example.com"
                autoComplete="email"
              />
            </div>

            <Button
              type="submit"
              disabled={saving}
            >
              {saving
                ? "Updating..."
                : "Update email"}
            </Button>
          </form>

          <div className="settings-divider" />

          <form
            className="settings-form-modern"
            onSubmit={handlePasswordUpdate}
          >
            <div className="settings-form-modern__heading">
              <div>
                <strong>Password</strong>
                <span>
                  Use a strong password you don't reuse elsewhere.
                </span>
              </div>
            </div>

            <div className="settings-input-wrap">
              <span>⌑</span>

              <input
                type={
                  showPassword
                    ? "text"
                    : "password"
                }
                value={newPassword}
                onChange={(event) =>
                  setNewPassword(
                    event.target.value
                  )
                }
                placeholder="New password"
                autoComplete="new-password"
              />

              <button
                type="button"
                className="settings-input-action"
                onClick={() =>
                  setShowPassword(
                    (value) => !value
                  )
              }
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>

            <div className="password-hint">
              <span
                className={
                  newPassword.length >= 6
                    ? "good"
                    : ""
                }
              >
                {newPassword.length >= 6
                  ? "✓"
                  : "○"}{" "}
                At least 6 characters
              </span>
            </div>

            <Button
              type="submit"
              disabled={
                saving ||
                newPassword.trim().length < 6
              }
            >
              {saving
                ? "Updating..."
                : "Update password"}
            </Button>
          </form>
        </SettingsSection>

        {/* SESSION */}

        <SettingsSection
          icon="↪"
          title="Session"
          description="Manage your current Tribe session."
        >
          <SettingRow
            icon="●"
            title="Current session"
            description={
              user?.email ||
              "Signed in to Tribe"
            }
          >
            <span className="settings-session-badge">
              Active
            </span>
          </SettingRow>

          <div className="settings-session-actions">
            <Button
              variant="surface"
              onClick={handleSignOut}
              disabled={saving}
            >
              Sign out
            </Button>
          </div>
        </SettingsSection>

        {/* DANGER */}

        <SettingsSection
          icon="!"
          title="Danger zone"
          description="Actions here can affect your account permanently."
          danger
        >
          <div className="settings-danger-row">
            <div>
              <strong>Delete account</strong>

              <span>
                Permanently remove your Tribe account
                and associated data.
              </span>
            </div>

            <button
              type="button"
              className="settings-danger-button"
              onClick={() =>
                setShowDeleteConfirm(true)
              }
            >
              Delete account
            </button>
          </div>
        </SettingsSection>

        <div className="settings-footer">
          <span>TRIBE</span>
          <small>
            Your community. Your experience.
          </small>
        </div>
      </main>

      {/* DELETE MODAL */}

      {showDeleteConfirm && (
        <div
          className="settings-modal-backdrop"
          onClick={() =>
            setShowDeleteConfirm(false)
          }
        >
          <div
            className="settings-delete-modal"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <div className="settings-delete-icon">
              !
            </div>

            <span className="settings-eyebrow">
              ACCOUNT DELETION
            </span>

            <h2>
              Delete your account?
            </h2>

            <p>
              This action cannot be completed from
              the browser alone. Tribe needs a secure
              server-side deletion function before
              permanent account deletion is enabled.
            </p>

            <div className="settings-delete-actions">
              <button
                type="button"
                onClick={() =>
                  setShowDeleteConfirm(false)
                }
              >
                Keep my account
              </button>

              <button
                type="button"
                className="danger"
                onClick={
                  requestAccountDeletion
                }
              >
                Request deletion
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}