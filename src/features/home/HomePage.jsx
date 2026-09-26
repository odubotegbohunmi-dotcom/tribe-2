import { useEffect, useRef, useState } from "react"
import useAuth from "../../hooks/useAuth"
import { supabase } from "../../lib/supabase"

// NOTE: image uploads go to a Supabase Storage bucket called "posts".
// Create a public bucket named "posts" in your Supabase dashboard
// (Storage → New bucket → name it "posts", toggle Public on) or
// rename BUCKET_NAME below to match a bucket you already have.
const BUCKET_NAME = "posts"
const MAX_IMAGES = 4

function formatTime(dateString) {
  if (!dateString) return ""

  const diff = Date.now() - new Date(dateString).getTime()
  const minutes = Math.floor(diff / 60000)

  if (minutes < 1) return "now"
  if (minutes < 60) return `${minutes}m`
  if (minutes < 1440) return `${Math.floor(minutes / 60)}h`
  return `${Math.floor(minutes / 1440)}d`
}

function Avatar({ profile, sizeClass = "avatar" }) {
  const letter =
    profile?.display_name?.charAt(0)?.toUpperCase() ||
    profile?.username?.charAt(0)?.toUpperCase() ||
    "T"

  return (
    <div className={sizeClass}>
      {profile?.avatar_url ? (
        <img
          src={profile.avatar_url}
          alt=""
          onError={(event) => {
            event.currentTarget.style.display = "none"
          }}
        />
      ) : (
        letter
      )}
    </div>
  )
}

