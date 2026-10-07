import { supabase } from "../../lib/supabase"

const postFields =
  "id, author_id, tribe_id, body, media, visibility, created_at, updated_at, profiles!posts_author_id_fkey(id, username, display_name, avatar_url)"

async function getAuthenticatedUser() {
  const { data, error } = await supabase.auth.getUser()

  if (error || !data.user) {
    throw new Error(error?.message || "You need to sign in to do that.")
  }

  return data.user
}

function groupInteractions(rows, viewerId) {
  return rows.reduce((result, row) => {
    if (!result[row.post_id]) {
      result[row.post_id] = {
        count: 0,
        active: false,
      }
    }

    result[row.post_id].count += 1

    if (row.user_id === viewerId) {
      result[row.post_id].active = true
    }

    return result
  }, {})
}

export async function fetchPosts({
  page = 0,
  pageSize = 20,
  authorId,
  tribeId,
  globalOnly = false,
} = {}) {
  let query = supabase
    .from("posts")
    .select(postFields)
    .order("created_at", { ascending: false })
    .range(
      page * pageSize,
      (page + 1) * pageSize - 1
    )

  if (authorId) {
    query = query.eq("author_id", authorId)
  }

  if (tribeId) {
    query = query.eq("tribe_id", tribeId)
  }

  if (globalOnly) {
    query = query.is("tribe_id", null)
  }

  const { data: posts, error } = await query

  if (error) {
    throw new Error(error.message)
  }

  if (!posts?.length) {
    return []
  }

  const postIds = posts.map((post) => post.id)

  const {
    data: currentUser,
    error: userError,
  } = await supabase.auth.getUser()

  if (userError) {
    throw new Error(userError.message)
  }

  const viewerId = currentUser.user?.id

  const [
    likesResponse,
    repostsResponse,
    commentsResponse,
  ] = await Promise.all([
    supabase
      .from("likes")
      .select("post_id, user_id")
      .in("post_id", postIds),

    supabase
      .from("reposts")
      .select("post_id, user_id")
      .in("post_id", postIds),

    supabase
      .from("comments")
      .select("post_id")
      .in("post_id", postIds),
  ])

  if (likesResponse.error) {
    throw new Error(likesResponse.error.message)
  }

  if (repostsResponse.error) {
    throw new Error(repostsResponse.error.message)
  }

  if (commentsResponse.error) {
    throw new Error(commentsResponse.error.message)
  }

  const likes = groupInteractions(
    likesResponse.data || [],
    viewerId
  )

  const reposts = groupInteractions(
    repostsResponse.data || [],
    viewerId
  )

  const comments = {}

  for (const comment of commentsResponse.data || []) {
    comments[comment.post_id] =
      (comments[comment.post_id] || 0) + 1
  }

  return posts.map((post) => ({
    ...post,

    author: Array.isArray(post.profiles)
      ? post.profiles[0]
      : post.profiles,

    likeCount: likes[post.id]?.count || 0,

    commentCount: comments[post.id] || 0,

    repostCount: reposts[post.id]?.count || 0,

    likedByViewer:
      likes[post.id]?.active || false,

    repostedByViewer:
      reposts[post.id]?.active || false,
  }))
}

export async function createPost({
  body,
  mediaUrl,
  tribeId,
}) {
  const trimmedBody = body.trim()
  const trimmedMediaUrl = mediaUrl.trim()

  if (!trimmedBody && !trimmedMediaUrl) {
    throw new Error(
      "Write something or add a media URL before posting."
    )
  }

  const { data, error } = await supabase.functions.invoke("publish-content", {
    body: {
      contentType: "post",
      body: trimmedBody,
      mediaUrl: trimmedMediaUrl || null,
      tribeId: tribeId || null,
    },
  })

  if (error || data?.error) {
    throw new Error(data?.error || error?.message || "Tribe Police is temporarily unavailable. Please try again.")
  }
  if (!data?.post) throw new Error("The approved post could not be saved. Please retry.")
  return data.post
}

/*
 * Toggle a like/repost safely.
 *
 * Returns:
 * {
 *   active: boolean
 * }
 */
async function toggleInteraction(table, postId) {
  const user = await getAuthenticatedUser()

  const {
    data: existing,
    error: findError,
  } = await supabase
    .from(table)
    .select("post_id")
    .eq("post_id", postId)
    .eq("user_id", user.id)
    .maybeSingle()

  if (findError) {
    throw new Error(findError.message)
  }

  if (existing) {
    const { error: deleteError } = await supabase
      .from(table)
      .delete()
      .eq("post_id", postId)
      .eq("user_id", user.id)

    if (deleteError) {
      throw new Error(deleteError.message)
    }

    return {
      active: false,
    }
  }

  const { error: insertError } = await supabase
    .from(table)
    .insert({
      post_id: postId,
      user_id: user.id,
    })

  if (insertError) {
    /*
     * If the database has a unique constraint and the
     * interaction was created by another request at the
     * same time, re-read the state instead of crashing.
     */
    const { data: alreadyExists } = await supabase
      .from(table)
      .select("post_id")
      .eq("post_id", postId)
      .eq("user_id", user.id)
      .maybeSingle()

    if (alreadyExists) {
      return {
        active: true,
      }
    }

    throw new Error(insertError.message)
  }

  return {
    active: true,
  }
}

export async function toggleLike(postId) {
  return toggleInteraction("likes", postId)
}

export async function toggleRepost(postId) {
  return toggleInteraction("reposts", postId)
}

export async function deletePost(postId) {
  const user = await getAuthenticatedUser()

  const { error } = await supabase
    .from("posts")
    .delete()
    .eq("id", postId)
    .eq("author_id", user.id)

  if (error) {
    throw new Error(error.message)
  }
}

export async function fetchComments(postId) {
  const { data, error } = await supabase
    .from("comments")
    .select(
      "id, post_id, author_id, body, created_at, profiles!comments_author_id_fkey(id, username, display_name, avatar_url)"
    )
    .eq("post_id", postId)
    .order("created_at", {
      ascending: true,
    })

  if (error) {
    throw new Error(error.message)
  }

  return (data || []).map((comment) => ({
    ...comment,
    author: Array.isArray(comment.profiles)
      ? comment.profiles[0]
      : comment.profiles,
  }))
}

export async function createComment({
  postId,
  body,
}) {
  const trimmedBody = body.trim()

  if (!trimmedBody) {
    throw new Error("Write a comment before sending.")
  }

  const { data, error } = await supabase.functions.invoke("publish-content", {
    body: { contentType: "comment", postId, body: trimmedBody },
  })

  if (error || data?.error) {
    throw new Error(data?.error || error?.message || "Tribe Police is temporarily unavailable. Please try again.")
  }
  if (!data?.comment) throw new Error("The approved comment could not be saved. Please retry.")
  const comment = data.comment

  return {
    ...comment,
    author: Array.isArray(comment.profiles)
      ? comment.profiles[0]
      : comment.profiles,
  }
}

export async function deleteComment(commentId) {
  const user = await getAuthenticatedUser()

  const { error } = await supabase
    .from("comments")
    .delete()
    .eq("id", commentId)
    .eq("author_id", user.id)

  if (error) {
    throw new Error(error.message)
  }
}
