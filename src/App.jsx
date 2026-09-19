import React from "react"
import { BrowserRouter, Routes, Route, NavLink } from "react-router-dom"
import { supabase } from "./supabase"
import "./App.css"

function Home() {
  return (
    <>
      <header className="topbar">
        <h2>Home</h2>
        <button className="search">⌕ Search</button>
      </header>

      <section className="composer">
        <div className="avatar">M</div>

        <div className="composer-content">
          <input
            type="text"
            placeholder="What's happening in your Tribe?"
          />

          <div className="composer-bottom">
            <div className="composer-options">
              <span>＋</span>
              <span>◉</span>
              <span>☺</span>
            </div>

            <button>Post</button>
          </div>
        </div>
      </section>

      <section className="post">
        <div className="post-header">
          <div className="avatar">T</div>

          <div>
            <strong>Tribe Community</strong>
            <small>@tribe · 2h</small>
          </div>
        </div>

        <p>
          Welcome to Tribe 2.0 👋
          <br />
          Find your people. Build your tribe.
        </p>

        <div className="post-actions">
          <span>♡ 24</span>
          <span>💬 8</span>
          <span>↻ 5</span>
          <span>⌁</span>
        </div>
      </section>

      <section className="post">
        <div className="post-header">
          <div className="avatar">A</div>

          <div>
            <strong>Alex</strong>
            <small>@alex · 4h</small>
          </div>
        </div>

        <p>Just found an amazing new tribe 🔥</p>

        <div className="post-actions">
          <span>♡ 17</span>
          <span>💬 3</span>
          <span>↻ 2</span>
          <span>⌁</span>
        </div>
      </section>
    </>
  )
}

function Explore() {
  const [followingJordan, setFollowingJordan] = React.useState(false)
  return (
    <>
      <header className="topbar">
        <h2>Explore</h2>
        <button className="search">⌕ Search</button>
      </header>

      <div className="explore-page">

        <div className="explore-search">
          <span>⌕</span>
          <input placeholder="Search Tribe..." />
        </div>

        <div className="categories">
          <button className="category active">For You</button>
          <button className="category">Gaming</button>
          <button className="category">Music</button>
          <button className="category">Sports</button>
          <button className="category">Technology</button>
        </div>

        <section className="explore-section">
          <div className="section-title">
            <h3>🔥 Trending</h3>
            <span>See all</span>
          </div>

          <div className="trending-card">
            <small>Trending in Tribe</small>
            <strong>#Football</strong>
            <span>18.4K posts</span>
          </div>

          <div className="trending-card">
            <small>Trending in Tribe</small>
            <strong>#Gaming</strong>
            <span>14.7K posts</span>
          </div>

          <div className="trending-card">
            <small>Trending in Tribe</small>
            <strong>#Afrobeats</strong>
            <span>9.8K posts</span>
          </div>
        </section>

        <section className="explore-section">
          <div className="section-title">
            <h3>👥 Popular Tribes</h3>
            <span>See all</span>
          </div>

          <div className="tribe-card">
            <div className="tribe-icon">🎮</div>
            <div>
              <strong>Gamers United</strong>
              <small>42.8K members</small>
            </div>
            <button>Join</button>
          </div>

          <div className="tribe-card">
            <div className="tribe-icon">🎵</div>
            <div>
              <strong>Music Central</strong>
              <small>31.2K members</small>
            </div>
            <button>Join</button>
          </div>

          <div className="tribe-card">
            <div className="tribe-icon">⚽</div>
            <div>
              <strong>Football Talk</strong>
              <small>27.5K members</small>
            </div>
            <button>Join</button>
          </div>
        </section>

        <section className="explore-section">
          <div className="section-title">
            <h3>✨ People to follow</h3>
            <span>See all</span>
          </div>

          <div className="person-card">
  <div className="avatar">J</div>

  <div>
    <strong>Jordan</strong>
    <small>@jordanmusic</small>
  </div>

  <button
    onClick={async () => {
      if (followingJordan) return
      const { data: me, error: meError } = await supabase
        .from("profiles")
        .select("id")
        .limit(1)
        .single()

      if (meError) {
        console.error("MY PROFILE ERROR:", meError)
        alert(meError.message)
        return
      }

      const { data: jordan, error: jordanError } = await supabase
        .from("profiles")
        .select("id")
        .eq("username", "jordanmusic")
        .single()

      if (jordanError) {
        console.error("JORDAN ERROR:", jordanError)
        alert(jordanError.message)
        return
      }

      const { error } = await supabase
        .from("follows")
        .insert({
          follower_id: me.id,
          following_id: jordan.id
        })

      if (error) {
        console.error("FOLLOW ERROR:", error)
        alert(error.message)
        return
      }

      setFollowingJordan(true)
    }}
  >
   {followingJordan ? "Following" : "Follow"}
  </button>
</div>

          <div className="person-card">
            <div className="avatar">K</div>
            <div>
              <strong>Kayla</strong>
              <small>@kaylagames</small>
            </div>
            <button>Follow</button>
          </div>

        </section>

      </div>
    </>
  )
}

