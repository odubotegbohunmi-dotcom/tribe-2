import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { useSearchParams } from "react-router-dom"
import Button from "../../components/ui/Button"
import ErrorState from "../../components/ui/ErrorState"
import useAuth from "../../hooks/useAuth"
import { supabase } from "../../lib/supabase"
import TribeCreateWizard from "./TribeCreateWizard"

function createSlug(name) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 60)
}

export default function TribesPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const [tribes, setTribes] = useState([])
  const [tribeSettings, setTribeSettings] = useState({})
  const [joinedTribes, setJoinedTribes] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const [showCreate, setShowCreate] = useState(false)
  const [creating, setCreating] = useState(false)
  const [joiningId, setJoiningId] = useState(null)
  const [activeTab, setActiveTab] = useState("Discover")

  useEffect(() => {
    if (searchParams.get("view") === "joined") setActiveTab("Joined")
    if (searchParams.get("create") === "1") setShowCreate(true)
  }, [searchParams])

  async function loadTribes() {
    if (!user?.id) return

    setLoading(true)
    setError("")

    const [tribesResult, membershipsResult] = await Promise.all([
      supabase
        .from("tribes")
        .select(
          "id, slug, name, description, visibility, owner_id, created_at"
        )
        .eq("visibility", "public")
        .order("created_at", { ascending: false }),

      supabase
        .from("tribe_members")
        .select("tribe_id")
        .eq("user_id", user.id),
    ])

    if (tribesResult.error) {
      setError(tribesResult.error.message)
      setTribes([])
      setLoading(false)
      return
    }

    if (membershipsResult.error) {
      setError(membershipsResult.error.message)
      setLoading(false)
      return
    }

    const joinedMap = {}

    for (const membership of membershipsResult.data || []) {
      joinedMap[membership.tribe_id] = true
    }

    const tribeIds = (tribesResult.data || []).map((tribe) => tribe.id)
    if (tribeIds.length) {
      const settingsResult = await supabase.from("tribe_settings").select("tribe_id, accent_color, tags").in("tribe_id", tribeIds)
      setTribeSettings(settingsResult.error ? {} : Object.fromEntries((settingsResult.data || []).map((settings) => [settings.tribe_id, settings])))
    } else {
      setTribeSettings({})
    }
    setTribes(tribesResult.data || [])
    setJoinedTribes(joinedMap)
    setLoading(false)
  }

  useEffect(() => {
    void loadTribes()
  }, [user?.id])

  async function handleJoin(tribeId) {
    if (!user?.id || joinedTribes[tribeId] || joiningId) return

    setError("")
    setJoiningId(tribeId)

    const { error: joinError } = await supabase
      .from("tribe_members")
      .insert({
        tribe_id: tribeId,
        user_id: user.id,
        role: "member",
      })

    if (joinError) {
      setError(joinError.message)
      setJoiningId(null)
      return
    }

    setJoinedTribes((current) => ({
      ...current,
      [tribeId]: true,
    }))

    setJoiningId(null)
  }

  async function handleCreateTribe(values) {
    const name = values.name.trim()
    const description = values.description.trim()
    const slug = createSlug(name)

    if (!name) {
      setError("Enter a Tribe name.")
      return
    }

    if (name.length < 3) {
      setError("Tribe name must be at least 3 characters.")
      return
    }

    if (!slug || slug.length < 3) {
      setError("Choose a different Tribe name.")
      return
    }

    setCreating(true)
    setError("")

    const { data, error: createError } = await supabase
      .from("tribes")
      .insert({
        owner_id: user.id,
        slug,
        name,
        description,
        visibility: "public",
      })
      .select("id")
      .single()

    if (createError) {
      setError(createError.message)
      setCreating(false)
      return
    }

    const { error: settingsError } = await supabase.from("tribe_settings").insert({
      tribe_id: data.id,
      accent_color: values.color,
      tags: values.tags,
      announcement: values.announcement.trim() || null,
    })

    if (settingsError) {
      console.error("Tribe created but settings could not be saved:", settingsError)
      window.alert(`Tribe created, but its extra settings could not be saved: ${settingsError.message}`)
    }

    setShowCreate(false)
    setCreating(false)

    await loadTribes()

    if (data?.id) {
      navigate(`/tribes/${data.id}`)
    }
  }

  function openCreateModal() {
    setError("")
    setSearchParams((params) => { params.delete("create"); return params })
    setShowCreate(true)
  }

  function closeCreateModal() {
    if (creating) return

    setShowCreate(false)
    setError("")
    setSearchParams((params) => { params.delete("create"); return params })
  }

  function handleCardKeyDown(event, tribeId) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault()
      navigate(`/tribes/${tribeId}`)
    }
  }

  const visibleTribes =
    activeTab === "Created"
      ? tribes.filter((tribe) => tribe.owner_id === user?.id)
      : activeTab === "Joined"
        ? tribes.filter((tribe) => joinedTribes[tribe.id])
        : tribes

  return (
    <>
      <header className="topbar">
        <h2>Tribes</h2>

        <Button
          className="search"
          variant="surface"
          onClick={() => {
            // Search UI can be connected later.
          }}
        >
          <span aria-hidden="true">⌕</span>
          Search
        </Button>
      </header>

      <div className="tribes-page">

        {/* HERO */}
        <section className="tribes-hero">
          <div className="tribes-hero-content">
            <span className="tribes-eyebrow">
              COMMUNITY
            </span>

            <h1>Find your tribe.</h1>

            <p>
              Join communities built around what you love.
            </p>
          </div>

          <Button
            className="new-tribe-button"
            onClick={openCreateModal}
          >
            <span aria-hidden="true">+</span>
            Create Tribe
          </Button>
        </section>

        {/* TABS */}
        <div
          className="tribe-tabs"
          role="tablist"
          aria-label="Tribe categories"
        >
          {["Discover", "Joined", "Created"].map((tab) => (
            <Button
              key={tab}
              className={`tribe-tab ${
                activeTab === tab ? "active" : ""
              }`}
              variant="ghost"
              role="tab"
              aria-selected={activeTab === tab}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
            </Button>
          ))}
        </div>

        {error && (
          <ErrorState
            title="Could not update tribes"
            message={error}
          />
        )}

        {/* SECTION HEADER */}
        <div className="tribes-heading-row">
          <div>
            <h3 className="tribes-heading">
              {activeTab === "Created"
                ? "Your Tribes"
                : activeTab === "Joined"
                  ? "Joined Tribes"
                  : "Popular right now"}
            </h3>

            {!loading && visibleTribes.length > 0 && (
              <p className="tribes-count">
                {visibleTribes.length}{" "}
                {visibleTribes.length === 1
                  ? "community"
                  : "communities"}
              </p>
            )}
          </div>
        </div>

        {/* LOADING */}
        {loading ? (
          <div className="tribe-grid tribe-grid-loading">
            {[1, 2, 3, 4, 5, 6].map((item) => (
              <div
                className="tribe-skeleton"
                key={item}
              >
                <div className="skeleton-icon" />
                <div className="skeleton-line skeleton-title" />
                <div className="skeleton-line" />
                <div className="skeleton-line short" />
                <div className="skeleton-button" />
              </div>
            ))}
          </div>
        ) : !visibleTribes.length && !error ? (
          <div className="tribes-empty">
            <div className="tribes-empty-icon">
              {activeTab === "Created" ? "✦" : "◈"}
            </div>

            <h3>
              {activeTab === "Created"
                ? "No Tribes yet"
                : activeTab === "Joined"
                  ? "No joined Tribes"
                  : "No public Tribes yet"}
            </h3>

            <p>
              {activeTab === "Created"
                ? "Create your first community and bring people together."
                : activeTab === "Joined"
                  ? "Join a community and start connecting."
                  : "Check back soon for new communities."}
            </p>

            {activeTab === "Created" && (
              <Button onClick={openCreateModal}>
                Create your first Tribe
              </Button>
            )}
          </div>
        ) : (
          <div className="tribe-grid">
            {visibleTribes.map((tribe) => {
              const joined = joinedTribes[tribe.id]
              const joining = joiningId === tribe.id
              const isOwner = tribe.owner_id === user?.id

              return (
                <article
                  className="big-tribe-card v1-tribe-card"
                  style={{ "--tribe-accent": tribeSettings[tribe.id]?.accent_color || "#8062ff" }}
                  key={tribe.id}
                  role="button"
                  tabIndex={0}
                  onClick={() =>
                    navigate(`/tribes/${tribe.id}`)
                  }
                  onKeyDown={(event) =>
                    handleCardKeyDown(event, tribe.id)
                  }
                >
                  <div className="big-tribe-card-top">
                    <div className="big-tribe-icon">
                      <span aria-hidden="true">🏴</span>
                    </div>

                    {isOwner && (
                      <span className="tribe-owner-badge">
                        YOUR TRIBE
                      </span>
                    )}
                  </div>

                  <div className="big-tribe-card-content">
                    <h3>{tribe.name}</h3>

                    <p>
                      {tribe.description ||
                        "A Tribe community."}
                    </p>
                    {!!tribeSettings[tribe.id]?.tags?.length && <div className="v1-tribe-tags">{tribeSettings[tribe.id].tags.slice(0, 4).map((tag) => <span key={tag}>#{tag}</span>)}</div>}
                  </div>

                  <div className="big-tribe-card-footer">
                    <span className="tribe-visibility">
                      {isOwner
                        ? "Your Tribe"
                        : "Public community"}
                    </span>

                    <Button
                      variant="surface"
                      disabled={joined || joining}
                      onClick={(event) => {
                        event.stopPropagation()
                        void handleJoin(tribe.id)
                      }}
                    >
                      {joining
                        ? "Joining..."
                        : joined
                          ? "✓ Joined"
                          : "Join Tribe"}
                    </Button>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </div>

      {showCreate && <TribeCreateWizard onClose={closeCreateModal} onCreate={handleCreateTribe} creating={creating} error={error} />}
    </>
  )
}
