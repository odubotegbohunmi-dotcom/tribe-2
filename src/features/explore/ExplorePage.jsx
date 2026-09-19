import { useState } from "react"
import Avatar from "../../components/ui/Avatar"
import Button from "../../components/ui/Button"
import ErrorState from "../../components/ui/ErrorState"
import useAuth from "../../hooks/useAuth"
import { supabase } from "../../lib/supabase"

const trends = [["#Football", "18.4K posts"], ["#Gaming", "14.7K posts"], ["#Afrobeats", "9.8K posts"]]
const tribes = [["🎮", "Gamers United", "42.8K members"], ["🎵", "Music Central", "31.2K members"], ["⚽", "Football Talk", "27.5K members"]]

export default function ExplorePage() {
  const { user } = useAuth()
  const [followingJordan, setFollowingJordan] = useState(false)
  const [followError, setFollowError] = useState("")

  async function followJordan() {
    if (followingJordan) return
    setFollowError("")
    const { data: jordanProfiles, error: jordanError } = await supabase.from("profiles").select("id").eq("username", "jordanmusic")
    const jordan = jordanProfiles?.[0]
    if (jordanError || !jordan) { setFollowError(jordanError?.message || "Jordan's profile could not be found."); return }
    const { error } = await supabase.from("follows").insert({ follower_id: user.id, following_id: jordan.id })
    if (error) { setFollowError(error.message); return }
    setFollowingJordan(true)
  }

  return (
    <>
      <header className="topbar"><h2>Explore</h2><Button className="search" variant="surface">⌕ Search</Button></header>
      <div className="explore-page">
        <div className="explore-search"><span>⌕</span><input placeholder="Search Tribe..." /></div>
        <div className="categories">{["For You", "Gaming", "Music", "Sports", "Technology"].map((category, index) => <Button key={category} className={`category ${index === 0 ? "active" : ""}`} variant="surface">{category}</Button>)}</div>
        <section className="explore-section"><div className="section-title"><h3>🔥 Trending</h3><span>See all</span></div>{trends.map(([name, count]) => <div className="trending-card" key={name}><small>Trending in Tribe</small><strong>{name}</strong><span>{count}</span></div>)}</section>
        <section className="explore-section"><div className="section-title"><h3>👥 Popular Tribes</h3><span>See all</span></div>{tribes.map(([icon, name, count]) => <div className="tribe-card" key={name}><div className="tribe-icon">{icon}</div><div><strong>{name}</strong><small>{count}</small></div><Button>Join</Button></div>)}</section>
        <section className="explore-section"><div className="section-title"><h3>✨ People to follow</h3><span>See all</span></div>
          {followError && <ErrorState title="Could not follow Jordan" message={followError} />}
          <div className="person-card"><Avatar name="J" /><div><strong>Jordan</strong><small>@jordanmusic</small></div><Button onClick={followJordan} disabled={followingJordan}>{followingJordan ? "Following" : "Follow"}</Button></div>
          <div className="person-card"><Avatar name="K" /><div><strong>Kayla</strong><small>@kaylagames</small></div><Button>Follow</Button></div>
        </section>
      </div>
    </>
  )
}
