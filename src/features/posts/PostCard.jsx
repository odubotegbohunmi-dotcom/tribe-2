import { useEffect, useState } from "react"
import Avatar from "../../components/ui/Avatar"
import Button from "../../components/ui/Button"
import ErrorState from "../../components/ui/ErrorState"
import IconButton from "../../components/ui/IconButton"
import useAuth from "../../hooks/useAuth"
import CommentList from "./CommentList"
import { deletePost, toggleLike, toggleRepost } from "./post.api"

function relativeTime(value) {
  if (!value) return ""

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return ""
  }

  const seconds = Math.max(
    0,
    Math.floor((Date.now() - date.getTime()) / 1000)
  )

  if (seconds < 60) return "now"
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d`

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
  }).format(date)
}

export default function PostCard({
  post,
  onDeleted,
  onCommentCountChange,
}) {
  const { user } = useAuth()

  const [liked, setLiked] = useState(Boolean(post.likedByViewer))
  const [likeCount, setLikeCount] = useState(Number(post.likeCount) || 0)

  const [reposted, setReposted] = useState(
    Boolean(post.repostedByViewer)
  )
  const [repostCount, setRepostCount] = useState(
    Number(post.repostCount) || 0
  )

  const [commentCount, setCommentCount] = useState(
    Number(post.commentCount) || 0
  )

  const [commentsOpen, setCommentsOpen] = useState(false)

  const [liking, setLiking] = useState(false)
  const [reposting, setReposting] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const [error, setError] = useState("")

  /*
   * Keep local state synchronized if the parent refreshes
   * the post from Supabase.
   */
  useEffect(() => {
    setLiked(Boolean(post.likedByViewer))
    setLikeCount(Number(post.likeCount) || 0)

    setReposted(Boolean(post.repostedByViewer))
    setRepostCount(Number(post.repostCount) || 0)

    setCommentCount(Number(post.commentCount) || 0)
  }, [
    post.id,
    post.likedByViewer,
    post.likeCount,
    post.repostedByViewer,
    post.repostCount,
    post.commentCount,
  ])

  async function handleLike() {
    if (liking || deleting) return

    const previousLiked = liked
    const previousCount = likeCount
    const nextLiked = !previousLiked

    setLiking(true)
    setError("")

    // Optimistic update
    setLiked(nextLiked)
    setLikeCount(
      Math.max(0, previousCount + (nextLiked ? 1 : -1))
    )

    try {
      const active = await toggleLike(post.id)

      /*
       * Supabase is the source of truth.
       * Correct the optimistic state if necessary.
       */
      setLiked(active)

      if (active !== nextLiked) {
        setLikeCount(
          Math.max(
            0,
            previousCount + (active ? 1 : -1)
          )
        )
      }
    } catch (actionError) {
      // Roll back optimistic update
      setLiked(previousLiked)
      setLikeCount(previousCount)

      setError(
        actionError?.message ||
          "Could not update your like."
      )
    } finally {
      setLiking(false)
    }
  }

  async function handleRepost() {
    if (reposting || deleting) return

    const previousReposted = reposted
    const previousCount = repostCount
    const nextReposted = !previousReposted

    setReposting(true)
    setError("")

    // Optimistic update
    setReposted(nextReposted)
    setRepostCount(
      Math.max(
        0,
        previousCount + (nextReposted ? 1 : -1)
      )
    )

    try {
      const active = await toggleRepost(post.id)

      setReposted(active)

      if (active !== nextReposted) {
        setRepostCount(
          Math.max(
            0,
            previousCount + (active ? 1 : -1)
          )
        )
      }
    } catch (actionError) {
      setReposted(previousReposted)
      setRepostCount(previousCount)

      setError(
        actionError?.message ||
          "Could not update your repost."
      )
    } finally {
      setReposting(false)
    }
  }

  function handleCommentsToggle() {
    if (deleting) return

    setError("")
    setCommentsOpen((open) => !open)
  }

  function handleCommentCountChange(delta) {
    const numericDelta = Number(delta) || 0

    setCommentCount((current) =>
      Math.max(0, current + numericDelta)
    )

    if (typeof onCommentCountChange === "function") {
      onCommentCountChange(post.id, numericDelta)
    }
  }

  async function handleDelete() {
    if (deleting) return

    const confirmed = window.confirm(
      "Delete this post?\n\nThis cannot be undone."
    )

    if (!confirmed) return

    setDeleting(true)
    setError("")

    try {
      await deletePost(post.id)

      if (typeof onDeleted === "function") {
        onDeleted(post.id)
      }
    } catch (deleteError) {
      setError(
        deleteError?.message ||
          "Could not delete this post."
      )
      setDeleting(false)
    }
  }

  const mediaUrl =
    Array.isArray(post.media)
      ? post.media[0]?.url
      : null

  const isAuthor =
    post.author_id === user?.id

  const displayName =
    post.author?.display_name ||
    "Tribe member"

  const username =
    post.author?.username ||
    "member"

  return (
    <article className="post post-card">
      {/* HEADER */}
      <div className="post-header">
        <Avatar
          src={post.author?.avatar_url}
          name={displayName}
          label={`${displayName}'s avatar`}
        />

        <div className="post-author">
          <strong>{displayName}</strong>

          <small>
            @{username} · {relativeTime(post.created_at)}
          </small>
        </div>

        {isAuthor && (
          <Button
            type="button"
            variant="ghost"
            className="post-delete"
            disabled={deleting}
            onClick={handleDelete}
          >
            {deleting ? "Deleting..." : "Delete"}
          </Button>
        )}
      </div>

      {/* BODY */}
      {post.body && (
        <p className="post-body">
          {post.body}
        </p>
      )}

      {/* MEDIA */}
      {mediaUrl && (
        <a
          className="post-media-link"
          href={mediaUrl}
          target="_blank"
          rel="noreferrer"
        >
          Attached media ↗
        </a>
      )}

      {/* ERROR */}
      {error && (
        <ErrorState
          title="Something went wrong"
          message={error}
        />
      )}

      {/* ACTIONS */}
      <div className="post-actions">
        <IconButton
          type="button"
          label={
            liked
              ? "Unlike post"
              : "Like post"
          }
          title={
            liked
              ? "Unlike"
              : "Like"
          }
          disabled={liking || deleting}
          className={`post-action ${
            liked ? "is-active like-active" : ""
          }`}
          onClick={handleLike}
        >
          <span
            className="post-action-icon"
            aria-hidden="true"
          >
            {liked ? "♥" : "♡"}
          </span>

          <span>
            {likeCount}
          </span>
        </IconButton>

        <IconButton
          type="button"
          label={
            commentsOpen
              ? "Hide comments"
              : "View comments"
          }
          title={
            commentsOpen
              ? "Hide comments"
              : "Comments"
          }
          disabled={deleting}
          className={`post-action ${
            commentsOpen ? "is-active" : ""
          }`}
          onClick={handleCommentsToggle}
        >
          <span
            className="post-action-icon"
            aria-hidden="true"
          >
            💬
          </span>

          <span>
            {commentCount}
          </span>
        </IconButton>

        <IconButton
          type="button"
          label={
            reposted
              ? "Undo repost"
              : "Repost"
          }
          title={
            reposted
              ? "Undo repost"
              : "Repost"
          }
          disabled={reposting || deleting}
          className={`post-action ${
            reposted
              ? "is-active repost-active"
              : ""
          }`}
          onClick={handleRepost}
        >
          <span
            className="post-action-icon"
            aria-hidden="true"
          >
            ↻
          </span>

          <span>
            {repostCount}
          </span>
        </IconButton>
      </div>

      {/* COMMENTS */}
      {commentsOpen && (
        <CommentList
          postId={post.id}
          onCountChange={handleCommentCountChange}
        />
      )}
    </article>
  )
}