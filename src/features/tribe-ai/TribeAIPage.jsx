import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { useComposer } from "../../context/ComposerContext"
import { supabase } from "../../lib/supabase"

const QUICK_ACTIONS = [
  {
    icon: "🔥",
    color: "orange",
    title: "What's trending?",
    description: "See what's hot in the Tribe community right now.",
    prompt:
      "What's trending on Tribe right now? Show me popular conversations and communities.",
  },
  {
    icon: "👥",
    color: "blue",
    title: "Find communities",
    description: "Discover tribes and people based on your interests.",
    prompt:
      "Help me find Tribe communities that match my interests.",
  },
  {
    icon: "💡",
    color: "purple",
    title: "Post ideas",
    description: "Get creative ideas for posts, discussions and more.",
    prompt:
      "Give me some creative ideas for posts and discussions on Tribe.",
  },
  {
    icon: "🧭",
    color: "teal",
    title: "Explore Tribe",
    description: "Find new conversations, creators, and communities.",
    prompt:
      "Help me discover interesting conversations, creators, and communities on Tribe.",
  },
]

const RECENT_ACTIVITY = [
  {
    icon: "🎮",
    title: "Found 3 gaming tribes you may like",
    meta: "Based on your interests and activity",
    time: "2m ago",
    prompt: "Find gaming tribes that match my interests.",
  },
  {
    icon: "🔥",
    title: "Trending discussions near you",
    meta: "Music, sports and more",
    time: "7m ago",
    prompt: "Show me trending discussions on Tribe.",
  },
  {
    icon: "👤",
    title: "Creators you may enjoy",
    meta: "Similar to your interests",
    time: "12m ago",
    prompt: "Help me discover creators I may enjoy.",
  },
]

const AI_FEATURES = [
  {
    icon: "✦",
    title: "Smart Discovery",
    description: "Find what you'll actually love.",
    prompt:
      "Use Smart Discovery to help me find things on Tribe that match my interests.",
  },
  {
    icon: "👥",
    title: "Community Matching",
    description: "Meet your people faster.",
    prompt:
      "Help me find communities and people that match my interests.",
  },
  {
    icon: "✎",
    title: "Content Assistant",
    description: "Better posts, bigger reach.",
    prompt:
      "Help me create a better Tribe post.",
  },
  {
    icon: "🛡",
    title: "Safety Assistant",
    description: "A safer Tribe for everyone.",
    prompt:
      "Help me understand Tribe's safety tools and what I can do if I see something unsafe.",
  },
]

const SUGGESTIONS = [
  "What's trending?",
  "Find gaming tribes",
  "Give me post ideas",
  "Explore communities",
]

function formatAnswer(text) {
  if (!text) return null

  const lines = text.split("\n")

  return lines.map((line, index) => {
    const trimmed = line.trim()

    if (!trimmed) {
      return (
        <div
          key={`space-${index}`}
          className="tribeai-answer-space"
        />
      )
    }

    if (trimmed.startsWith("### ")) {
      return (
        <h3 key={`heading-${index}`}>
          {trimmed.slice(4)}
        </h3>
      )
    }

    if (trimmed.startsWith("## ")) {
      return (
        <h3 key={`heading-${index}`}>
          {trimmed.slice(3)}
        </h3>
      )
    }

    if (trimmed.startsWith("# ")) {
      return (
        <h3 key={`heading-${index}`}>
          {trimmed.slice(2)}
        </h3>
      )
    }

    if (/^[-*]\s+/.test(trimmed)) {
      return (
        <div
          key={`bullet-${index}`}
          className="tribeai-answer-bullet"
        >
          <span>•</span>
          <span>{trimmed.replace(/^[-*]\s+/, "")}</span>
        </div>
      )
    }

    if (/^\d+\.\s+/.test(trimmed)) {
      const match = trimmed.match(/^(\d+)\.\s+(.+)$/)

      return (
        <div
          key={`number-${index}`}
          className="tribeai-answer-number"
        >
          <span>{match?.[1]}.</span>
          <span>{match?.[2] || trimmed}</span>
        </div>
      )
    }

    return (
      <p key={`paragraph-${index}`}>
        {trimmed}
      </p>
    )
  })
}

