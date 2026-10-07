import { useCallback, useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"

import Avatar from "../../components/ui/Avatar"
import Button from "../../components/ui/Button"
import EmptyState from "../../components/ui/EmptyState"
import ErrorState from "../../components/ui/ErrorState"
import Modal from "../../components/ui/Modal"
import Skeleton from "../../components/ui/Skeleton"

import useAuth from "../../hooks/useAuth"
import { supabase } from "../../lib/supabase"

import FeedPage from "../posts/FeedPage"
import { loadProfileProgress } from "./profileProgress"

const TABS = ["Posts", "Replies", "Media", "Tribes", "Achievements"]

const MAX_DISPLAY_NAME = 40
const MAX_USERNAME = 20
const MAX_BIO = 160
const MAX_LOCATION = 60
const MAX_WEBSITE = 200

const MAX_AVATAR_SIZE = 5 * 1024 * 1024
const MAX_COVER_SIZE = 8 * 1024 * 1024

export default function ProfilePage() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [profile, setProfile] = useState(null)

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [uploadingCover, setUploadingCover] = useState(false)
  const [resettingCover, setResettingCover] = useState(false)

  const [error, setError] = useState("")
  const [message, setMessage] = useState("")

  const [editing, setEditing] = useState(false)

  const [displayName, setDisplayName] = useState("")
  const [username, setUsername] = useState("")
  const [bio, setBio] = useState("")
  const [location, setLocation] = useState("")
  const [website, setWebsite] = useState("")

  const [followerCount, setFollowerCount] = useState(0)
  const [followingCount, setFollowingCount] = useState(0)

  const [activeTab, setActiveTab] = useState("Posts")
  const [progress, setProgress] = useState(null)
  const [progressError, setProgressError] = useState("")

  useEffect(() => {
    if (!user?.id) return
    let active = true
    loadProfileProgress(user.id).then((result) => {
      if (active) setProgress(result)
    }).catch((loadError) => {
      if (active) setProgressError(loadError.message || "Progress is unavailable.")
    })
    return () => { active = false }
  }, [user?.id])

  // --------------------------------------------------
  // LOAD PROFILE
  // --------------------------------------------------

  const loadProfile = useCallback(async () => {
    if (!user?.id) return

    setLoading(true)
    setError("")

    try {
      // Get the freshest authenticated user so Auth metadata
      // such as location is always current.
      const {
        data: { user: freshUser },
        error: authError,
      } = await supabase.auth.getUser()

      if (authError) {
        throw new Error(authError.message)
      }

      const currentUser = freshUser || user

      const { data, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", currentUser.id)
        .maybeSingle()

      if (profileError) {
        throw new Error(profileError.message)
      }

      if (!data) {
        setProfile(null)
        setLoading(false)
        return
      }

      // location is intentionally read from Supabase Auth metadata
      // because the current profiles table does not have a location column.
      const authLocation =
        currentUser.user_metadata?.location || ""

      const combinedProfile = {
        ...data,
        location: authLocation,
      }

      setProfile(combinedProfile)

      const [
        { count: followers, error: followerError },
        { count: following, error: followingError },
      ] = await Promise.all([
        supabase
          .from("follows")
          .select("*", {
            count: "exact",
            head: true,
          })
          .eq("following_id", data.id),

        supabase
          .from("follows")
          .select("*", {
            count: "exact",
            head: true,
          })
          .eq("follower_id", data.id),
      ])

      if (followerError) {
        console.error(followerError)
      } else {
        setFollowerCount(followers || 0)
      }

      if (followingError) {
        console.error(followingError)
      } else {
        setFollowingCount(following || 0)
      }
    } catch (loadError) {
      console.error("Profile load failed:", loadError)
      setError(loadError.message || "Could not load your profile.")
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    void loadProfile()
  }, [loadProfile])

  // --------------------------------------------------
  // EDIT PROFILE
  // --------------------------------------------------

  function startEditing() {
    if (!profile) return

    setError("")
    setMessage("")

    setDisplayName(profile.display_name || "")
    setUsername(profile.username || "")
    setBio(profile.bio || "")
    setLocation(profile.location || "")
    setWebsite(profile.website || "")

    setEditing(true)
  }

  function closeEditor() {
    if (saving) return

    setEditing(false)
    setError("")
  }

  function normalizeWebsite(value) {
    const clean = value.trim()

    if (!clean) return ""

    if (
      clean.startsWith("http://") ||
      clean.startsWith("https://")
    ) {
      return clean
    }

    return `https://${clean}`
  }

  function validateProfile() {
    const cleanDisplayName = displayName.trim()
    const cleanUsername = username.trim().toLowerCase()
    const cleanBio = bio.trim()
    const cleanLocation = location.trim()
    const cleanWebsite = website.trim()

    if (!cleanDisplayName) {
      return "Display name cannot be empty."
    }

    if (cleanDisplayName.length > MAX_DISPLAY_NAME) {
      return `Display name must be ${MAX_DISPLAY_NAME} characters or less.`
    }

    if (cleanUsername.length < 3) {
      return "Username must be at least 3 characters."
    }

    if (cleanUsername.length > MAX_USERNAME) {
      return `Username must be ${MAX_USERNAME} characters or less.`
    }

    if (!/^[a-z0-9_]+$/.test(cleanUsername)) {
      return "Username can only contain letters, numbers, and underscores."
    }

    if (cleanBio.length > MAX_BIO) {
      return `Bio must be ${MAX_BIO} characters or less.`
    }

    if (cleanLocation.length > MAX_LOCATION) {
      return `Location must be ${MAX_LOCATION} characters or less.`
    }

    if (cleanWebsite.length > MAX_WEBSITE) {
      return `Website must be ${MAX_WEBSITE} characters or less.`
    }

    return null
  }

  async function saveProfile() {
    if (!user?.id || !profile || saving) return

    setError("")
    setMessage("")

    const validationError = validateProfile()

    if (validationError) {
      setError(validationError)
      return
    }

    setSaving(true)

    const cleanDisplayName = displayName.trim()
    const cleanUsername = username.trim().toLowerCase()
    const cleanBio = bio.trim()
    const cleanLocation = location.trim()
    const cleanWebsite = normalizeWebsite(website)

    try {
      // --------------------------------------------------
      // USERNAME AVAILABILITY
      // --------------------------------------------------

      const {
        data: existingUsername,
        error: usernameError,
      } = await supabase
        .from("profiles")
        .select("id")
        .eq("username", cleanUsername)
        .neq("id", user.id)
        .maybeSingle()

      if (usernameError) {
        throw new Error(usernameError.message)
      }

      if (existingUsername) {
        throw new Error(
          `@${cleanUsername} is already taken. Choose another username.`
        )
      }

      // --------------------------------------------------
      // UPDATE PROFILE TABLE
      // --------------------------------------------------
      //
      // IMPORTANT:
      // location is NOT included here because your current
      // profiles table does not contain a location column.
      //
      // Instead, location is stored in Supabase Auth metadata
      // below.

      const updatedValues = {
        display_name: cleanDisplayName,
        username: cleanUsername,
        bio: cleanBio,
        website: cleanWebsite,
      }

      const {
        data: updatedProfile,
        error: updateError,
      } = await supabase
        .from("profiles")
        .update(updatedValues)
        .eq("id", user.id)
        .select("*")
        .single()

      if (updateError) {
        throw new Error(updateError.message)
      }

      // --------------------------------------------------
      // SAVE LOCATION TO SUPABASE AUTH METADATA
      // --------------------------------------------------

      const {
        error: metadataError,
      } = await supabase.auth.updateUser({
        data: {
          location: cleanLocation,
        },
      })

      if (metadataError) {
        throw new Error(metadataError.message)
      }

      // --------------------------------------------------
      // UPDATE LOCAL UI IMMEDIATELY
      // --------------------------------------------------

      const finalProfile = {
        ...updatedProfile,
        location: cleanLocation,
      }

      setProfile(finalProfile)

      setDisplayName(finalProfile.display_name || "")
      setUsername(finalProfile.username || "")
      setBio(finalProfile.bio || "")
      setLocation(cleanLocation)
      setWebsite(finalProfile.website || "")

      setEditing(false)
      setMessage("Profile updated successfully.")

      // Refresh from Supabase to keep everything synchronized.
      await loadProfile()
    } catch (saveError) {
      console.error("Profile update failed:", saveError)

      setError(
        saveError.message || "Could not update your profile."
      )
    } finally {
      setSaving(false)
    }
  }

  // --------------------------------------------------
  // AVATAR UPLOAD
  // --------------------------------------------------

  async function handleAvatarUpload(event) {
    const file = event.target.files?.[0]

    if (!file || !profile || !user?.id) return

    setError("")
    setMessage("")
    setUploadingAvatar(true)

    try {
      if (!file.type.startsWith("image/")) {
        throw new Error("Please choose an image file.")
      }

      if (file.size > MAX_AVATAR_SIZE) {
        throw new Error(
          "Profile photos must be 5MB or smaller."
        )
      }

      const extension =
        file.name.split(".").pop()?.toLowerCase() || "jpg"

      const filePath =
        `avatars/${user.id}/avatar.${extension}`

      const { error: uploadError } =
        await supabase.storage
          .from("avatars")
          .upload(filePath, file, {
            upsert: true,
            contentType: file.type,
          })

      if (uploadError) {
        throw new Error(uploadError.message)
      }

      const { data: publicUrlData } =
        supabase.storage
          .from("avatars")
          .getPublicUrl(filePath)

      const avatarUrl =
        `${publicUrlData.publicUrl}?v=${Date.now()}`

      const {
        data: updatedProfile,
        error: updateError,
      } = await supabase
        .from("profiles")
        .update({
          avatar_url: avatarUrl,
        })
        .eq("id", user.id)
        .select("*")
        .single()

      if (updateError) {
        throw new Error(updateError.message)
      }

      setProfile({
        ...updatedProfile,
        location: profile.location || "",
      })

      setMessage("Profile photo updated.")
    } catch (uploadError) {
      console.error("Avatar upload failed:", uploadError)

      setError(
        uploadError.message ||
          "Could not update your profile photo."
      )
    } finally {
      setUploadingAvatar(false)
      event.target.value = ""
    }
  }

  // --------------------------------------------------
  // COVER UPLOAD
  // --------------------------------------------------

  async function handleCoverUpload(event) {
    const file = event.target.files?.[0]

    if (!file || !profile || !user?.id) return

    setError("")
    setMessage("")
    setUploadingCover(true)

    try {
      if (!file.type.startsWith("image/")) {
        throw new Error("Please choose an image file.")
      }

      if (file.size > MAX_COVER_SIZE) {
        throw new Error(
          "Cover photos must be 8MB or smaller."
        )
      }

      const extension =
        file.name.split(".").pop()?.toLowerCase() || "jpg"

      const filePath =
        `covers/${user.id}/cover.${extension}`

      const { error: uploadError } =
        await supabase.storage
          .from("avatars")
          .upload(filePath, file, {
            upsert: true,
            contentType: file.type,
          })

      if (uploadError) {
        throw new Error(uploadError.message)
      }

      const { data: publicUrlData } =
        supabase.storage
          .from("avatars")
          .getPublicUrl(filePath)

      const coverUrl =
        `${publicUrlData.publicUrl}?v=${Date.now()}`

      const {
        data: updatedProfile,
        error: updateError,
      } = await supabase
        .from("profiles")
        .update({
          cover_url: coverUrl,
        })
        .eq("id", user.id)
        .select("*")
        .single()

      if (updateError) {
        throw new Error(updateError.message)
      }

      setProfile({
        ...updatedProfile,
        location: profile.location || "",
      })

      setMessage("Cover photo updated.")
    } catch (uploadError) {
      console.error("Cover upload failed:", uploadError)

      setError(
        uploadError.message ||
          "Could not update your cover photo."
      )
    } finally {
      setUploadingCover(false)
      event.target.value = ""
    }
  }

  // --------------------------------------------------
  // RESET COVER
  // --------------------------------------------------

  async function resetCover() {
    if (!user?.id || resettingCover || !profile?.cover_url) {
      return
    }

    setError("")
    setMessage("")
    setResettingCover(true)

    try {
      // First remove the database reference.
      // Once cover_url is null, the normal CSS glowing
      // Tribe cover automatically appears again.

      const {
        data: updatedProfile,
        error: updateError,
      } = await supabase
        .from("profiles")
        .update({
          cover_url: null,
        })
        .eq("id", user.id)
        .select("*")
        .single()

      if (updateError) {
        throw new Error(updateError.message)
      }

      // Try to remove the old storage file too.
      // If storage deletion is blocked by RLS, we don't
      // fail the reset because the profile is already reset.
      const oldPath = `covers/${user.id}/cover`

      const extensions = [
        "jpg",
        "jpeg",
        "png",
        "webp",
        "gif",
      ]

      await supabase.storage
        .from("avatars")
        .remove(
          extensions.map(
            (extension) => `${oldPath}.${extension}`
          )
        )

      setProfile({
        ...updatedProfile,
        location: profile.location || "",
      })

      setMessage(
        "Cover reset to the default Tribe glow."
      )
    } catch (resetError) {
      console.error("Cover reset failed:", resetError)

      setError(
        resetError.message ||
          "Could not reset your cover."
      )
    } finally {
      setResettingCover(false)
    }
  }

  // --------------------------------------------------
  // LOADING STATE
  // --------------------------------------------------

  if (loading) {
    return (
      <>
        <header className="topbar">
          <h2>Profile</h2>
        </header>

        <div className="profile-loading">
          <Skeleton className="skeleton--cover" />
          <Skeleton className="skeleton--avatar" />
          <Skeleton className="skeleton--text" />
        </div>
      </>
    )
  }

  // --------------------------------------------------
  // ERROR STATE
  // --------------------------------------------------

  if (error && !profile) {
    return (
      <>
        <header className="topbar">
          <h2>Profile</h2>
        </header>

        <ErrorState
          title="Could not load profile"
          message={error}
          onRetry={loadProfile}
        />
      </>
    )
  }

  // --------------------------------------------------
  // NO PROFILE
  // --------------------------------------------------

  if (!profile) {
    return (
      <>
        <header className="topbar">
          <h2>Profile</h2>
        </header>

        <EmptyState
          title="No profile found"
          description="Your Tribe profile could not be found."
        />
      </>
    )
  }

  const websiteUrl = normalizeWebsite(
    profile.website || ""
  )

  // --------------------------------------------------
  // PROFILE UI
  // --------------------------------------------------

  return (
    <>
      <header className="topbar">
        <h2>Profile</h2>

        <Button
          className="search"
          variant="surface"
          onClick={() => navigate("/explore")}
        >
          ⌕ Search
        </Button>
      </header>

      <div className="profile-page">

        {/* ================= COVER ================= */}

        <div
          className={`profile-cover ${
            profile.cover_url
              ? "profile-cover--custom"
              : "profile-cover--default"
          }`}
          style={
            profile.cover_url
              ? {
                  backgroundImage:
                    `url("${profile.cover_url}")`,
                }
              : undefined
          }
        >
          <div className="profile-cover-actions">

            <input
              type="file"
              accept="image/*"
              id="cover-upload"
              className="visually-hidden"
              onChange={handleCoverUpload}
              disabled={uploadingCover}
            />

            <label
              htmlFor="cover-upload"
              className={`cover-upload-button ${
                uploadingCover ? "disabled" : ""
              }`}
            >
              {uploadingCover
                ? "Uploading..."
                : "📷 Change Cover"}
            </label>

            {profile.cover_url && (
              <button
                type="button"
                className="cover-reset-button"
                onClick={resetCover}
                disabled={resettingCover}
              >
                {resettingCover
                  ? "Resetting..."
                  : "↺ Reset Cover"}
              </button>
            )}
          </div>
        </div>

        {/* ================= PROFILE INFO ================= */}

        <div className="profile-info">

          <Avatar
            className="profile-avatar"
            src={profile.avatar_url}
            name={profile.display_name}
            label="Profile"
          />

          <input
            type="file"
            accept="image/*"
            id="avatar-upload"
            className="visually-hidden"
            onChange={handleAvatarUpload}
            disabled={uploadingAvatar}
          />

          <label
            htmlFor="avatar-upload"
            className={`avatar-upload-button ${
              uploadingAvatar ? "disabled" : ""
            }`}
          >
            {uploadingAvatar
              ? "Uploading..."
              : "Change Photo"}
          </label>

          <Button
            className="edit-profile"
            variant="surface"
            onClick={startEditing}
          >
            Edit Profile
          </Button>

          <h1>
            {profile.display_name || "Tribe Member"}
          </h1>

          <p className="username">
            @{profile.username || "member"}
          </p>

          {profile.bio && (
            <p className="bio">
              {profile.bio}
            </p>
          )}

          {(profile.location || profile.website) && (
            <div className="profile-meta-row">

              {profile.location && (
                <span className="profile-meta-item">
                  📍 {profile.location}
                </span>
              )}

              {websiteUrl && (
                <a
                  className="profile-meta-item profile-meta-link"
                  href={websiteUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  🔗{" "}
                  {websiteUrl
                    .replace(/^https?:\/\//, "")
                    .replace(/\/$/, "")}
                </a>
              )}

            </div>
          )}

          {message && (
            <div className="profile-success">
              ✓ {message}
            </div>
          )}

          {error && (
            <div className="profile-error">
              {error}
            </div>
          )}

          <div className="profile-stats">

            <div>
              <strong>{followerCount}</strong>
              <span>Followers</span>
            </div>

            <div>
              <strong>{followingCount}</strong>
              <span>Following</span>
            </div>

            <div>
              <strong>{progress ? progress.tribes : "—"}</strong>
              <span>Tribes</span>
            </div>

          </div>
        </div>

        <section className="v1-profile-progress" aria-label="XP and progress">
          <div className="v1-progress-heading"><div><strong>{progress ? `Level ${progress.level}` : "Progress unavailable"}</strong><span>{progress ? `${progress.xp.toLocaleString()} XP` : progressError || "Loading verified activity…"}</span></div>{progress && <span>{progress.currentLevelXp} / {progress.nextLevelXp} XP to next level</span>}</div>
          <div className="v1-progress-track"><span style={{ width: progress ? `${Math.min(100, (progress.currentLevelXp / progress.nextLevelXp) * 100)}%` : "0%" }} /></div>
          <div className="v1-progress-stats">{progress ? <><div><strong>{progress.posts}</strong><span>Posts</span></div><div><strong>{progress.tribes}</strong><span>Tribes</span></div><div><strong>{progress.likes}</strong><span>Likes given</span></div></> : <p>Activity totals will appear when they can be verified.</p>}</div>
          {progress && <small className="v1-progress-method">Calculated from recorded activity: 70 XP per post, 15 per joined Tribe, and 2 per like. Tribe Wars wins are unavailable.</small>}
        </section>

        {/* ================= TABS ================= */}

        <div className="profile-tabs">

          {TABS.map((tab) => (
            <Button
              key={tab}
              className={`profile-tab ${
                tab === activeTab ? "active" : ""
              }`}
              variant="ghost"
              onClick={() => setActiveTab(tab)}
            >
              {tab}
            </Button>
          ))}

        </div>

        {/* ================= POSTS ================= */}

        {activeTab === "Posts" && (
          <FeedPage
            authorId={user.id}
            showHeader={false}
            showComposer={false}
          />
        )}

        {/* ================= REPLIES ================= */}

        {activeTab === "Replies" && (
          <EmptyState
            title="No replies yet"
            description={`When ${
              profile.display_name || "this user"
            } replies to posts, they'll show up here.`}
          />
        )}

        {/* ================= MEDIA ================= */}

        {activeTab === "Media" && (
          <EmptyState
            title="No media yet"
            description={`Photos and videos ${
              profile.display_name || "this user"
            } shares will show up here.`}
          />
        )}

        {/* ================= TRIBES ================= */}

        {activeTab === "Tribes" && (
          <EmptyState
            title="Not in any Tribes yet"
            description={`Tribes ${
              profile.display_name || "this user"
            } joins will show up here.`}
          />
        )}

        {activeTab === "Achievements" && (
          <section className="v1-achievements" aria-label="Achievements">
            <h2>Achievements</h2>
            {progress ? <div className="v1-achievement-grid">{progress.achievements.map((achievement) => <article className={achievement.earned ? "earned" : "locked"} key={achievement.name}><span aria-hidden="true">{achievement.earned ? "✦" : "◇"}</span><div><strong>{achievement.name}</strong><small>{achievement.earned ? "Earned from recorded activity" : achievement.detail}</small></div><b>{achievement.earned ? "Earned" : "Locked"}</b></article>)}</div> : <EmptyState title="Achievements unavailable" description={progressError || "Verified activity is still loading."} />}
            <p className="v1-progress-method">No Tribe Wars wins or unavailable activities are counted as achievements.</p>
          </section>
        )}

      </div>

      {/* ================= EDIT PROFILE MODAL ================= */}

      {editing && (
        <Modal
          title="Edit profile"
          onClose={closeEditor}
        >
          <div className="edit-profile-box">

            <div className="edit-profile-heading">
              <strong>Personal information</strong>

              <span>
                Customize how people see you on Tribe.
              </span>
            </div>

            {/* DISPLAY NAME */}

            <label>
              Display name

              <input
                value={displayName}
                maxLength={MAX_DISPLAY_NAME}
                onChange={(event) =>
                  setDisplayName(event.target.value)
                }
                placeholder="Your display name"
              />

              <small>
                {displayName.length}/{MAX_DISPLAY_NAME}
              </small>
            </label>

            {/* USERNAME */}

            <label>
              Username

              <div className="username-input">
                <span>@</span>

                <input
                  value={username}
                  maxLength={MAX_USERNAME}
                  onChange={(event) =>
                    setUsername(
                      event.target.value
                        .toLowerCase()
                        .replace(
                          /[^a-z0-9_]/g,
                          ""
                        )
                    )
                  }
                  placeholder="username"
                />
              </div>

              <small>
                Letters, numbers, and underscores only.
              </small>
            </label>

            {/* BIO */}

            <label>
              Bio

              <textarea
                value={bio}
                maxLength={MAX_BIO}
                onChange={(event) =>
                  setBio(event.target.value)
                }
                placeholder="Tell your Tribe a little about yourself..."
                rows={4}
              />

              <small>
                {bio.length}/{MAX_BIO}
              </small>
            </label>

            {/* LOCATION */}

            <label>
              Location

              <input
                value={location}
                maxLength={MAX_LOCATION}
                onChange={(event) =>
                  setLocation(event.target.value)
                }
                placeholder="Where are you based?"
              />

              <small>
                This is saved securely with your account.
              </small>
            </label>

            {/* WEBSITE */}

            <label>
              Website

              <input
                value={website}
                maxLength={MAX_WEBSITE}
                onChange={(event) =>
                  setWebsite(event.target.value)
                }
                placeholder="yourwebsite.com"
              />

              <small>
                We'll automatically add https:// if needed.
              </small>
            </label>

            {/* ERROR */}

            {error && (
              <div className="profile-edit-error">
                {error}
              </div>
            )}

            {/* ACTIONS */}

            <div className="edit-profile-actions">

              <Button
                variant="surface"
                onClick={closeEditor}
                disabled={saving}
              >
                Cancel
              </Button>

              <Button
                onClick={saveProfile}
                disabled={
                  saving ||
                  !displayName.trim() ||
                  username.trim().length < 3
                }
              >
                {saving
                  ? "Saving..."
                  : "Save Changes"}
              </Button>

            </div>

          </div>
        </Modal>
      )}
    </>
  )
}