export default function HomePage() {
  const { user } = useAuth()

  const [profile, setProfile] = useState(null)
  const [posts, setPosts] = useState([])
  const [text, setText] = useState("")
  const [posting, setPosting] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const [showComposer, setShowComposer] = useState(false)

  // NEW: attached images for the post being composed
  const [mediaFiles, setMediaFiles] = useState([]) // File objects
  const [mediaPreviews, setMediaPreviews] = useState([]) // object URLs for preview
  const fileInputRef = useRef(null)

  async function loadHome() {
    if (!user?.id) return

    setLoading(true)
    setError("")

    const { data: profileData, error: profileError } =
      await supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url")
        .eq("id", user.id)
        .single()

    if (profileError) {
      console.error(profileError)
    } else {
      setProfile(profileData)
    }

    const { data: postData, error: postError } =
      await supabase
        .from("posts")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50)

    if (postError) {
      console.error(postError)
      setError(postError.message)
      setPosts([])
      setLoading(false)
      return
    }

    const authorIds = [
      ...new Set(
        (postData || [])
          .map((post) => post.author_id)
          .filter(Boolean)
      ),
    ]

    let profiles = []

    if (authorIds.length > 0) {
      const { data: profileRows } =
        await supabase
          .from("profiles")
          .select("id, username, display_name, avatar_url")
          .in("id", authorIds)

      profiles = profileRows || []
    }

    const profileMap = Object.fromEntries(
      profiles.map((item) => [item.id, item])
    )

    const postsWithProfiles = (postData || []).map((post) => ({
      ...post,
      profile: profileMap[post.author_id] || null,
    }))

    setPosts(postsWithProfiles)
    setLoading(false)
  }

  useEffect(() => {
    void loadHome()
  }, [user?.id])

  useEffect(() => {
    if (!showComposer) return

    function handleKeyDown(event) {
      if (event.key === "Escape") closeComposer()
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [showComposer])

  // NEW: revoke object URLs when they're no longer needed, so we
  // don't leak memory every time someone attaches an image
  useEffect(() => {
    return () => {
      mediaPreviews.forEach((url) => URL.revokeObjectURL(url))
    }
  }, [mediaPreviews])

  function openComposer() {
    setShowComposer(true)
  }

  function closeComposer() {
    if (posting) return // don't let people close mid-upload
    setShowComposer(false)
    setText("")
    setError("")
    mediaPreviews.forEach((url) => URL.revokeObjectURL(url))
    setMediaFiles([])
    setMediaPreviews([])
  }

  function handleMediaButtonClick() {
    fileInputRef.current?.click()
  }

  function handleFilesSelected(event) {
    const selected = Array.from(event.target.files || [])
    if (selected.length === 0) return

    const room = MAX_IMAGES - mediaFiles.length
    const accepted = selected.slice(0, Math.max(room, 0))

    if (accepted.length === 0) {
      setError(`You can attach up to ${MAX_IMAGES} images per post.`)
      event.target.value = ""
      return
    }

    const previews = accepted.map((file) => URL.createObjectURL(file))

    setMediaFiles((current) => [...current, ...accepted])
    setMediaPreviews((current) => [...current, ...previews])

    event.target.value = "" // allow re-selecting the same file later
  }

  function removeMediaAt(index) {
    setMediaFiles((current) => current.filter((_, i) => i !== index))
    setMediaPreviews((current) => {
      URL.revokeObjectURL(current[index])
      return current.filter((_, i) => i !== index)
    })
  }

  async function uploadMedia() {
    if (mediaFiles.length === 0) return []

    const uploaded = []

    for (const file of mediaFiles) {
      const path = `${user.id}/${Date.now()}-${file.name}`

      const { error: uploadError } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(path, file)

      if (uploadError) {
        throw new Error(
          `Image upload failed: ${uploadError.message}`
        )
      }

      const { data: publicUrlData } = supabase.storage
        .from(BUCKET_NAME)
        .getPublicUrl(path)

      uploaded.push({ url: publicUrlData.publicUrl })
    }

    return uploaded
  }

  async function createPost() {
    const body = text.trim()

    if ((!body && mediaFiles.length === 0) || !user?.id || posting) return

    setPosting(true)
    setError("")

    try {
      const media = await uploadMedia()

      const { error: insertError } = await supabase
        .from("posts")
        .insert({
          author_id: user.id,
          body,
          media,
          visibility: "public",
        })

      if (insertError) throw insertError

      setPosting(false)
      closeComposer()
      async function toggleLike(post) {
  if (!user?.id) return

  const wasLiked = post.likedByViewer

  // instant UI update
  setPosts((current) =>
    current.map((item) =>
      item.id === post.id
        ? {
            ...item,
            likedByViewer: !wasLiked,
            likeCount: Math.max(
              0,
              (item.likeCount || 0) + (wasLiked ? -1 : 1)
            ),
          }
        : item
    )
  )

  if (wasLiked) {
    const { error } = await supabase
      .from("likes")
      .delete()
      .eq("user_id", user.id)
      .eq("post_id", post.id)

    if (error) {
      console.error(error)
      await loadHome()
    }
  } else {
    const { error } = await supabase
      .from("likes")
      .insert({
        user_id: user.id,
        post_id: post.id,
      })

    if (error) {
      console.error(error)
      await loadHome()
    }
  }
}
    } catch (err) {
      console.error(err)
      setError(err.message || "Something went wrong posting that.")
      setPosting(false)
    }
  }

  async function deletePost(postId) {
    if (!postId) return

    const { error: deleteError } =
      await supabase
        .from("posts")
        .delete()
        .eq("id", postId)

    if (deleteError) {
      console.error(deleteError)
      setError(deleteError.message)
      return
    }

    setPosts((current) =>
      current.filter((post) => post.id !== postId)
    )
  }

  async function toggleLike(post) {
    if (!user?.id) return

    const { data: existingLike } =
      await supabase
        .from("likes")
        .select("user_id")
        .eq("user_id", user.id)
        .eq("post_id", post.id)
        .maybeSingle()

    if (existingLike) {
      await supabase
        .from("likes")
        .delete()
        .eq("user_id", user.id)
        .eq("post_id", post.id)
    } else {
      await supabase
        .from("likes")
        .insert({
          user_id: user.id,
          post_id: post.id,
        })
    }

    await loadHome()
  }

  const characterCount = text.length
  const nearLimit = characterCount > 4500
  const canPost =
    (text.trim().length > 0 || mediaFiles.length > 0) && !posting

  return (
    <div className="tribe-home">
      <div className="tribe-feed">

        <div className="welcome-card">
          <div>
            <span className="eyebrow">YOUR COMMUNITY</span>
            <h1>Welcome back 👋</h1>
            <p>Share something with the Tribe</p>
          </div>

          <button onClick={openComposer}>+ Create Post</button>
        </div>

        <div className="feed-header">
          <div>
            <h2>What's happening</h2>
            <p>See what the community is talking about</p>
          </div>

          <div className="live-dot">
            <i />
            Live
          </div>
        </div>

        {error && !showComposer && (
          <div className="empty-feed">
            <h3>Something went wrong</h3>
            <p>{error}</p>
          </div>
        )}

        <div className="feed-posts home-posts">
          {loading ? (
            <>
              <div className="loading-card" />
              <div className="loading-card" />
            </>
          ) : posts.length === 0 ? (
            <div className="empty-feed">
              <div className="empty-feed-icon">✦</div>
              <h3>No posts yet</h3>
              <p>Be the first person to post something</p>
            </div>
          ) : (
            posts.map((post) => {
              const postProfile =
                post.profile || {
                  display_name: "Tribe member",
                  username: "member",
                  avatar_url: null,
                }

              const media = Array.isArray(post.media) ? post.media : []

              return (
                <article className="post-card" key={post.id}>
                  <div className="post-header">
                    <Avatar profile={postProfile} />

                    <div>
                      <strong>{postProfile.display_name}</strong>
                      <small>
                        @{postProfile.username} ·{" "}
                        {formatTime(post.created_at)}
                      </small>
                    </div>

                    {post.author_id === user?.id && (
                      <button
                        className="post-delete"
                        onClick={() => deletePost(post.id)}
                      >
                        Delete
                      </button>
                    )}
                  </div>

                  {post.body && <p>{post.body}</p>}

                  {media.map((item, index) => {
                    const url = typeof item === "string" ? item : item?.url
                    if (!url) return null

                    return (
                      <div className="post-media" key={`${post.id}-${index}`}>
                        <img
                          src={url}
                          alt="Post media"
                          onError={(event) => {
                            event.currentTarget.style.display = "none"
                          }}
                        />
                      </div>
                    )
                  })}

                  <div className="post-actions">
                    <button onClick={() => toggleLike(post)}>♡ Like</button>
                    <button>💬 Comment</button>
                    <button>⟲ Repost</button>
                  </div>
                </article>
              )
            })
          )}
        </div>
      </div>

      <aside className="tribe-right">
        <div className="tribe-card">
          <div className="side-card-header">
            <div>
              <h3>Tribe AI</h3>
              <p>Personalized for you</p>
            </div>
            <span className="ai-badge">AI</span>
          </div>

          <div className="recommendation">
            <span>🎵</span>
            <div>
              <strong>Nigerian Music Creators</strong>
              <small>Based on your activity</small>
            </div>
            <span className="recommend-arrow">→</span>
          </div>

          <div className="recommendation">
            <span>🏈</span>
            <div>
              <strong>Defensive Training</strong>
              <small>Because you follow football</small>
            </div>
            <span className="recommend-arrow">→</span>
          </div>

          <div className="recommendation">
            <span>💻</span>
            <div>
              <strong>AI Builders</strong>
              <small>Trending in Tribe</small>
            </div>
            <span className="recommend-arrow">→</span>
          </div>
        </div>

        <div className="tribe-card">
          <div className="mission-card">
            <div className="mission-icon">✦</div>
            <div>
              <strong>Daily Mission</strong>
              <p>Join one conversation today</p>
            </div>
            <strong>+20 XP</strong>
          </div>
        </div>

        <div className="tribe-card">
          <h3>Trending</h3>
          <p>What's hot on Tribe</p>

          <div className="trend">
            <small>01</small>
            <div>
              <strong>Football</strong>
              <span>2.4K posts</span>
            </div>
          </div>

          <div className="trend">
            <small>02</small>
            <div>
              <strong>Music Creators</strong>
              <span>1.8K posts</span>
            </div>
          </div>

          <div className="trend">
            <small>03</small>
            <div>
              <strong>AI Builders</strong>
              <span>942 posts</span>
            </div>
          </div>
        </div>
      </aside>

      {showComposer && (
        <div className="modal-backdrop" onClick={closeComposer}>
          <div
            className="modal composer-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal__header">
              <div>
                <span className="eyebrow">✦ NEW POST</span>
                <h2>Create Post</h2>
              </div>
              <button
                className="modal-close"
                onClick={closeComposer}
                aria-label="Close"
                disabled={posting}
              >
                ✕
              </button>
            </div>

            <div className="composer">
              <Avatar profile={profile} />

              <div className="composer-content">
                <textarea
                  autoFocus
                  value={text}
                  maxLength={5000}
                  onChange={(event) => setText(event.target.value)}
                  placeholder="What's happening in your Tribe?"
                />

                {mediaPreviews.length > 0 && (
                  <div className="composer-media-grid">
                    {mediaPreviews.map((url, index) => (
                      <div className="media-thumb" key={url}>
                        <img src={url} alt="" />
                        <button
                          type="button"
                          className="media-thumb__remove"
                          onClick={() => removeMediaAt(index)}
                          aria-label="Remove image"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="visually-hidden"
                  onChange={handleFilesSelected}
                />

                <div className="composer-bottom">
                  <div className="composer-options">
                    <button
                      type="button"
                      className="composer-media-toggle"
                      onClick={handleMediaButtonClick}
                      disabled={mediaFiles.length >= MAX_IMAGES}
                    >
                      🖼 + Media
                      {mediaFiles.length > 0 && ` (${mediaFiles.length})`}
                    </button>

                    <span className={nearLimit ? "char-count char-count--warn" : "char-count"}>
                      {characterCount}/5000
                    </span>
                  </div>

                  <button
                    type="button"
                    disabled={!canPost}
                    onClick={createPost}
                  >
                    {posting ? "Posting…" : "Post"}
                  </button>
                </div>
              </div>
            </div>

            {error && (
              <div className="composer-error">{error}</div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}