function Tribes() {
  return (
    <>
      <header className="topbar">
        <h2>Tribes</h2>
        <button className="search">⌕ Search</button>
      </header>

      <div className="tribes-page">

        <div className="tribes-hero">
          <div>
            <h1>Find your tribe.</h1>
            <p>Join communities built around what you love.</p>
          </div>

          <button className="new-tribe-button">
            + Create Tribe
          </button>
        </div>

        <div className="tribe-tabs">
          <button className="tribe-tab active">Discover</button>
          <button className="tribe-tab">Joined</button>
          <button className="tribe-tab">Created</button>
        </div>

        <h3 className="tribes-heading">Popular right now</h3>

        <div className="tribe-grid">

          <div className="big-tribe-card">
            <div className="big-tribe-icon">🎮</div>
            <h3>Gamers United</h3>
            <p>Games • Community • Friends</p>
            <span>42.8K members</span>
            <button>Join Tribe</button>
          </div>

          <div className="big-tribe-card">
            <div className="big-tribe-icon">🎵</div>
            <h3>Music Central</h3>
            <p>Artists • Producers • Fans</p>
            <span>31.2K members</span>
            <button>Join Tribe</button>
          </div>

          <div className="big-tribe-card">
            <div className="big-tribe-icon">⚽</div>
            <h3>Football Talk</h3>
            <p>Football • Sports • Debate</p>
            <span>27.5K members</span>
            <button>Join Tribe</button>
          </div>

          <div className="big-tribe-card">
            <div className="big-tribe-icon">💻</div>
            <h3>Tech World</h3>
            <p>Technology • AI • Coding</p>
            <span>19.3K members</span>
            <button>Join Tribe</button>
          </div>

        </div>

      </div>
    </>
  )
}

function Live() {
  return <h1>Live</h1>
}

function Messages() {
  return <h1>Messages</h1>
}

function Notifications() {
  return <h1>Notifications</h1>
}

