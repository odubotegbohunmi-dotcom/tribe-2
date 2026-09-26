import { useCallback, useEffect, useState } from "react"
import Avatar from "../../components/ui/Avatar"
import Button from "../../components/ui/Button"
import ErrorState from "../../components/ui/ErrorState"
import Skeleton from "../../components/ui/Skeleton"
import useAuth from "../../hooks/useAuth"
import { createComment, deleteComment, fetchComments } from "./post.api"

export default function CommentList({ postId, onCountChange }) {
  const { user } = useAuth()
  const [comments, setComments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [body, setBody] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const loadComments = useCallback(async () => {
    setLoading(true); setError("")
    try { setComments(await fetchComments(postId)) } catch (commentError) { setError(commentError.message) } finally { setLoading(false) }
  }, [postId])

  useEffect(() => { void Promise.resolve().then(loadComments) }, [loadComments])

  async function handleSubmit(event) {
    event.preventDefault(); setSubmitting(true); setError("")
    try { const comment = await createComment({ postId, body }); setComments((current) => [...current, comment]); setBody(""); onCountChange(1) } catch (commentError) { setError(commentError.message) } finally { setSubmitting(false) }
  }

  async function handleDelete(commentId) {
    setError("")
    try { await deleteComment(commentId); setComments((current) => current.filter((comment) => comment.id !== commentId)); onCountChange(-1) } catch (commentError) { setError(commentError.message) }
  }

  return <section className="comments"><form className="comment-composer" onSubmit={handleSubmit}><input value={body} onChange={(event) => setBody(event.target.value)} maxLength="2000" placeholder="Write a reply..." aria-label="Comment text" /><Button type="submit" disabled={submitting || !body.trim()}>{submitting ? "Sending..." : "Reply"}</Button></form>
    {error && <ErrorState title="Could not update comments" message={error} onRetry={loadComments} />}
    {loading ? <div className="comment-skeletons"><Skeleton /><Skeleton /></div> : comments.map((comment) => <article className="comment" key={comment.id}><Avatar src={comment.author?.avatar_url} name={comment.author?.display_name} /><div className="comment__body"><strong>{comment.author?.display_name || "Tribe member"}</strong><small>@{comment.author?.username || "member"}</small><p>{comment.body}</p></div>{comment.author_id === user?.id && <Button variant="ghost" className="comment-delete" onClick={() => handleDelete(comment.id)}>Delete</Button>}</article>)}
  </section>
}
