import { useCallback, useEffect, useState } from "react"
import { Navigate, useNavigate } from "react-router-dom"
import Button from "../../components/ui/Button"
import ErrorState from "../../components/ui/ErrorState"
import Skeleton from "../../components/ui/Skeleton"
import useAuth from "../../hooks/useAuth"
import { supabase } from "../../lib/supabase"

const interestOptions = [
  { icon: "🎮", name: "Gaming" },
  { icon: "🎵", name: "Music" },
  { icon: "🏈", name: "Sports" },
  { icon: "💻", name: "Technology" },
  { icon: "🎨", name: "Art & Design" },
  { icon: "📚", name: "Learning" },
  { icon: "💰", name: "Business" },
  { icon: "🌎", name: "Culture" },
  { icon: "🎬", name: "Movies & TV" },
  { icon: "🏋️", name: "Fitness" },
  { icon: "👨‍💻", name: "Coding" },
  { icon: "🎤", name: "Creators" },
]

const communityOptions = [
  { icon: "💬", name: "Conversations", text: "I like talking with people" },
  { icon: "🎨", name: "Creating", text: "I like making things" },
  { icon: "🔥", name: "Competing", text: "I like challenges" },
  { icon: "👀", name: "Discovering", text: "I like finding new things" },
  { icon: "🤝", name: "Connecting", text: "I like meeting people" },
  { icon: "🧠", name: "Learning", text: "I like learning new things" },
]

const tourSteps = [
  {
    icon: "⌂",
    title: "Home",
    description:
      "Your personal feed for conversations, people, and communities you care about.",
  },
  {
    icon: "◈",
    title: "Discover",
    description:
      "Find new conversations, creators, challenges, events, and things happening around Tribe.",
  },
  {
    icon: "♟",
    title: "Tribes",
    description:
      "Join communities built around the things you actually care about.",
  },
  {
    icon: "✦",
    title: "Your Journey",
    description:
      "Build your profile, meet people, discover communities, and make Tribe yours.",
  },
]

const totalSteps = 4

