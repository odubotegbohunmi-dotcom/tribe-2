import { supabase } from "../../lib/supabase"

export async function loadProfileProgress(userId) {
  const [posts, tribes, likes] = await Promise.all([
    supabase.from("posts").select("id", { count: "exact", head: true }).eq("author_id", userId),
    supabase.from("tribe_members").select("tribe_id", { count: "exact", head: true }).eq("user_id", userId),
    supabase.from("likes").select("post_id", { count: "exact", head: true }).eq("user_id", userId),
  ])

  const errors = [posts.error, tribes.error, likes.error].filter(Boolean)
  if (errors.length) throw new Error(errors.map((error) => error.message).join(" · "))

  const activity = {
    posts: posts.count || 0,
    tribes: tribes.count || 0,
    likes: likes.count || 0,
  }
  const xp = activity.posts * 70 + activity.tribes * 15 + activity.likes * 2
  const level = Math.floor(xp / 500) + 1
  const levelStart = (level - 1) * 500

  return {
    ...activity,
    xp,
    level,
    currentLevelXp: xp - levelStart,
    nextLevelXp: 500,
    achievements: [
      { name: "First post", earned: activity.posts >= 1, detail: "Publish your first post" },
      { name: "Conversation starter", earned: activity.posts >= 5, detail: "Publish 5 posts" },
      { name: "Community member", earned: activity.tribes >= 1, detail: "Join a Tribe" },
      { name: "Good neighbor", earned: activity.likes >= 10, detail: "Like 10 posts" },
    ],
  }
}
