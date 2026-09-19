import { useEffect, useState } from "react"
import Avatar from "../../components/ui/Avatar"
import Button from "../../components/ui/Button"
import EmptyState from "../../components/ui/EmptyState"
import ErrorState from "../../components/ui/ErrorState"
import Modal from "../../components/ui/Modal"
import Skeleton from "../../components/ui/Skeleton"
import { supabase } from "../../lib/supabase"

export default function ProfilePage() {
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [editing, setEditing] = useState(false)
  const [displayName, setDisplayName] = useState("")
  const [username, setUsername] = useState("")
  const [bio, setBio] = useState("")
  const [followerCount, setFollowerCount] = useState(0)
  const [followingCount, setFollowingCount] = useState(0)

  async function loadProfile() {
    setLoading(true)
    setError("")
    const { data, error: profileError } = await supabase.from("profiles").select("*").limit(1)
    if (profileError) { setError(profileError.message); setLoading(false); return }
    const selectedProfile = data?.[0] || null
    setProfile(selectedProfile)
    if (selectedProfile) {
      const { count: followers, error: followerError } = await supabase.from("follows").select("*", { count: "exact", head: true }).eq("following_id", selectedProfile.id)
      if (followerError) { setError(followerError.message); setLoading(false); return }
      const { count: following, error: followingError } = await supabase.from("follows").select("*", { count: "exact", head: true }).eq("follower_id", selectedProfile.id)
      if (followingError) { setError(followingError.message); setLoading(false); return }
      setFollowerCount(followers || 0)
      setFollowingCount(following || 0)
    }
    setLoading(false)
  }

  useEffect(() => {
    void Promise.resolve().then(loadProfile)
  }, [])

  function startEditing() {
    setDisplayName(profile.display_name || "")
    setUsername(profile.username || "")
    setBio(profile.bio || "")
    setEditing(true)
  }

  async function saveProfile() {
    setError("")
    const { data, error: updateError } = await supabase.from("profiles").update({ display_name: displayName, username, bio }).eq("id", profile.id).select().single()
    if (updateError) { setError(updateError.message); return }
    setProfile(data)
    setEditing(false)
  }

  async function handleAvatarUpload(event) {
    const file = event.target.files[0]
    if (!file || !profile) return
    setError("")
    const fileExt = file.name.split(".").pop()
    const fileName = `${profile.id}.${fileExt}`
    const { error: uploadError } = await supabase.storage.from("avatars").upload(fileName, file, { upsert: true })
    if (uploadError) { setError(uploadError.message); return }
    const { data } = supabase.storage.from("avatars").getPublicUrl(fileName)
    const avatarUrl = data.publicUrl
    const { error: updateError } = await supabase.from("profiles").update({ avatar_url: avatarUrl }).eq("id", profile.id)
    if (updateError) { setError(updateError.message); return }
    setProfile({ ...profile, avatar_url: avatarUrl })
  }

  if (loading) return <><header className="topbar"><h2>Profile</h2></header><div className="profile-loading"><Skeleton className="skeleton--cover" /><Skeleton className="skeleton--avatar" /><Skeleton className="skeleton--text" /></div></>
  if (error) return <><header className="topbar"><h2>Profile</h2></header><ErrorState title="Could not load profile" message={error} onRetry={loadProfile} /></>
  if (!profile) return <><header className="topbar"><h2>Profile</h2></header><EmptyState title="No profile found" description="Create a profile in Supabase to see it here." /></>

  return <>
    <header className="topbar"><h2>Profile</h2><Button className="search" variant="surface">⌕ Search</Button></header>
    <div className="profile-page">
      <div className="profile-cover" />
      <div className="profile-info">
        <Avatar className="profile-avatar" src={profile.avatar_url} name={profile.display_name} label="Profile" />
        <input type="file" accept="image/*" id="avatar-upload" className="visually-hidden" onChange={handleAvatarUpload} />
        <label htmlFor="avatar-upload" className="avatar-upload-button">Change Photo</label>
        <Button className="edit-profile" variant="surface" onClick={startEditing}>Edit Profile</Button>
        <h1>{profile.display_name}</h1><p className="username">@{profile.username}</p><p className="bio">{profile.bio}</p>
        <div className="profile-stats"><div><strong>{followerCount}</strong><span>Followers</span></div><div><strong>{followingCount}</strong><span>Following</span></div><div><strong>0</strong><span>Tribes</span></div></div>
      </div>
      <div className="profile-tabs">{["Posts", "Replies", "Media", "Tribes"].map((tab, index) => <Button key={tab} className={`profile-tab ${index === 0 ? "active" : ""}`} variant="ghost">{tab}</Button>)}</div>
      <EmptyState title="No posts yet" description="When you post something, it'll show up here." action={<Button>Create your first post</Button>} />
    </div>
    {editing && <Modal title="Edit profile" onClose={() => setEditing(false)}><div className="edit-profile-box">
      <input value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder="Display name" />
      <input value={username} onChange={(event) => setUsername(event.target.value)} placeholder="Username" />
      <textarea value={bio} onChange={(event) => setBio(event.target.value)} placeholder="Bio" />
      <Button onClick={saveProfile}>Save Changes</Button><Button variant="surface" onClick={() => setEditing(false)}>Cancel</Button>
    </div></Modal>}
  </>
}
