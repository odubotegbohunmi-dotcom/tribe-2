import { useEffect, useRef, useState } from "react"
import {
  useLocation,
  useNavigate,
  useParams,
} from "react-router-dom"

import Button from "../../components/ui/Button"
import ErrorState from "../../components/ui/ErrorState"
import useAuth from "../../hooks/useAuth"
import { useLiveSession } from "./LiveSessionProvider"
import { supabase } from "../../lib/supabase"

export default function LiveRoomPage() {
  const { streamId } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const {
    localStream,
    localStreamReady,
    cameraEnabled,
    microphoneEnabled,
    screenSharing,
    startCamera,
    stopLocalStream,
    toggleCamera,
    toggleMicrophone,
    toggleScreenShare,
    connectToStream,
    disconnectViewer,
    sendChatMessage,
  } = useLiveSession()

  const videoRef = useRef(null)
  const viewerVideoRef = useRef(null)

  const [stream, setStream] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [connected, setConnected] = useState(false)
  const [startingCamera, setStartingCamera] = useState(false)
  const [following, setFollowing] = useState(false)
  const [ending, setEnding] = useState(false)
  const [fullscreen, setFullscreen] = useState(false)

  const [chatMessages, setChatMessages] = useState([])
  const [chatText, setChatText] = useState("")

  const isStudio = location.pathname.endsWith("/studio")
  const isStreamer =
    stream?.streamer_id === user?.id

  /*
   * ---------------------------------------------------------
   * LOAD STREAM
   * ---------------------------------------------------------
   */

  useEffect(() => {
    let cancelled = false

    async function loadStream() {
      if (!streamId) return

      setLoading(true)
      setError("")

      const { data, error: streamError } =
        await supabase
          .from("live_streams")
          .select(
            "id, streamer_id, title, status, created_at, profiles!live_streams_streamer_id_fkey(id, username, display_name, avatar_url)"
          )
          .eq("id", streamId)
          .single()

      if (cancelled) return

      if (streamError) {
        setError(streamError.message)
        setLoading(false)
        return
      }

      setStream(data)
      setLoading(false)
    }

    void loadStream()

    return () => {
      cancelled = true
    }
  }, [streamId])

  /*
   * ---------------------------------------------------------
   * CONNECT TO LIVE STREAM
   * ---------------------------------------------------------
   */

  useEffect(() => {
    if (!stream || !user?.id) return

    let cancelled = false
    let retryTimer = null

    async function connect() {
      try {
        await connectToStream({
          streamId: stream.id,
          userId: user.id,
          streamerId: stream.streamer_id,
          isStreamer,

          onRemoteStream: (remoteStream) => {
            if (cancelled) return

            const video =
              viewerVideoRef.current

            if (!video) return

            video.srcObject = remoteStream

            void video.play().catch(() => {})

            setConnected(true)

            if (retryTimer) {
              window.clearInterval(
                retryTimer
              )

              retryTimer = null
            }
          },

          onChatMessage: (message) => {
            if (cancelled) return

            setChatMessages((current) => [
              ...current,
              message,
            ])
          },
        })

        /*
         * Viewer retry:
         *
         * If the streamer wasn't ready when
         * we first joined, try reconnecting.
         */

        if (!isStreamer) {
          retryTimer = window.setInterval(
            async () => {
              if (cancelled || connected) {
                return
              }

              try {
                await disconnectViewer()

                await connectToStream({
                  streamId: stream.id,
                  userId: user.id,
                  streamerId:
                    stream.streamer_id,
                  isStreamer: false,

                  onRemoteStream: (
                    remoteStream
                  ) => {
                    if (cancelled) return

                    const video =
                      viewerVideoRef.current

                    if (!video) return

                    video.srcObject =
                      remoteStream

                    void video
                      .play()
                      .catch(() => {})

                    setConnected(true)

                    if (retryTimer) {
                      window.clearInterval(
                        retryTimer
                      )

                      retryTimer = null
                    }
                  },

                  onChatMessage: (
                    message
                  ) => {
                    if (cancelled) return

                    setChatMessages(
                      (current) => [
                        ...current,
                        message,
                      ]
                    )
                  },
                })
              } catch {
                // Keep retrying.
              }
            },
            2500
          )
        }
      } catch (connectionError) {
        if (!cancelled) {
          setError(
            connectionError?.message ||
              "Unable to connect to the live stream."
          )
        }
      }
    }

    void connect()

    return () => {
      cancelled = true

      if (retryTimer) {
        window.clearInterval(
          retryTimer
        )
      }

      void disconnectViewer()
      setConnected(false)
    }
  }, [
    stream,
    user?.id,
    isStreamer,
    connectToStream,
    disconnectViewer,
  ])

  /*
   * ---------------------------------------------------------
   * LOCAL VIDEO
   * ---------------------------------------------------------
   */

  useEffect(() => {
    if (!localStreamReady) return
    if (!videoRef.current) return
    if (!localStream) return

    videoRef.current.srcObject =
      localStream

    void videoRef.current
      .play()
      .catch(() => {})
  }, [
    localStreamReady,
    localStream,
  ])

  /*
   * ---------------------------------------------------------
   * START CAMERA
   * ---------------------------------------------------------
   */

  async function handleStartCamera() {
    if (startingCamera) return

    setStartingCamera(true)
    setError("")

    try {
      const stream =
        await startCamera()

      if (videoRef.current) {
        videoRef.current.srcObject =
          stream

        void videoRef.current
          .play()
          .catch(() => {})
      }
    } catch (cameraError) {
      setError(
        cameraError?.message ||
          "Camera and microphone access was denied."
      )
    } finally {
      setStartingCamera(false)
    }
  }

  /*
   * ---------------------------------------------------------
   * SCREEN SHARE
   * ---------------------------------------------------------
   */

  async function toggleScreen() {
    try {
      setError("")
      await toggleScreenShare()
    } catch (shareError) {
      if (
        shareError?.name !==
        "NotAllowedError"
      ) {
        setError(
          shareError?.message ||
            "Screen sharing failed."
        )
      }
    }
  }

  /*
   * ---------------------------------------------------------
   * FOLLOW
   * ---------------------------------------------------------
   */

  async function toggleFollow() {
    if (!user?.id || !stream?.streamer_id) {
      return
    }

    if (user.id === stream.streamer_id) {
      return
    }

    setError("")

    if (following) {
      const { error: unfollowError } =
        await supabase
          .from("follows")
          .delete()
          .eq(
            "follower_id",
            user.id
          )
          .eq(
            "following_id",
            stream.streamer_id
          )

      if (unfollowError) {
        setError(
          unfollowError.message
        )
        return
      }

      setFollowing(false)
      return
    }

    const { error: followError } =
      await supabase
        .from("follows")
        .insert({
          follower_id: user.id,
          following_id:
            stream.streamer_id,
        })

    if (
      followError &&
      !followError.message
        .toLowerCase()
        .includes("duplicate")
    ) {
      setError(followError.message)
      return
    }

    setFollowing(true)
  }

  /*
   * ---------------------------------------------------------
   * CHAT
   * ---------------------------------------------------------
   */

  function sendMessage(event) {
    event.preventDefault()

    const text = chatText.trim()

    if (!text || !user?.id) return

    const message = {
      id: crypto.randomUUID(),
      userId: user.id,
      username:
        user.user_metadata?.username ||
        "member",
      displayName:
        user.user_metadata?.display_name ||
        "Tribe member",
      body: text,
    }

    sendChatMessage(message)

    setChatMessages((current) => [
      ...current,
      message,
    ])

    setChatText("")
  }

  /*
   * ---------------------------------------------------------
   * FULLSCREEN
   * ---------------------------------------------------------
   */

  function toggleFullscreen() {
    const element = isStreamer
      ? videoRef.current
      : viewerVideoRef.current

    if (!element) return

    if (!document.fullscreenElement) {
      void element
        .requestFullscreen()
        .then(() => {
          setFullscreen(true)
        })
        .catch(() => {})
    } else {
      void document.exitFullscreen()
      setFullscreen(false)
    }
  }

  /*
   * ---------------------------------------------------------
   * END LIVE
   * ---------------------------------------------------------
   */

  async function endLive() {
    if (!stream || !isStreamer) {
      return
    }

    const confirmed = window.confirm(
      "End this live stream?"
    )

    if (!confirmed) return

    setEnding(true)
    setError("")

    try {
      const { error: endError } =
        await supabase
          .from("live_streams")
          .update({
            status: "ended",
            ended_at:
              new Date().toISOString(),
          })
          .eq("id", stream.id)

      if (endError) {
        throw new Error(
          endError.message
        )
      }

      stopLocalStream()

      await disconnectViewer()

      navigate("/live", {
        replace: true,
      })
    } catch (endError) {
      setError(
        endError?.message ||
          "Unable to end the live stream."
      )

      setEnding(false)
    }
  }

  /*
   * ---------------------------------------------------------
   * LOADING
   * ---------------------------------------------------------
   */

  if (loading) {
    return (
      <div className="live-app">
        <div className="live-loading">
          <div className="live-spinner" />
          <span>
            Loading live...
          </span>
        </div>
      </div>
    )
  }

  /*
   * ---------------------------------------------------------
   * STREAM NOT FOUND
   * ---------------------------------------------------------
   */

  if (!stream) {
    return (
      <div className="tribe-page">
        <ErrorState
          title="Live unavailable"
          message={
            error ||
            "This stream could not be found."
          }
        />

        <Button
          onClick={() =>
            navigate("/live")
          }
        >
          Back to Live
        </Button>
      </div>
    )
  }

  /*
   * =========================================================
   * STREAMER STUDIO
   * =========================================================
   */

  if (isStreamer && isStudio) {
    return (
      <div className="live-app live-studio">
        <header className="live-header">
          <div className="live-header__left">
            <button
              className="live-icon-button"
              type="button"
              onClick={() =>
                navigate("/live")
              }
            >
              ←
            </button>

            <div>
              <span className="live-overline">
                TRIBE LIVE STUDIO
              </span>

              <h1>
                Stream dashboard
              </h1>
            </div>
          </div>

          <div className="live-header__status">
            <span />
            LIVE
          </div>
        </header>

        {error && (
          <div className="live-alert">
            {error}
          </div>
        )}

        <main className="studio-layout">
          <section className="studio-main">
            <div className="studio-preview-card">
              <div className="studio-preview-head">
                <span>
                  {localStreamReady
                    ? "LIVE PREVIEW"
                    : "STREAM PREVIEW"}
                </span>

                <button
                  type="button"
                  onClick={
                    toggleFullscreen
                  }
                >
                  {fullscreen
                    ? "Exit fullscreen"
                    : "Fullscreen"}
                </button>
              </div>

              <div className="studio-video">
                {localStreamReady ? (
                  <video
                    ref={videoRef}
                    autoPlay
                    muted
                    playsInline
                  />
                ) : (
                  <div className="studio-empty">
                    <div className="studio-empty__icon">
                      📹
                    </div>

                    <h2>
                      Your camera is off
                    </h2>

                    <p>
                      Start your camera and
                      microphone to begin
                      broadcasting.
                    </p>

                    <Button
                      onClick={
                        handleStartCamera
                      }
                      disabled={
                        startingCamera
                      }
                    >
                      {startingCamera
                        ? "Starting..."
                        : "Start Camera"}
                    </Button>
                  </div>
                )}

                {localStreamReady && (
                  <div className="studio-live-badge">
                    <span />
                    LIVE
                  </div>
                )}
              </div>

              {localStreamReady && (
                <div className="studio-controls">
                  <button
                    type="button"
                    onClick={
                      toggleMicrophone
                    }
                    className={
                      microphoneEnabled
                        ? "studio-control"
                        : "studio-control is-off"
                    }
                  >
                    <strong>
                      {microphoneEnabled
                        ? "🎙"
                        : "🔇"}
                    </strong>

                    <span>
                      {microphoneEnabled
                        ? "Mic"
                        : "Muted"}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={
                      toggleCamera
                    }
                    className={
                      cameraEnabled
                        ? "studio-control"
                        : "studio-control is-off"
                    }
                  >
                    <strong>
                      {cameraEnabled
                        ? "📹"
                        : "📷"}
                    </strong>

                    <span>
                      {cameraEnabled
                        ? "Camera"
                        : "Off"}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={
                      toggleScreen
                    }
                    className={
                      screenSharing
                        ? "studio-control active"
                        : "studio-control"
                    }
                  >
                    <strong>
                      🖥
                    </strong>

                    <span>
                      {screenSharing
                        ? "Stop Share"
                        : "Share Screen"}
                    </span>
                  </button>
                </div>
              )}
            </div>

            <div className="studio-info-card">
              <div className="studio-channel">
                <div className="studio-avatar">
                  {stream.profiles
                    ?.avatar_url ? (
                    <img
                      src={
                        stream.profiles
                          .avatar_url
                      }
                      alt=""
                    />
                  ) : (
                    (
                      stream.profiles
                        ?.display_name ||
                      "T"
                    )
                      .charAt(0)
                      .toUpperCase()
                  )}
                </div>

                <div>
                  <strong>
                    {stream.profiles
                      ?.display_name ||
                      "Tribe Member"}
                  </strong>

                  <span>
                    @
                    {stream.profiles
                      ?.username ||
                      "member"}
                  </span>
                </div>
              </div>

              <div className="studio-stream-info">
                <span>
                  STREAM TITLE
                </span>

                <h2>
                  {stream.title}
                </h2>
              </div>
            </div>
          </section>

          <aside className="live-chat-panel">
            <div className="chat-panel-head">
              <div>
                <strong>
                  Stream Chat
                </strong>

                <span>
                  Your live community
                </span>
              </div>

              <span className="chat-live-dot" />
            </div>

            <div className="chat-messages">
              {chatMessages.length ===
              0 ? (
                <div className="chat-empty">
                  <div>💬</div>

                  <strong>
                    Your chat is empty
                  </strong>

                  <span>
                    Messages from viewers
                    will appear here.
                  </span>
                </div>
              ) : (
                chatMessages.map(
                  (message) => (
                    <div
                      className="chat-message"
                      key={message.id}
                    >
                      <strong>
                        {
                          message.displayName
                        }
                      </strong>

                      <span>
                        {message.body}
                      </span>
                    </div>
                  )
                )
              )}
            </div>

            <form
              className="chat-input"
              onSubmit={
                sendMessage
              }
            >
              <input
                value={chatText}
                onChange={(event) =>
                  setChatText(
                    event.target.value
                  )
                }
                placeholder="Message chat..."
              />

              <button
                type="submit"
                disabled={
                  !chatText.trim()
                }
              >
                ↑
              </button>
            </form>
          </aside>
        </main>

        <footer className="studio-footer">
          <div>
            <span>
              Stream status
            </span>

            <strong>
              {localStreamReady
                ? "Broadcasting"
                : "Not broadcasting"}
            </strong>
          </div>

          <Button
            variant="surface"
            className="studio-end"
            onClick={endLive}
            disabled={ending}
          >
            {ending
              ? "Ending..."
              : "End Live"}
          </Button>
        </footer>
      </div>
    )
  }

  /*
   * =========================================================
   * VIEWER ROOM
   * =========================================================
   */

  return (
    <div className="live-app live-viewer">
      <header className="live-header">
        <div className="live-header__left">
          <button
            className="live-icon-button"
            type="button"
            onClick={() =>
              navigate("/live")
            }
          >
            ←
          </button>

          <div>
            <span className="live-overline">
              TRIBE LIVE
            </span>

            <h1>
              {stream.title}
            </h1>
          </div>
        </div>

        <div className="live-header__status">
          <span />
          LIVE
        </div>
      </header>

      {error && (
        <div className="live-alert">
          {error}
        </div>
      )}

      <main className="viewer-layout">
        <section className="viewer-main">
          <div className="viewer-player">
            <video
              ref={viewerVideoRef}
              autoPlay
              playsInline
              controls
            />

            {!connected && (
              <div className="viewer-player-empty">
                <div>◉</div>

                <strong>
                  Connecting...
                </strong>

                <span>
                  Waiting for the streamer.
                </span>
              </div>
            )}

            <div className="viewer-player-top">
              <span>
                <i />
                LIVE
              </span>
            </div>

            <button
              className="viewer-fullscreen"
              type="button"
              onClick={
                toggleFullscreen
              }
            >
              ⛶
            </button>
          </div>

          <div className="viewer-info">
            <div className="viewer-title-row">
              <div>
                <h2>
                  {stream.title}
                </h2>

                <div className="viewer-meta">
                  <span>
                    🔴 LIVE
                  </span>

                  <span>
                    {connected
                      ? "Connected"
                      : "Connecting"}
                  </span>
                </div>
              </div>

              {user?.id !==
                stream.streamer_id && (
                <button
                  className={
                    following
                      ? "follow-button following"
                      : "follow-button"
                  }
                  type="button"
                  onClick={
                    toggleFollow
                  }
                >
                  {following
                    ? "Following"
                    : "Follow"}
                </button>
              )}
            </div>

            <div className="viewer-channel">
              <div className="viewer-avatar">
                {stream.profiles
                  ?.avatar_url ? (
                  <img
                    src={
                      stream.profiles
                        .avatar_url
                    }
                    alt=""
                  />
                ) : (
                  (
                    stream.profiles
                      ?.display_name ||
                    "T"
                  )
                    .charAt(0)
                    .toUpperCase()
                )}
              </div>

              <div>
                <strong>
                  {stream.profiles
                    ?.display_name ||
                    "Tribe Member"}
                </strong>

                <span>
                  @
                  {stream.profiles
                    ?.username ||
                    "member"}
                </span>
              </div>
            </div>

            <div className="viewer-about">
              <h3>
                About this live
              </h3>

              <p>
                You're watching a live
                broadcast on Tribe.
              </p>
            </div>
          </div>
        </section>

        <aside className="live-chat-panel viewer-chat">
          <div className="chat-panel-head">
            <div>
              <strong>
                Live Chat
              </strong>

              <span>
                Talk with everyone
              </span>
            </div>

            <span className="chat-live-dot" />
          </div>

          <div className="chat-messages">
            {chatMessages.length ===
            0 ? (
              <div className="chat-empty">
                <div>💬</div>

                <strong>
                  Welcome to chat
                </strong>

                <span>
                  Be the first to say
                  something.
                </span>
              </div>
            ) : (
              chatMessages.map(
                (message) => (
                  <div
                    className="chat-message"
                    key={message.id}
                  >
                    <strong>
                      {
                        message.displayName
                      }
                    </strong>

                    <span>
                      {message.body}
                    </span>
                  </div>
                )
              )
            )}
          </div>

          <form
            className="chat-input"
            onSubmit={
              sendMessage
            }
          >
            <input
              value={chatText}
              onChange={(event) =>
                setChatText(
                  event.target.value
                )
              }
              placeholder="Send a message..."
            />

            <button
              type="submit"
              disabled={
                !chatText.trim()
              }
            >
              ↑
            </button>
          </form>
        </aside>
      </main>
    </div>
  )
}