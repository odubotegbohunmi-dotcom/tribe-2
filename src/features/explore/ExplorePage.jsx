import { useEffect, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import Avatar from "../../components/ui/Avatar"
import Button from "../../components/ui/Button"
import ErrorState from "../../components/ui/ErrorState"
import useAuth from "../../hooks/useAuth"
import { supabase } from "../../lib/supabase"

export default function ExplorePage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const searchInputRef = useRef(null)

  const [search, setSearch] = useState("")
  const [people, setPeople] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [following, setFollowing] = useState({})
  const [followingId, setFollowingId] = useState(null)

  useEffect(() => {
    if (!user?.id) return

    async function loadFollowing() {
      const { data, error: followError } = await supabase
        .from("follows")
        .select("following_id")
        .eq("follower_id", user.id)

      if (followError) {
        setError(followError.message)
        return
      }

      const followingMap = {}

      for (const follow of data || []) {
        followingMap[follow.following_id] = true
      }

      setFollowing(followingMap)
    }

    void loadFollowing()
  }, [user?.id])

  useEffect(() => {
    const query = search.trim()

    if (!query) {
      setPeople([])
      setError("")
      setLoading(false)
      return
    }

    const timer = setTimeout(async () => {
      setLoading(true)
      setError("")

      const { data, error: searchError } = await supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url")
        .or(
          `username.ilike.%${query}%,display_name.ilike.%${query}%`
        )
        .neq("id", user?.id)
        .limit(20)

      if (searchError) {
        setError(searchError.message)
        setPeople([])
      } else {
        setPeople(data || [])
      }

      setLoading(false)
    }, 300)

    return () => clearTimeout(timer)
  }, [search, user?.id])

  async function handleFollow(personId) {
    if (!user?.id || following[personId] || followingId) return

    setError("")
    setFollowingId(personId)

    const { error: followError } = await supabase
      .from("follows")
      .insert({
        follower_id: user.id,
        following_id: personId,
      })

    if (followError) {
      setError(followError.message)
      setFollowingId(null)
      return
    }

    setFollowing((current) => ({
      ...current,
      [personId]: true,
    }))

    setFollowingId(null)
  }

  function clearSearch() {
    setSearch("")
    setPeople([])
    setError("")

    requestAnimationFrame(() => {
      searchInputRef.current?.focus()
    })
  }

  function focusSearch() {
    requestAnimationFrame(() => {
      searchInputRef.current?.focus()
    })
  }

  function handleSearchKeyDown(event) {
    if (event.key === "Escape") {
      clearSearch()
    }
  }

  return (
    <>
      <header className="topbar">
        <h2>Explore</h2>
      </header>

      <div className="explore-page">

        {/* HERO */}
        <section className="explore-hero">
          <div className="explore-hero__glow explore-hero__glow--one" />
          <div className="explore-hero__glow explore-hero__glow--two" />

          <div className="explore-hero__content">
            <span className="explore-eyebrow">
              DISCOVER TRIBE
            </span>

            <h1>
              Find your people.
            </h1>

            <p>
              Discover members, connect with people who share your
              interests, and grow your Tribe network.
            </p>
          </div>

          <div className="explore-hero__icon" aria-hidden="true">
            <span>✦</span>
          </div>
        </section>

        {/* SEARCH */}
        <div className="explore-search">
          <span
            className="explore-search__icon"
            aria-hidden="true"
          >
            ⌕
          </span>

          <input
            ref={searchInputRef}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            onKeyDown={handleSearchKeyDown}
            placeholder="Search people by username or name..."
            aria-label="Search people"
            autoComplete="off"
          />

          {search && (
            <button
              className="explore-search__clear"
              onClick={clearSearch}
              type="button"
              aria-label="Clear search"
            >
              ✕
            </button>
          )}

          {!search && (
            <span className="explore-search__shortcut">
              Search
            </span>
          )}
        </div>

        {/* ERROR */}
        {error && (
          <ErrorState
            title="Search failed"
            message={error}
          />
        )}

        {/* SEARCH RESULTS */}
        {search.trim() && (
          <section className="explore-results">
            <div className="explore-results__header">
              <div>
                <span className="explore-section-label">
                  PEOPLE
                </span>

                <h2>
                  {loading
                    ? "Searching..."
                    : people.length
                      ? `${people.length} ${
                          people.length === 1
                            ? "person"
                            : "people"
                        } found`
                      : "No people found"}
                </h2>
              </div>

              {!loading && people.length > 0 && (
                <span className="explore-results__query">
                  “{search.trim()}”
                </span>
              )}
            </div>

            {loading && (
              <div className="explore-loading">
                {[1, 2, 3].map((item) => (
                  <div
                    className="explore-loading__person"
                    key={item}
                  >
                    <div className="explore-loading__avatar" />

                    <div className="explore-loading__info">
                      <div className="explore-loading__bar" />
                      <div className="explore-loading__bar short" />
                    </div>

                    <div className="explore-loading__button" />
                  </div>
                ))}
              </div>
            )}

            {!loading && !people.length && !error && (
              <div className="explore-empty">
                <div className="explore-empty__icon">
                  ⌕
                </div>

                <h3>
                  Nobody found
                </h3>

                <p>
                  Try searching with a different username or
                  display name.
                </p>

                <button
                  type="button"
                  onClick={clearSearch}
                >
                  Clear search
                </button>
              </div>
            )}

            {!loading &&
              people.map((person, index) => {
                const isFollowing = following[person.id]
                const isFollowingThisPerson =
                  followingId === person.id

                return (
                  <div
                    className="explore-person"
                    key={person.id}
                    style={{
                      "--explore-delay": `${index * 45}ms`,
                    }}
                  >
                    <div className="explore-person__avatar">
                      <Avatar
                        src={person.avatar_url}
                        name={
                          person.display_name ||
                          person.username
                        }
                      />
                    </div>

                    <div className="explore-person__info">
                      <strong>
                        {person.display_name ||
                          "Tribe member"}
                      </strong>

                      <span>
                        @{person.username}
                      </span>
                    </div>

                    <Button
                      className={`explore-follow ${
                        isFollowing
                          ? "is-following"
                          : ""
                      }`}
                      onClick={() =>
                        handleFollow(person.id)
                      }
                      disabled={
                        isFollowing ||
                        isFollowingThisPerson
                      }
                      variant={
                        isFollowing
                          ? "surface"
                          : "primary"
                      }
                    >
                      {isFollowingThisPerson
                        ? "Following..."
                        : isFollowing
                          ? "✓ Following"
                          : "Follow"}
                    </Button>
                  </div>
                )
              })}
          </section>
        )}

        {/* DEFAULT STATE */}
        {!search.trim() && (
          <section className="explore-discover">
            <div className="explore-discover__header">
              <div>
                <span className="explore-section-label">
                  GET STARTED
                </span>

                <h2>
                  Explore Tribe
                </h2>

                <p>
                  Find people, build your network, and discover
                  communities worth joining.
                </p>
              </div>
            </div>

            <div className="explore-discover__grid">

              {/* FIND PEOPLE */}
              <button
                type="button"
                className="explore-discover-card"
                onClick={focusSearch}
              >
                <div className="explore-discover-card__icon purple">
                  ⌕
                </div>

                <div className="explore-discover-card__content">
                  <h3>
                    Find people
                  </h3>

                  <p>
                    Search by username or display name.
                  </p>
                </div>

                <span
                  className="explore-discover-card__arrow"
                  aria-hidden="true"
                >
                  →
                </span>
              </button>

              {/* BUILD NETWORK */}
              <button
                type="button"
                className="explore-discover-card"
                onClick={() => {
                  window.scrollTo({
                    top: 0,
                    behavior: "smooth",
                  })

                  focusSearch()
                }}
              >
                <div className="explore-discover-card__icon blue">
                  ◉
                </div>

                <div className="explore-discover-card__content">
                  <h3>
                    Build your network
                  </h3>

                  <p>
                    Find people to follow and keep up with.
                  </p>
                </div>

                <span
                  className="explore-discover-card__arrow"
                  aria-hidden="true"
                >
                  →
                </span>
              </button>

              {/* DISCOVER TRIBES */}
              <button
                type="button"
                className="explore-discover-card"
                onClick={() => navigate("/tribes")}
              >
                <div className="explore-discover-card__icon pink">
                  ✦
                </div>

                <div className="explore-discover-card__content">
                  <h3>
                    Discover something new
                  </h3>

                  <p>
                    Explore communities built around your interests.
                  </p>
                </div>

                <span
                  className="explore-discover-card__arrow"
                  aria-hidden="true"
                >
                  →
                </span>
              </button>

            </div>
          </section>
        )}
      </div>
    </>
  )
}