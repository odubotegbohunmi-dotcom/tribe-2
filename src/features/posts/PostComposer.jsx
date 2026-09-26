import { useState } from "react"
import Avatar from "../../components/ui/Avatar"
import Button from "../../components/ui/Button"
import ErrorState from "../../components/ui/ErrorState"
import useAuth from "../../hooks/useAuth"
import { createPost } from "./post.api"

const MAX_LENGTH = 5000

export default function PostComposer({ onPosted, tribeId = null }) {
  const { user } = useAuth()
  const [body, setBody] = useState("")
  const [mediaUrl, setMediaUrl] = useState("")
  const [showMediaField, setShowMediaField] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")

  async function handleSubmit(event) {
    event.preventDefault()
    setError("")
    setSubmitting(true)

    try {
      await createPost({
        body,
        mediaUrl,
        tribeId,
      })

      setBody("")
      setMediaUrl("")
      setShowMediaField(false)
      onPosted()
    } catch (postError) {
      setError(postError.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form className="composer" onSubmit={handleSubmit}>
      <Avatar
        name={
          user?.user_metadata?.display_name ||
          user?.email ||
          "T"
        }
      />

      <div className="composer-content">
        <textarea
          value={body}
          onChange={(event) =>
            setBody(
              event.target.value.slice(0, MAX_LENGTH)
            )
          }
          placeholder="What's happening in your Tribe?"
          aria-label="Post text"
        />

        {showMediaField && (
          <input
            className="composer-media"
            type="url"
            value={mediaUrl}
            onChange={(event) =>
              setMediaUrl(event.target.value)
            }
            placeholder="Optional media URL or path"
            aria-label="Media URL or path"
          />
        )}

        {error && (
          <ErrorState
            title="Could not create post"
            message={error}
          />
        )}

        <div className="composer-bottom">
          <div className="composer-options">
            <Button
              type="button"
              variant="ghost"
              className="composer-media-toggle"
              onClick={() =>
                setShowMediaField(!showMediaField)
              }
            >
              ＋ Media
            </Button>

            <span>
              {body.length}/{MAX_LENGTH}
            </span>
          </div>

          <Button
            type="submit"
            disabled={
              submitting ||
              (!body.trim() && !mediaUrl.trim())
            }
          >
            {submitting ? "Posting..." : "Post"}
          </Button>
        </div>
      </div>
    </form>
  )
}