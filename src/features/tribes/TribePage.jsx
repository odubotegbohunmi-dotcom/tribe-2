import PostCard from "../posts/PostCard"
import { fetchPosts } from "../posts/post.api"
import { useEffect, useState } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import Button from "../../components/ui/Button"
import ErrorState from "../../components/ui/ErrorState"
import useAuth from "../../hooks/useAuth"
import PostComposer from "../posts/PostComposer"
import { supabase } from "../../lib/supabase"
import { TribeAITab, TribeEventsTab, TribeQATab, TribeVoiceTab, TribeWikiTab } from "./TribeModules"

const TRIBE_SECTIONS = ["Feed", "Wiki", "Q&A", "Voice", "Events", "AI"]

export default function TribePage() {
  const { tribeId } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()

  const [tribe, setTribe] = useState(null)
  const [owner, setOwner] = useState(null)
  const [memberCount, setMemberCount] = useState(0)
  const [joined, setJoined] = useState(false)
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [postsLoading, setPostsLoading] = useState(true)
  const [joining, setJoining] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState("")
  const [activeSection, setActiveSection] = useState("Feed")
  const [tribeSettings, setTribeSettings] = useState(null)

  useEffect(() => {
    if (!tribeId || !user?.id) return

    async function loadTribe() {
      setLoading(true)
      setPostsLoading(true)
      setError("")

      const { data: tribeData, error: tribeError } =
        await supabase
          .from("tribes")
          .select(
            "id, owner_id, slug, name, description, visibility, created_at"
          )
          .eq("id", tribeId)
          .single()

      if (tribeError) {
        setError(tribeError.message)
        setLoading(false)
        setPostsLoading(false)
        return
      }

      setTribe(tribeData)

      const { data: settingsData } = await supabase
        .from("tribe_settings")
        .select("accent_color, tags, announcement")
        .eq("tribe_id", tribeData.id)
        .maybeSingle()
      setTribeSettings(settingsData || null)

      try {
        const tribePosts = await fetchPosts({
          tribeId: tribeData.id,
        })

        setPosts(tribePosts)
      } catch (postsError) {
        setError(postsError.message)
      } finally {
        setPostsLoading(false)
      }

      const [
        ownerResult,
        memberResult,
        membershipResult,
      ] = await Promise.all([
        supabase
          .from("profiles")
          .select(
            "id, username, display_name, avatar_url"
          )
          .eq("id", tribeData.owner_id)
          .single(),

        supabase
          .from("tribe_members")
          .select("user_id", {
            count: "exact",
            head: true,
          })
          .eq("tribe_id", tribeId),

        supabase
          .from("tribe_members")
          .select("tribe_id")
          .eq("tribe_id", tribeId)
          .eq("user_id", user.id)
          .maybeSingle(),
      ])

      if (ownerResult.error) {
        setError(ownerResult.error.message)
        setLoading(false)
        return
      }

      if (memberResult.error) {
        setError(memberResult.error.message)
        setLoading(false)
        return
      }

      if (membershipResult.error) {
        setError(membershipResult.error.message)
        setLoading(false)
        return
      }

      setOwner(ownerResult.data)
      setMemberCount(memberResult.count || 0)
      setJoined(Boolean(membershipResult.data))
      setLoading(false)
    }

    void loadTribe()
  }, [tribeId, user?.id])

  async function handleJoin() {
    if (!user?.id || !tribe || joined || joining) {
      return
    }

    setJoining(true)
    setError("")

    const { error: joinError } = await supabase
      .from("tribe_members")
      .insert({
        tribe_id: tribe.id,
        user_id: user.id,
        role: "member",
      })

    if (joinError) {
      setError(joinError.message)
      setJoining(false)
      return
    }

    setJoined(true)
    setMemberCount((count) => count + 1)
    setJoining(false)
  }

  async function handleDeleteTribe() {
    if (!tribe || tribe.owner_id !== user?.id) {
      return
    }

    const confirmed = window.confirm(
      `Delete "${tribe.name}"? This cannot be undone.`
    )

    if (!confirmed) {
      return
    }

    setDeleting(true)
    setError("")

    const { error: deleteError } = await supabase
      .from("tribes")
      .delete()
      .eq("id", tribe.id)

    if (deleteError) {
      setError(deleteError.message)
      setDeleting(false)
      return
    }

    navigate("/tribes")
  }

  function handlePosted() {
    fetchPosts({ tribeId: tribe.id })
      .then((newPosts) => {
        setPosts(newPosts)
      })
      .catch((postError) => {
        setError(postError.message)
      })
  }

  function handleDeleted(postId) {
    setPosts((current) =>
      current.filter((post) => post.id !== postId)
    )
  }

  function handleCommentCountChange(postId, delta) {
    setPosts((current) =>
      current.map((post) =>
        post.id === postId
          ? {
              ...post,
              commentCount: Math.max(
                0,
                post.commentCount + delta
              ),
            }
          : post
      )
    )
  }

  if (loading) {
    return (
      <div className="tribe-page">
        <p>Loading Tribe...</p>
      </div>
    )
  }

  if (error || !tribe) {
    return (
      <div className="tribe-page">
        <ErrorState
          title="Could not load Tribe"
          message={
            error || "This Tribe could not be found."
          }
        />

        <Button onClick={() => navigate("/tribes")}>
          Back to Tribes
        </Button>
      </div>
    )
  }

  const isOwner = tribe.owner_id === user?.id

  return (
    <div className="tribe-page">
      <div className="tribe-page__topbar">
        <Link to="/tribes" className="tribe-back">
          ← Tribes
        </Link>
      </div>

      <section className="tribe-header" style={tribeSettings?.accent_color ? { "--tribe-accent": tribeSettings.accent_color } : undefined}>
        <div className="tribe-header__icon">
          🏴
        </div>

        <div className="tribe-header__info">
          <span className="tribe-header__visibility">
            {tribe.visibility === "private"
              ? "Private Tribe"
              : "Public Tribe"}
          </span>

          <h1>{tribe.name}</h1>

          <p>
            {tribe.description ||
              "A Tribe community."}
          </p>

          <div className="tribe-header__stats">
            <span>
              <strong>{memberCount}</strong>{" "}
              {memberCount === 1
                ? "member"
                : "members"}
            </span>

            <span>•</span>

            <span>
              Created{" "}
              {new Date(
                tribe.created_at
              ).toLocaleDateString()}
            </span>
          </div>
        </div>

        <div className="tribe-header__action">
  {isOwner ? (
    <div className="tribe-owner-actions">
      <Button variant="surface" disabled>
        Owner
      </Button>

      <Button
        variant="surface"
        className="tribe-delete-button"
        disabled={deleting}
        onClick={handleDeleteTribe}
      >
        {deleting ? "Deleting..." : "🗑 Delete Tribe"}
      </Button>
    </div>
  ) : (
            <Button
              variant="surface"
              disabled={joined || joining}
              onClick={handleJoin}
            >
              {joining
                ? "Joining..."
                : joined
                  ? "Joined"
                  : "Join Tribe"}
            </Button>
          )}
        </div>
      </section>

      {tribeSettings?.announcement && <aside className="v1-tribe-announcement"><strong>ANNOUNCEMENT</strong><p>{tribeSettings.announcement}</p></aside>}
      <nav className="v1-tribe-section-nav" aria-label="Tribe sections" role="tablist">
        {TRIBE_SECTIONS.map((section) => <button type="button" key={section} role="tab" aria-selected={activeSection === section} className={activeSection === section ? "active" : ""} onClick={() => setActiveSection(section)}>{section}</button>)}
      </nav>

      {activeSection === "Feed" && <><section className="tribe-about">
        <h2>About this Tribe</h2>

        <p>
          {tribe.description ||
            "This Tribe doesn't have a description yet."}
        </p>

        {owner && (
          <div className="tribe-owner">
            <div>
              <strong>Created by</strong>

              <span>
                {owner.display_name ||
                  owner.username}
              </span>

              <small>
                @{owner.username}
              </small>
            </div>
          </div>
        )}
      </section>

      <section className="tribe-feed">
        <div className="tribe-feed__header">
          <h2>Tribe Feed</h2>

          <span>
            Posts from this community
          </span>
        </div>

        <PostComposer
          tribeId={tribe.id}
          onPosted={handlePosted}
        />

        {postsLoading ? (
          <div className="tribe-feed__empty">
            <p>Loading posts...</p>
          </div>
        ) : posts.length === 0 ? (
          <div className="tribe-feed__empty">
            <div>💬</div>

            <h3>No posts yet</h3>

            <p>
              Be the first person to post in{" "}
              {tribe.name}.
            </p>
          </div>
        ) : (
          <div className="tribe-posts">
            {posts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                onDeleted={handleDeleted}
                onCommentCountChange={
                  handleCommentCountChange
                }
              />
            ))}
          </div>
        )}
      </section>
      </>}
      {activeSection === "Wiki" && <TribeWikiTab tribeId={tribe.id} canContribute={joined || isOwner} />}
      {activeSection === "Q&A" && <TribeQATab tribeId={tribe.id} canContribute={joined || isOwner} />}
      {activeSection === "Events" && <TribeEventsTab tribeId={tribe.id} canContribute={joined || isOwner} canManage={isOwner} />}
      {activeSection === "Voice" && <TribeVoiceTab />}
      {activeSection === "AI" && <TribeAITab />}
    </div>
  )
}
