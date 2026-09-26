import { useCallback, useEffect, useState } from "react"
import Button from "../../components/ui/Button"
import EmptyState from "../../components/ui/EmptyState"
import ErrorState from "../../components/ui/ErrorState"
import Skeleton from "../../components/ui/Skeleton"
import PostCard from "./PostCard"
import PostComposer from "./PostComposer"
import { fetchPosts } from "./post.api"

const PAGE_SIZE = 20

export default function FeedPage({
  authorId,
  showHeader = true,
  showComposer = true,
}) {
  const [posts, setPosts] = useState([])
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [error, setError] = useState("")

  const loadPage = useCallback(
    async (nextPage, replace = false) => {
      if (replace) {
        setLoading(true)
      } else {
        setLoadingMore(true)
      }

      setError("")

      try {
        const nextPosts = await fetchPosts({
          page: nextPage,
          pageSize: PAGE_SIZE,
          authorId,
          globalOnly: !authorId,
        })

        setPosts((current) =>
          replace ? nextPosts : [...current, ...nextPosts]
        )

        setPage(nextPage)
        setHasMore(nextPosts.length === PAGE_SIZE)
      } catch (feedError) {
        setError(feedError.message)
      } finally {
        setLoading(false)
        setLoadingMore(false)
      }
    },
    [authorId]
  )

  useEffect(() => {
    void Promise.resolve().then(() => loadPage(0, true))
  }, [loadPage])

  function removePost(postId) {
    setPosts((current) =>
      current.filter((post) => post.id !== postId)
    )
  }

  function changeCommentCount(postId, delta) {
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

  return (
    <>
      {showHeader && (
        <header className="topbar">
          <h2>Home</h2>

          <Button
            className="search"
            variant="surface"
          >
            ⌕ Search
          </Button>
        </header>
      )}

      {showComposer && (
        <PostComposer
          onPosted={() => loadPage(0, true)}
        />
      )}

      {loading && (
        <div className="feed-skeletons">
          <Skeleton className="feed-skeleton" />
          <Skeleton className="feed-skeleton" />
          <Skeleton className="feed-skeleton" />
        </div>
      )}

      {!loading && error && (
        <ErrorState
          title="Could not load the feed"
          message={error}
          onRetry={() => loadPage(0, true)}
        />
      )}

      {!loading &&
        !error &&
        !posts.length && (
          <EmptyState
            title={
              authorId
                ? "No posts yet"
                : "Your Tribe is quiet"
            }
            description={
              authorId
                ? "Posts you create will appear here."
                : "Start the conversation and create the first post."
            }
          />
        )}

      {!loading &&
        posts.map((post) => (
          <PostCard
            key={post.id}
            post={post}
            onDeleted={removePost}
            onCommentCountChange={
              changeCommentCount
            }
          />
        ))}

      {!loading &&
        !error &&
        hasMore &&
        posts.length > 0 && (
          <div className="feed-more">
            <Button
              variant="surface"
              disabled={loadingMore}
              onClick={() =>
                loadPage(page + 1)
              }
            >
              {loadingMore
                ? "Loading..."
                : "Load more"}
            </Button>
          </div>
        )}
    </>
  )
}