export default function TribeAIPage() {
  const navigate = useNavigate()
  const { open: openComposer } = useComposer()

  const [prompt, setPrompt] = useState("")
  const [recentActivity, setRecentActivity] =
    useState(RECENT_ACTIVITY)

  const [showAllActivity, setShowAllActivity] =
    useState(false)

  const [lastSubmitted, setLastSubmitted] =
    useState(null)

  const [assistantReply, setAssistantReply] =
    useState("")

  const [isSubmitting, setIsSubmitting] =
    useState(false)

  const [errorMessage, setErrorMessage] =
    useState("")

  const [copied, setCopied] =
    useState(false)

  function focusPrompt() {
    requestAnimationFrame(() => {
      document
        .querySelector(".tribeai-input input")
        ?.focus()
    })
  }

  function handleSuggestionClick(text) {
    setPrompt(text)
    setErrorMessage("")
    focusPrompt()
  }

  function handleQuickAction(action) {
    setPrompt(action.prompt)
    setErrorMessage("")
    focusPrompt()
  }

  function handleActivityClick(item) {
    setPrompt(item.prompt)
    setErrorMessage("")
    focusPrompt()
  }

  function handleFeatureClick(feature) {
    setPrompt(feature.prompt)
    setErrorMessage("")
    focusPrompt()
  }

  async function askTribeAI(message) {
    const value = message.trim()
// Handle simple arithmetic instantly without calling Gemini.
const simpleMath = value
  .replace(/what is|what's|calculate|solve/gi, "")
  .trim()
  .match(/^(-?\d+(?:\.\d+)?)\s*([+\-*/x×÷])\s*(-?\d+(?:\.\d+)?)\??$/i)

if (simpleMath) {
  const a = Number(simpleMath[1])
  const operator = simpleMath[2].toLowerCase()
  const b = Number(simpleMath[3])

  let result

  if (operator === "+") result = a + b
  else if (operator === "-") result = a - b
  else if (operator === "*" || operator === "x" || operator === "×") {
    result = a * b
  } else if (operator === "/" || operator === "÷") {
    result = b === 0 ? "undefined" : a / b
  }

  if (result !== undefined) {
    setLastSubmitted({
      text: value,
      time: new Date(),
    })

    setAssistantReply(String(result))
    setErrorMessage("")
    setCopied(false)
    setPrompt("")
    setIsSubmitting(false)
    return
  }
}
    if (!value || isSubmitting) {
      return
    }

    setIsSubmitting(true)
    setErrorMessage("")
    setCopied(false)
    setAssistantReply("")

    setLastSubmitted({
      text: value,
      time: new Date(),
    })

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      const accessToken = session?.access_token

      if (!accessToken) {
        throw new Error(
          "You need to be signed in to use Tribe AI."
        )
      }

      const supabaseUrl =
        import.meta.env.VITE_SUPABASE_URL

      const supabaseKey =
        import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

      if (!supabaseUrl || !supabaseKey) {
        throw new Error(
          "Tribe AI configuration is missing."
        )
      }

      const response = await fetch(
        `${supabaseUrl}/functions/v1/tribe-ai`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
            apikey: supabaseKey,
          },
          body: JSON.stringify({
            message: value,
          }),
        }
      )

      if (!response.ok) {
        let errorBody = null

        try {
          errorBody = await response.json()
        } catch {
          // Ignore invalid JSON.
        }

        console.error(
          "Tribe AI server response:",
          errorBody
        )

        const serverError =
          errorBody?.error ||
          errorBody?.details?.error?.message ||
          errorBody?.details?.message

        setErrorMessage(
          serverError ||
            "Tribe AI couldn't answer right now. Please try again."
        )

        return
      }

      if (!response.body) {
        throw new Error(
          "Tribe AI returned no response stream."
        )
      }

      const reader =
        response.body.getReader()

      const decoder =
        new TextDecoder()

      let fullReply = ""
      let buffer = ""

      while (true) {
        const {
          value: chunk,
          done,
        } = await reader.read()

        if (done) {
          break
        }

        buffer += decoder.decode(
          chunk,
          { stream: true }
        )

        /*
         * Gemini's streaming endpoint returns
         * Server-Sent Events.
         */
        const events =
          buffer.split("\n\n")

        buffer =
          events.pop() || ""

        for (const event of events) {
          const lines =
            event.split("\n")

          for (const line of lines) {
            if (!line.startsWith("data:")) {
              continue
            }

            const jsonText =
              line.slice(5).trim()

            if (
              !jsonText ||
              jsonText === "[DONE]"
            ) {
              continue
            }

            try {
              const parsed =
                JSON.parse(jsonText)

              const parts =
                parsed?.candidates?.[0]
                  ?.content?.parts || []

              const text = parts
                .map((part) => part?.text || "")
                .join("")

              if (!text) {
                continue
              }

              fullReply += text

              /*
               * Update immediately so the answer
               * appears while Gemini is generating.
               */
              setAssistantReply(
                fullReply
              )
            } catch {
              /*
               * Some stream chunks can be incomplete.
               * The next chunk will finish the JSON.
               */
            }
          }
        }
      }

      if (!fullReply.trim()) {
        setErrorMessage(
          "Tribe AI returned an empty response. Please try again."
        )

        return
      }

      setRecentActivity((current) => [
        {
          icon: "✦",
          title: value,
          meta: "Tribe AI request",
          time: "now",
          prompt: value,
        },
        ...current,
      ])

      setPrompt("")
    } catch (error) {
      console.error(
        "Tribe AI request failed:",
        error
      )

      setErrorMessage(
        error?.message ||
          "Couldn't connect to Tribe AI. Check your connection and try again."
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleSubmit(event) {
    event.preventDefault()

    const value = prompt.trim()

    if (!value || isSubmitting) {
      return
    }

    await askTribeAI(value)
  }

  async function handleRegenerate() {
    if (
      !lastSubmitted?.text ||
      isSubmitting
    ) {
      return
    }

    await askTribeAI(
      lastSubmitted.text
    )
  }

  async function handleCopy() {
    if (!assistantReply) {
      return
    }

    try {
      await navigator.clipboard.writeText(
        assistantReply
      )

      setCopied(true)

      window.setTimeout(() => {
        setCopied(false)
      }, 1800)
    } catch (error) {
      console.error(
        "Failed to copy Tribe AI response:",
        error
      )

      setErrorMessage(
        "Couldn't copy the answer. Try selecting the text manually."
      )
    }
  }

  function handleCreatePost() {
    openComposer()
  }

  function handleViewAllActivity() {
    setShowAllActivity(
      (current) => !current
    )
  }

  function getActivityItems() {
    if (showAllActivity) {
      return recentActivity
    }

    return recentActivity.slice(0, 3)
  }

  return (
    <main className="tribeai-page">
      {/* ================= HERO ================= */}

      <section className="tribeai-hero">
        <div className="tribeai-hero-icon">
          ✦
        </div>

        <span className="tribeai-kicker">
          TRIBE AI
        </span>

        <h1>
          Your intelligence layer{" "}
          <span>inside Tribe.</span>
        </h1>

        <p>
          Discover communities, get personalized
          recommendations, and find what matters to
          you — faster.
        </p>

        <form
          className="tribeai-input"
          onSubmit={handleSubmit}
        >
          <span className="tribeai-input-icon">
            ✦
          </span>

          <input
            type="text"
            value={prompt}
            onChange={(event) =>
              setPrompt(
                event.target.value
              )
            }
            onKeyDown={(event) => {
              if (
                event.key === "Enter" &&
                !event.shiftKey
              ) {
                event.preventDefault()
                handleSubmit(event)
              }
            }}
            placeholder="Ask Tribe AI anything..."
            disabled={isSubmitting}
            autoComplete="off"
          />

          <button
            type="submit"
            aria-label="Send"
            disabled={
              !prompt.trim() ||
              isSubmitting
            }
          >
            {isSubmitting
              ? "…"
              : "➤"}
          </button>
        </form>

        <div className="tribeai-suggestions">
          {SUGGESTIONS.map(
            (suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() =>
                  handleSuggestionClick(
                    suggestion
                  )
                }
                disabled={isSubmitting}
              >
                {suggestion}
              </button>
            )
          )}
        </div>
      </section>

      {/* ================= AI RESPONSE ================= */}

      {(assistantReply ||
        isSubmitting ||
        errorMessage) && (
        <section className="tribeai-section">
          <div className="tribeai-card tribeai-response">
            <div className="tribeai-card-header">
              <h2>
                ✦ Tribe AI
              </h2>

              {assistantReply && (
                <button
                  type="button"
                  className="tribeai-link"
                  onClick={handleCopy}
                >
                  {copied
                    ? "Copied ✓"
                    : "Copy"}
                </button>
              )}
            </div>

            {lastSubmitted?.text && (
              <div className="tribeai-response-question">
                <span>✦</span>

                <strong>
                  {lastSubmitted.text}
                </strong>
              </div>
            )}

            <div className="tribeai-response-divider" />

            {/* Loading */}

            {isSubmitting &&
            !assistantReply ? (
              <div className="tribeai-response-loading">
                <div className="tribeai-response-icon">
                  ✦
                </div>

                <div>
                  <strong>
                    Tribe AI is thinking...
                  </strong>

                  <span>
                    Starting your answer
                  </span>
                </div>
              </div>
            ) : errorMessage ? (
              /* Error */

              <div className="tribeai-response-error">
                <div className="tribeai-response-icon">
                  !
                </div>

                <div>
                  <strong>
                    Tribe AI couldn't answer
                  </strong>

                  <span>
                    {errorMessage}
                  </span>

                  <button
                    type="button"
                    className="tribeai-response-retry"
                    onClick={
                      handleRegenerate
                    }
                    disabled={
                      isSubmitting
                    }
                  >
                    Try again
                  </button>
                </div>
              </div>
            ) : (
              /* Answer */

              <>
                <div className="tribeai-response-heading">
                  <div className="tribeai-response-icon">
                    ✦
                  </div>

                  <div>
                    <strong>
                      Tribe AI
                    </strong>

                    {isSubmitting && (
                      <span className="tribeai-live-label">
                        Live
                      </span>
                    )}
                  </div>
                </div>

                <div className="tribeai-response-text">
                  {formatAnswer(
                    assistantReply
                  )}

                  {isSubmitting && (
                    <span className="tribeai-stream-cursor">
                      ▌
                    </span>
                  )}
                </div>

                <div className="tribeai-response-actions">
                  <button
                    type="button"
                    onClick={handleCopy}
                    disabled={
                      !assistantReply
                    }
                  >
                    {copied
                      ? "Copied ✓"
                      : "Copy"}
                  </button>

                  <button
                    type="button"
                    onClick={
                      handleRegenerate
                    }
                    disabled={
                      isSubmitting
                    }
                  >
                    Regenerate
                  </button>
                </div>
              </>
            )}
          </div>
        </section>
      )}

      {/* ================= LAST REQUEST ================= */}

      {lastSubmitted &&
        !assistantReply &&
        !isSubmitting &&
        !errorMessage && (
          <section className="tribeai-section">
            <div className="tribeai-card">
              <div className="tribeai-card-header">
                <h2>
                  Latest AI Request
                </h2>

                <button
                  type="button"
                  className="tribeai-link"
                  onClick={() =>
                    setLastSubmitted(
                      null
                    )
                  }
                >
                  Clear
                </button>
              </div>

              <div className="tribeai-activity-item">
                <div className="tribeai-activity-icon">
                  ✦
                </div>

                <div className="tribeai-activity-content">
                  <strong>
                    {lastSubmitted.text}
                  </strong>

                  <span>
                    Tribe AI request
                  </span>
                </div>

                <time>
                  now
                </time>
              </div>
            </div>
          </section>
        )}

      {/* ================= QUICK ACTIONS ================= */}

      <section className="tribeai-section">
        <div className="tribeai-section-heading">
          <h2>Quick Actions</h2>
        </div>

        <div className="tribeai-quick-grid">
          {QUICK_ACTIONS.map(
            (action) => (
              <button
                key={action.title}
                type="button"
                className={`tribeai-quick-card ${action.color}`}
                onClick={() =>
                  handleQuickAction(
                    action
                  )
                }
                disabled={isSubmitting}
              >
                <div className="tribeai-quick-icon">
                  {action.icon}
                </div>

                <div className="tribeai-quick-content">
                  <h3>
                    {action.title}
                  </h3>

                  <p>
                    {action.description}
                  </p>
                </div>

                <span className="tribeai-quick-arrow">
                  →
                </span>
              </button>
            )
          )}
        </div>
      </section>

      {/* ================= ACTIVITY + FEATURES ================= */}

      <section className="tribeai-split">
        <div className="tribeai-card tribeai-activity">
          <div className="tribeai-card-header">
            <h2>
              Recent AI Activity
            </h2>

            <button
              type="button"
              className="tribeai-link"
              onClick={
                handleViewAllActivity
              }
            >
              {showAllActivity
                ? "Show less"
                : "View all"}{" "}
              →
            </button>
          </div>

          <div className="tribeai-activity-list">
            {getActivityItems().map(
              (item, index) => (
                <button
                  type="button"
                  className="tribeai-activity-item"
                  key={`${item.title}-${index}`}
                  onClick={() =>
                    handleActivityClick(
                      item
                    )
                  }
                  disabled={
                    isSubmitting
                  }
                >
                  <div className="tribeai-activity-icon">
                    {item.icon}
                  </div>

                  <div className="tribeai-activity-content">
                    <strong>
                      {item.title}
                    </strong>

                    <span>
                      {item.meta}
                    </span>
                  </div>

                  <time>
                    {item.time}
                  </time>
                </button>
              )
            )}
          </div>
        </div>

        <div className="tribeai-card tribeai-features">
          <div className="tribeai-card-header">
            <h2>
              AI Features
            </h2>
          </div>

          <div className="tribeai-features-grid">
            {AI_FEATURES.map(
              (feature) => (
                <button
                  type="button"
                  className="tribeai-feature"
                  key={feature.title}
                  onClick={() =>
                    handleFeatureClick(
                      feature
                    )
                  }
                  disabled={
                    isSubmitting
                  }
                >
                  <div className="tribeai-feature-icon">
                    {feature.icon}
                  </div>

                  <div>
                    <strong>
                      {feature.title}
                    </strong>

                    <span>
                      {feature.description}
                    </span>
                  </div>
                </button>
              )
            )}
          </div>
        </div>
      </section>

      {/* ================= MORE FROM TRIBE ================= */}

      <section className="tribeai-section">
        <div className="tribeai-card">
          <div className="tribeai-card-header">
            <h2>
              More from Tribe
            </h2>
          </div>

          <div className="tribeai-quick-grid">
            <button
              type="button"
              className="tribeai-quick-card blue"
              onClick={() =>
                navigate("/tribes")
              }
            >
              <div className="tribeai-quick-icon">
                👥
              </div>

              <div className="tribeai-quick-content">
                <h3>
                  Browse Tribes
                </h3>

                <p>
                  Explore the communities
                  already on Tribe.
                </p>
              </div>

              <span className="tribeai-quick-arrow">
                →
              </span>
            </button>

            <button
              type="button"
              className="tribeai-quick-card teal"
              onClick={() =>
                navigate("/explore")
              }
            >
              <div className="tribeai-quick-icon">
                🧭
              </div>

              <div className="tribeai-quick-content">
                <h3>
                  Explore
                </h3>

                <p>
                  See posts and content
                  from across Tribe.
                </p>
              </div>

              <span className="tribeai-quick-arrow">
                →
              </span>
            </button>

            <button
              type="button"
              className="tribeai-quick-card purple"
              onClick={
                handleCreatePost
              }
            >
              <div className="tribeai-quick-icon">
                ✎
              </div>

              <div className="tribeai-quick-content">
                <h3>
                  Create a Post
                </h3>

                <p>
                  Start a conversation
                  with your community.
                </p>
              </div>

              <span className="tribeai-quick-arrow">
                →
              </span>
            </button>
          </div>
        </div>
      </section>

      <p className="tribeai-disclaimer">
        Tribe AI can make mistakes.
        Check important information.
      </p>
    </main>
  )
}