function Profile() {
  const [profile, setProfile] = React.useState(null)
const [editing, setEditing] = React.useState(false)
const [displayName, setDisplayName] = React.useState("")
const [username, setUsername] = React.useState("")
const [bio, setBio] = React.useState("")
const [followerCount, setFollowerCount] = React.useState(0)
const [followingCount, setFollowingCount] = React.useState(0)
const handleAvatarUpload = async (event) => {
  const file = event.target.files[0]

  if (!file) return

  const fileExt = file.name.split(".").pop()
  const fileName = `${profile.id}.${fileExt}`

  const { error: uploadError } = await supabase.storage
    .from("avatars")
    .upload(fileName, file, {
      upsert: true
    })

  if (uploadError) {
    console.error("AVATAR UPLOAD ERROR:", uploadError)
    alert(uploadError.message)
    return
  }

  const { data } = supabase.storage
    .from("avatars")
    .getPublicUrl(fileName)

  const avatarUrl = data.publicUrl

  const { error: updateError } = await supabase
    .from("profiles")
    .update({ avatar_url: avatarUrl })
    .eq("id", profile.id)

  if (updateError) {
    console.error("AVATAR UPDATE ERROR:", updateError)
    alert(updateError.message)
    return
  }

  setProfile({
    ...profile,
    avatar_url: avatarUrl
  })
}
  React.useEffect(() => {
    async function loadProfile() {
      const { data, error } = await supabase
  .from("profiles")
  .select("*")
  .limit(1)

      if (error) {
        console.error("PROFILE ERROR:", {
  message: error.message,
  details: error.details,
  hint: error.hint,
  code: error.code
})
        return
      }
console.log("PROFILE DATA:", data)
console.log("PROFILE ERROR:", error)

     setProfile(data?.[0] || null)
     const profileId = data?.[0]?.id

if (profileId) {
  const { count, error: followerError } = await supabase
    .from("follows")
    .select("*", { count: "exact", head: true })
    .eq("following_id", profileId)

  if (followerError) {
    console.error("FOLLOWER COUNT ERROR:", followerError)
    return
  }

  setFollowerCount(count || 0)
  const { count: followingCount, error: followingError } = await supabase
  .from("follows")
  .select("*", { count: "exact", head: true })
  .eq("follower_id", profileId)

if (followingError) {
  console.error("FOLLOWING COUNT ERROR:", followingError)
  return
}

setFollowingCount(followingCount || 0)
}
    }

    loadProfile()
  }, [])

  if (!profile) {
    return <div style={{ padding: "30px" }}>Loading profile...</div>
  }

  return (
    <>
      <header className="topbar">
        <h2>Profile</h2>
        <button className="search">⌕ Search</button>
      </header>

      <div className="profile-page">
        <div className="profile-cover"></div>

        <div className="profile-info">
          <div className="profile-avatar">
  {profile.avatar_url ? (
    <img src={profile.avatar_url} alt="Profile" />
  ) : (
    profile.display_name?.charAt(0).toUpperCase()
  )}
</div>

<input
  type="file"
  accept="image/*"
  id="avatar-upload"
  style={{ display: "none" }}
  onChange={handleAvatarUpload}
/>

<label
  htmlFor="avatar-upload"
  className="avatar-upload-button"
>
  Change Photo
</label>

          <button
  className="edit-profile"
  onClick={() => {
    setDisplayName(profile.display_name || "")
    setUsername(profile.username || "")
    setBio(profile.bio || "")
    setEditing(true)
  }}
>
  Edit Profile
</button>

{editing && (
  <div className="edit-profile-box">
    <input
      value={displayName}
      onChange={(e) => setDisplayName(e.target.value)}
      placeholder="Display name"
    />

    <input
      value={username}
      onChange={(e) => setUsername(e.target.value)}
      placeholder="Username"
    />

    <textarea
      value={bio}
      onChange={(e) => setBio(e.target.value)}
      placeholder="Bio"
    />

    <button
      onClick={async () => {
        const { data, error } = await supabase
          .from("profiles")
          .update({
            display_name: displayName,
            username: username,
            bio: bio
          })
          .eq("id", profile.id)
          .select()
          .single()

        if (error) {
          console.error("UPDATE ERROR:", error)
          alert(error.message)
          return
        }

        setProfile(data)
        setEditing(false)
      }}
    >
      Save Changes
    </button>

    <button
      className="cancel-edit"
      onClick={() => setEditing(false)}
    >
      Cancel
    </button>
  </div>
)}

          <h1>{profile.display_name}</h1>

          <p className="username">@{profile.username}</p>

          <p className="bio">{profile.bio}</p>

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
              <strong>0</strong>
              <span>Tribes</span>
            </div>
          </div>
        </div>

        <div className="profile-tabs">
          <button className="profile-tab active">Posts</button>
          <button className="profile-tab">Replies</button>
          <button className="profile-tab">Media</button>
          <button className="profile-tab">Tribes</button>
        </div>

        <div className="empty-profile">
          <div>✦</div>
          <h3>No posts yet</h3>
          <p>When you post something, it'll show up here.</p>
          <button>Create your first post</button>
        </div>
      </div>
    </>
  )
}
  


function App() {
  return (
    <BrowserRouter>
      <div className="tribe-app">

        <aside className="sidebar">
          <div className="logo">TRIBE</div>

          <nav>
           <NavLink to="/" className="nav-item">⌂ <span>Home</span></NavLink>
            <NavLink to="/explore" className="nav-item">◉ <span>Explore</span></NavLink>
            <NavLink to="/tribes" className="nav-item">♟ <span>Tribes</span></NavLink>
            <NavLink to="/live" className="nav-item">◉ <span>Live</span></NavLink>
            <NavLink to="/messages" className="nav-item">✉ <span>Messages</span></NavLink>
            <NavLink to="/notifications" className="nav-item">♡ <span>Notifications</span></NavLink>
            <NavLink to="/profile" className="nav-item">● <span>Profile</span></NavLink>
          </nav>

          <button className="create-button">+ Create</button>
        </aside>

        <main className="feed">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/explore" element={<Explore />} />
            <Route path="/tribes" element={<Tribes />} />
            <Route path="/live" element={<Live />} />
            <Route path="/messages" element={<Messages />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/profile" element={<Profile />} />
          </Routes>
        </main>

      </div>
    </BrowserRouter>
  )
}

export default App