export default function OnboardingPage() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [checking, setChecking] = useState(true)
  const [existingProfile, setExistingProfile] = useState(false)

  const [step, setStep] = useState(0)
  const [direction, setDirection] = useState("forward")

  const [form, setForm] = useState({
    username: user?.user_metadata?.username || "",
    displayName: user?.user_metadata?.display_name || "",
    bio: "",
  })

  const [interests, setInterests] = useState([])
  const [communityPreferences, setCommunityPreferences] = useState([])

  const [error, setError] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const checkExistingProfile = useCallback(async () => {
    if (!user) return

    setChecking(true)
    setError("")

    const { data, error: profileError } = await supabase
      .from("profiles")
      .select("id, onboarding_completed")
      .eq("id", user.id)

    if (profileError) {
      setError(profileError.message)
    } else {
      setExistingProfile(Boolean(data?.[0]))
    }

    setChecking(false)
  }, [user])

  useEffect(() => {
    void Promise.resolve().then(checkExistingProfile)
  }, [checkExistingProfile])

  function updateField(event) {
    const { name, value } = event.target

    setForm((current) => ({
      ...current,
      [name]: value,
    }))

    setError("")
  }

  function toggleInterest(interest) {
    setInterests((current) =>
      current.includes(interest)
        ? current.filter((item) => item !== interest)
        : [...current, interest],
    )

    setError("")
  }

  function toggleCommunityPreference(preference) {
    setCommunityPreferences((current) =>
      current.includes(preference)
        ? current.filter((item) => item !== preference)
        : [...current, preference],
    )

    setError("")
  }

  function goToStep(nextStep) {
    setError("")

    setDirection(nextStep > step ? "forward" : "backward")
    setStep(nextStep)
  }

  function nextStep() {
    setError("")

    if (step === 1) {
      const username = form.username.trim()
      const displayName = form.displayName.trim()

      if (!displayName) {
        setError("Add a display name first.")
        return
      }

      if (!username) {
        setError("Choose a username first.")
        return
      }

      if (username.length < 3) {
        setError("Your username needs at least 3 characters.")
        return
      }

      if (!/^[a-zA-Z0-9_]+$/.test(username)) {
        setError("Username can only use letters, numbers, and underscores.")
        return
      }
    }

    if (step === 2 && interests.length === 0) {
      setError("Pick at least one interest.")
      return
    }

    if (step === 3 && communityPreferences.length === 0) {
      setError("Pick at least one option.")
      return
    }

    goToStep(step + 1)
  }

  function previousStep() {
    if (step === 0) return
    goToStep(step - 1)
  }

  async function finishOnboarding() {
    if (!user || submitting) return

    setError("")
    setSubmitting(true)

    const profile = {
      id: user.id,
      username: form.username.trim().toLowerCase(),
      display_name: form.displayName.trim(),
      bio: form.bio.trim(),
      avatar_url: null,
      interests,
      community_preferences: communityPreferences,
      onboarding_completed: true,
    }

    const { error: createError } = await supabase
      .from("profiles")
      .insert(profile)

    if (createError) {
      setError(createError.message)
      setSubmitting(false)
      return
    }

    navigate("/", { replace: true })
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (checking) {
    return (
      <main className="auth-page">
        <Skeleton className="skeleton--text" />
      </main>
    )
  }

  if (existingProfile) {
    return <Navigate to="/" replace />
  }

  const progress =
    step === 0
      ? 0
      : Math.min((step / totalSteps) * 100, 100)

  return (
    <main className="tribe-onboarding">
      <div className="onboarding-noise" />

      <div className="onboarding-orb onboarding-orb--one" />
      <div className="onboarding-orb onboarding-orb--two" />
      <div className="onboarding-orb onboarding-orb--three" />

      <div className="tribe-onboarding__shell">

        {/* TOP */}
        <header className="onboarding-topbar">
          <button
            type="button"
            className="onboarding-logo"
            onClick={() => goToStep(0)}
            aria-label="Back to onboarding welcome"
          >
            TRIBE
            <span />
          </button>

          {step > 0 && step < 4 && (
            <div className="onboarding-step-count">
              <span>{step}</span>
              <div className="onboarding-mini-line">
                <div style={{ width: `${progress}%` }} />
              </div>
              <small>4</small>
            </div>
          )}

          {step > 0 && step < 4 ? (
            <button
              type="button"
              className="onboarding-exit"
              onClick={() => goToStep(0)}
            >
              Start over
            </button>
          ) : (
            <div className="onboarding-top-spacer" />
          )}
        </header>

        {/* MAIN CARD */}
        <section className="onboarding-panel">

          {/* PROGRESS */}
          {step > 0 && step < 4 && (
            <div className="onboarding-progress">
              <div style={{ width: `${progress}%` }} />
            </div>
          )}

          {error && (
            <div className="onboarding-error">
              <span>!</span>
              <p>{error}</p>
              <button
                type="button"
                onClick={() => setError("")}
                aria-label="Dismiss error"
              >
                ×
              </button>
            </div>
          )}

          <div
            key={step}
            className={`onboarding-screen onboarding-screen--${direction}`}
          >

            {/* =====================================================
                WELCOME
            ====================================================== */}
            {step === 0 && (
              <div className="onboarding-welcome">

                <div className="welcome-mark">
                  <div className="welcome-mark__inner">
                    ✦
                  </div>

                  <span className="welcome-pulse welcome-pulse--one" />
                  <span className="welcome-pulse welcome-pulse--two" />
                  <span className="welcome-pulse welcome-pulse--three" />
                </div>

                <div className="onboarding-eyebrow">
                  <span className="eyebrow-line" />
                  WELCOME TO TRIBE
                  <span className="eyebrow-line" />
                </div>

                <h1>
                  Find your people.
                  <br />
                  <span>Build your world.</span>
                </h1>

                <p className="welcome-description">
                  Discover communities, conversations, creators,
                  and people built around the things you actually care about.
                </p>

                <div className="welcome-features">
                  <div>
                    <span>◈</span>
                    <strong>Discover</strong>
                    <small>Find your interests</small>
                  </div>

                  <div>
                    <span>♟</span>
                    <strong>Connect</strong>
                    <small>Meet your people</small>
                  </div>

                  <div>
                    <span>✦</span>
                    <strong>Create</strong>
                    <small>Make your space</small>
                  </div>
                </div>

                <Button
                  type="button"
                  onClick={() => goToStep(1)}
                  className="onboarding-primary"
                >
                  <span>Let's build your Tribe</span>
                  <span className="button-arrow">→</span>
                </Button>

                <small className="welcome-time">
                  Takes about a minute
                </small>
              </div>
            )}

            {/* =====================================================
                PROFILE
            ====================================================== */}
            {step === 1 && (
              <div className="onboarding-content">

                <div className="step-icon">
                  <span>◉</span>
                </div>

                <div className="onboarding-eyebrow">
                  STEP 01
                </div>

                <h1>Make yourself at home.</h1>

                <p className="onboarding-description">
                  Choose how people will recognize you around Tribe.
                </p>

                <div className="profile-preview">
                  <div className="profile-preview__avatar">
                    {(form.displayName || "T").charAt(0).toUpperCase()}
                  </div>

                  <div>
                    <strong>
                      {form.displayName || "Your Name"}
                    </strong>
                    <span>
                      @{form.username || "yourusername"}
                    </span>
                  </div>

                  <div className="profile-preview__badge">
                    NEW
                  </div>
                </div>

                <div className="onboarding-form">

                  <label>
                    <span>
                      Display name
                      <b>*</b>
                    </span>

                    <input
                      name="displayName"
                      value={form.displayName}
                      onChange={updateField}
                      autoComplete="name"
                      placeholder="What should people call you?"
                      maxLength={40}
                    />

                    <small>
                      {form.displayName.length}/40
                    </small>
                  </label>

                  <label>
                    <span>
                      Username
                      <b>*</b>
                    </span>

                    <div className="username-input">
                      <span>@</span>
                      <input
                        name="username"
                        value={form.username}
                        onChange={updateField}
                        autoComplete="username"
                        placeholder="yourusername"
                        maxLength={24}
                      />
                    </div>
                  </label>

                  <label>
                    <span>
                      Bio <em>optional</em>
                    </span>

                    <textarea
                      name="bio"
                      value={form.bio}
                      onChange={updateField}
                      placeholder="Tell your Tribe a little about yourself..."
                      maxLength={160}
                      rows={3}
                    />

                    <small>
                      {form.bio.length}/160
                    </small>
                  </label>

                </div>

                <div className="onboarding-actions">
                  <button
                    type="button"
                    className="onboarding-back"
                    onClick={previousStep}
                  >
                    ← Back
                  </button>

                  <Button
                    type="button"
                    onClick={nextStep}
                    className="onboarding-primary"
                  >
                    Continue
                    <span>→</span>
                  </Button>
                </div>
              </div>
            )}

            {/* =====================================================
                INTERESTS
            ====================================================== */}
            {step === 2 && (
              <div className="onboarding-content">

                <div className="step-icon step-icon--purple">
                  <span>◈</span>
                </div>

                <div className="onboarding-eyebrow">
                  STEP 02
                </div>

                <div className="heading-row">
                  <div>
                    <h1>What are you into?</h1>

                    <p className="onboarding-description">
                      Pick the things that actually interest you.
                      We'll use them to shape your Tribe.
                    </p>
                  </div>

                  <div className="selection-count">
                    {interests.length}
                    <span>selected</span>
                  </div>
                </div>

                <div className="interest-grid">
                  {interestOptions.map((interest) => {
                    const selected = interests.includes(interest.name)

                    return (
                      <button
                        key={interest.name}
                        type="button"
                        className={`interest-card ${
                          selected ? "is-selected" : ""
                        }`}
                        onClick={() => toggleInterest(interest.name)}
                        aria-pressed={selected}
                      >
                        <span className="interest-icon">
                          {interest.icon}
                        </span>

                        <span className="interest-name">
                          {interest.name}
                        </span>

                        <span className="interest-check">
                          {selected ? "✓" : ""}
                        </span>
                      </button>
                    )
                  })}
                </div>

                <div className="onboarding-actions">
                  <button
                    type="button"
                    className="onboarding-back"
                    onClick={previousStep}
                  >
                    ← Back
                  </button>

                  <Button
                    type="button"
                    onClick={nextStep}
                    className="onboarding-primary"
                  >
                    Continue
                    <span>→</span>
                  </Button>
                </div>
              </div>
            )}

            {/* =====================================================
                COMMUNITY
            ====================================================== */}
            {step === 3 && (
              <div className="onboarding-content">

                <div className="step-icon step-icon--pink">
                  <span>♟</span>
                </div>

                <div className="onboarding-eyebrow">
                  STEP 03
                </div>

                <div className="heading-row">
                  <div>
                    <h1>How do you Tribe?</h1>

                    <p className="onboarding-description">
                      Pick whatever sounds like you.
                      There are no wrong answers.
                    </p>
                  </div>

                  <div className="selection-count">
                    {communityPreferences.length}
                    <span>selected</span>
                  </div>
                </div>

                <div className="community-grid">
                  {communityOptions.map((option) => {
                    const selected =
                      communityPreferences.includes(option.name)

                    return (
                      <button
                        key={option.name}
                        type="button"
                        className={`community-card ${
                          selected ? "is-selected" : ""
                        }`}
                        onClick={() =>
                          toggleCommunityPreference(option.name)
                        }
                        aria-pressed={selected}
                      >
                        <span className="community-icon">
                          {option.icon}
                        </span>

                        <span className="community-copy">
                          <strong>{option.name}</strong>
                          <small>{option.text}</small>
                        </span>

                        <span className="community-check">
                          {selected ? "✓" : "○"}
                        </span>
                      </button>
                    )
                  })}
                </div>

                <div className="onboarding-actions">
                  <button
                    type="button"
                    className="onboarding-back"
                    onClick={previousStep}
                  >
                    ← Back
                  </button>

                  <Button
                    type="button"
                    onClick={nextStep}
                    className="onboarding-primary"
                  >
                    Show me around
                    <span>→</span>
                  </Button>
                </div>
              </div>
            )}

            {/* =====================================================
                TOUR
            ====================================================== */}
            {step === 4 && (
              <div className="onboarding-content onboarding-tour">

                <div className="tour-success">
                  <div className="tour-success__icon">
                    ✓
                  </div>
                </div>

                <div className="onboarding-eyebrow">
                  YOU'RE READY
                </div>

                <h1>Your Tribe is waiting.</h1>

                <p className="onboarding-description">
                  Here's the quick tour. You'll be able to explore
                  everything once you enter.
                </p>

                <div className="tour-list">
                  {tourSteps.map((tour, index) => (
                    <div
                      key={tour.title}
                      className="tour-item"
                      style={{
                        "--tour-delay": `${index * 80}ms`,
                      }}
                    >
                      <div className="tour-number">
                        {index + 1}
                      </div>

                      <div className="tour-item__icon">
                        {tour.icon}
                      </div>

                      <div className="tour-item__content">
                        <strong>{tour.title}</strong>
                        <p>{tour.description}</p>
                      </div>

                      <span className="tour-arrow">
                        →
                      </span>
                    </div>
                  ))}
                </div>

                <Button
                  type="button"
                  onClick={finishOnboarding}
                  disabled={submitting}
                  className="onboarding-primary onboarding-enter"
                >
                  {submitting ? (
                    <>
                      <span className="button-spinner" />
                      Building your Tribe...
                    </>
                  ) : (
                    <>
                      Enter Tribe
                      <span>→</span>
                    </>
                  )}
                </Button>

                {!submitting && (
                  <button
                    type="button"
                    className="tour-back"
                    onClick={previousStep}
                  >
                    ← Go back
                  </button>
                )}
              </div>
            )}

          </div>
        </section>

        <footer className="onboarding-footer">
          <span>TRIBE 2.0</span>
          <span>•</span>
          <span>Built for your world.</span>
        </footer>

      </div>
    </main>
  )
}