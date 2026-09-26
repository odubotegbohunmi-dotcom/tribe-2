import { useMemo, useState, useRef, useEffect } from "react"
import { supabase } from "../../lib/supabase"

const initialConversations = [
  {
    id: 1,
    name: "Alex Johnson",
    username: "@alex",
    avatar: "AJ",
    online: true,
    preview: "yeah fs maybe ??",
    time: "2m",
    unread: 2,
    pinned: false,
    muted: false,
    interests: ["Football", "Gaming", "Music"],
    messages: [
      {
        id: 1,
        from: "them",
        text: "yo what's up?",
        time: "2:14 PM",
      },
      {
        id: 2,
        from: "me",
        text: "nothing much lol",
        time: "2:15 PM",
      },
      {
        id: 3,
        from: "them",
        text: "wanna hop on later?",
        time: "2:16 PM",
      },
      {
        id: 4,
        from: "me",
        text: "yeah fs maybe ??",
        time: "2:17 PM",
      },
      {
        id: 5,
        from: "them",
        text: "perfect 🔥",
        time: "2:17 PM",
      },
    ],
  },
  {
    id: 2,
    name: "Sarah Williams",
    username: "@sarah",
    avatar: "SW",
    online: true,
    preview: "see you tomorrow!",
    time: "1h",
    unread: 1,
    pinned: false,
    muted: false,
    interests: ["Music", "Tribe AI"],
    messages: [
      {
        id: 1,
        from: "them",
        text: "see you tomorrow!",
        time: "1:42 PM",
      },
    ],
  },
  {
    id: 3,
    name: "Marcus Brown",
    username: "@marcus",
    avatar: "MB",
    online: false,
    preview: "that's crazy 😂",
    time: "15m",
    unread: 0,
    pinned: false,
    muted: false,
    interests: ["Gaming"],
    messages: [
      {
        id: 1,
        from: "them",
        text: "that's crazy 😂",
        time: "1:31 PM",
      },
    ],
  },
  {
    id: 4,
    name: "The Tribe Crew",
    username: "@tribecrew",
    avatar: "TC",
    online: true,
    preview: "New event this weekend!",
    time: "2h",
    unread: 3,
    pinned: false,
    muted: false,
    interests: ["Events", "Music"],
    messages: [
      {
        id: 1,
        from: "them",
        text: "New event this weekend!",
        time: "12:20 PM",
      },
    ],
  },
  {
    id: 5,
    name: "Jordan Lee",
    username: "@jordan",
    avatar: "JL",
    online: false,
    preview: "sent a photo",
    time: "4h",
    unread: 0,
    pinned: false,
    muted: false,
    interests: ["Football", "Drums"],
    messages: [
      {
        id: 1,
        from: "them",
        text: "sent a photo",
        time: "10:14 AM",
      },
    ],
  },
  {
    id: 6,
    name: "Taylor Kim",
    username: "@taylor",
    avatar: "TK",
    online: false,
    preview: "sounds good!",
    time: "6h",
    unread: 0,
    pinned: false,
    muted: false,
    interests: ["Gaming", "Tribe AI"],
    messages: [
      {
        id: 1,
        from: "them",
        text: "sounds good!",
        time: "8:32 AM",
      },
    ],
  },
]

const emojis = [
  "😀",
  "😂",
  "🔥",
  "❤️",
  "😭",
  "💀",
  "🙏",
  "👀",
  "🤣",
  "😎",
  "👍",
  "🎉",
]

function Avatar({ conversation, small = false }) {
  return (
    <div
      className={`messages-avatar ${
        small ? "messages-avatar-small" : ""
      }`}
    >
      {conversation.avatar}

      {conversation.online && (
        <span className="messages-online-dot" />
      )}
    </div>
  )
}

function Modal({ children, onClose }) {
  return (
    <div className="messages-modal-backdrop" onClick={onClose}>
      <div
        className="messages-modal"
        onClick={(event) => event.stopPropagation()}
      >
        {children}
      </div>
    </div>
  )
}

export default function MessagesPage() {
  const [conversations, setConversations] = useState(
    initialConversations
  )

  const [activeId, setActiveId] = useState(1)
  const [search, setSearch] = useState("")
  const [message, setMessage] = useState("")
  const [tab, setTab] = useState("all")

  const [showNewMessage, setShowNewMessage] =
    useState(false)

  const [showEmoji, setShowEmoji] = useState(false)

  const [showMore, setShowMore] = useState(false)

  const [showChatSearch, setShowChatSearch] =
    useState(false)

  const [chatSearch, setChatSearch] = useState("")

  const [showProfile, setShowProfile] =
    useState(false)

  const [showMedia, setShowMedia] = useState(false)

  const [showTribes, setShowTribes] =
    useState(false)

  const [showPinned, setShowPinned] =
    useState(false)

  const [showCall, setShowCall] = useState(null)

  const [showBlockConfirm, setShowBlockConfirm] =
    useState(false)

  const [showReportConfirm, setShowReportConfirm] =
    useState(false)

  const [file, setFile] = useState(null)

  const [newName, setNewName] = useState("")

  const fileInputRef = useRef(null)

  const activeConversation =
    conversations.find(
      (item) => item.id === activeId
    ) || conversations[0]

  const filteredConversations = useMemo(() => {
    const value = search.trim().toLowerCase()

    let result = conversations

    if (tab === "unread") {
      result = result.filter(
        (conversation) => conversation.unread > 0
      )
    }

    if (tab === "pinned") {
      result = result.filter(
        (conversation) => conversation.pinned
      )
    }

    if (!value) return result

    return result.filter(
      (conversation) =>
        conversation.name
          .toLowerCase()
          .includes(value) ||
        conversation.username
          .toLowerCase()
          .includes(value) ||
        conversation.preview
          .toLowerCase()
          .includes(value)
    )
  }, [conversations, search, tab])

  const filteredMessages = useMemo(() => {
    const value = chatSearch.trim().toLowerCase()

    if (!value) {
      return activeConversation.messages
    }

    return activeConversation.messages.filter(
      (item) =>
        item.text.toLowerCase().includes(value)
    )
  }, [activeConversation, chatSearch])

  function selectConversation(id) {
    setActiveId(id)

    setConversations((current) =>
      current.map((conversation) =>
        conversation.id === id
          ? {
              ...conversation,
              unread: 0,
            }
          : conversation
      )
    )
  }

  function sendMessage(customText = null) {
    const text = (
      customText !== null ? customText : message
    ).trim()

    if (!text) return

    const newMessage = {
      id: Date.now(),
      from: "me",
      text,
      time: new Date().toLocaleTimeString([], {
        hour: "numeric",
        minute: "2-digit",
      }),
    }

    setConversations((current) =>
      current.map((conversation) =>
        conversation.id === activeConversation.id
          ? {
              ...conversation,
              preview: text,
              time: "now",
              messages: [
                ...conversation.messages,
                newMessage,
              ],
            }
          : conversation
      )
    )

    setMessage("")
    setShowEmoji(false)
  }

  function handleKeyDown(event) {
    if (
      event.key === "Enter" &&
      !event.shiftKey
    ) {
      event.preventDefault()
      sendMessage()
    }
  }

  function togglePinConversation() {
    setConversations((current) =>
      current.map((conversation) =>
        conversation.id === activeConversation.id
          ? {
              ...conversation,
              pinned: !conversation.pinned,
            }
          : conversation
      )
    )

    setShowMore(false)
  }

  function toggleMute() {
    setConversations((current) =>
      current.map((conversation) =>
        conversation.id === activeConversation.id
          ? {
              ...conversation,
              muted: !conversation.muted,
            }
          : conversation
      )
    )
  }

  function blockUser() {
    setConversations((current) =>
      current.filter(
        (conversation) =>
          conversation.id !== activeConversation.id
      )
    )

    setActiveId(1)
    setShowBlockConfirm(false)
  }

  function reportUser() {
    // TODO: wire this up to your actual report endpoint.
    console.log("Reported:", activeConversation.name)
    setShowReportConfirm(false)
  }

  function createConversation() {
    const name = newName.trim()

    if (!name) return

    const newConversation = {
      id: Date.now(),
      name,
      username: `@${name
        .toLowerCase()
        .replace(/\s+/g, "")}`,
      avatar: name
        .split(" ")
        .map((part) => part[0])
        .join("")
        .slice(0, 2)
        .toUpperCase(),
      online: true,
      preview: "New conversation",
      time: "now",
      unread: 0,
      pinned: false,
      muted: false,
      interests: [],
      messages: [],
    }

    setConversations((current) => [
      newConversation,
      ...current,
    ])

    setActiveId(newConversation.id)
    setNewName("")
    setShowNewMessage(false)
  }

  function attachFile(event) {
    const selected = event.target.files?.[0]

    if (!selected) return

    setFile(selected)

    sendMessage(`📎 ${selected.name}`)

    event.target.value = ""
  }

  function addEmoji(emoji) {
    setMessage((current) => `${current}${emoji}`)
  }

  return (
    <main className="messages-page">

      {/* ================= LEFT ================= */}

      <aside className="messages-sidebar">
        <div className="messages-sidebar-header">
          <div>
            <span className="messages-eyebrow">
              YOUR INBOX
            </span>

            <h1>Messages</h1>
          </div>

          <button
            className="messages-new-button"
            type="button"
            title="New message"
            onClick={() =>
              setShowNewMessage(true)
            }
          >
            +
          </button>
        </div>

        <div className="messages-search">
          <span>⌕</span>

          <input
            type="text"
            placeholder="Search conversations..."
            value={search}
            onChange={(event) =>
              setSearch(event.target.value)
            }
          />

          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
            >
              ×
            </button>
          )}
        </div>

        <div className="messages-tabs">
          <button
            type="button"
            className={
              tab === "all" ? "active" : ""
            }
            onClick={() => setTab("all")}
          >
            All
          </button>

          <button
            type="button"
            className={
              tab === "unread" ? "active" : ""
            }
            onClick={() => setTab("unread")}
          >
            Unread
            <span>
              {
                conversations.filter(
                  (item) => item.unread > 0
                ).length
              }
            </span>
          </button>

          <button
            type="button"
            className={
              tab === "pinned" ? "active" : ""
            }
            onClick={() => setTab("pinned")}
          >
            Pinned
          </button>
        </div>

        <div className="messages-conversations">
          {filteredConversations.length === 0 ? (
            <div className="messages-no-results">
              <span>⌕</span>

              <strong>
                No conversations found
              </strong>

              <p>
                Try another search or tab.
              </p>
            </div>
          ) : (
            filteredConversations.map(
              (conversation) => (
                <button
                  key={conversation.id}
                  type="button"
                  className={`messages-conversation ${
                    activeConversation.id ===
                    conversation.id
                      ? "active"
                      : ""
                  }`}
                  onClick={() =>
                    selectConversation(
                      conversation.id
                    )
                  }
                >
                  <Avatar
                    conversation={conversation}
                  />

                  <div className="messages-conversation-info">
                    <div className="messages-conversation-top">
                      <strong>
                        {conversation.name}
                      </strong>

                      <small>
                        {conversation.time}
                      </small>
                    </div>

                    <div className="messages-conversation-bottom">
                      <span>
                        {conversation.muted &&
                          "🔇 "}
                        {conversation.preview}
                      </span>

                      {conversation.unread >
                        0 && (
                        <b>
                          {conversation.unread}
                        </b>
                      )}
                    </div>
                  </div>
                </button>
              )
            )
          )}
        </div>
      </aside>

      {/* ================= CENTER ================= */}

      <section className="messages-chat">

        <header className="messages-chat-header">
          <div className="messages-chat-person">
            <Avatar
              conversation={activeConversation}
              small
            />

            <div>
              <strong>
                {activeConversation.name}
              </strong>

              <span>
                {activeConversation.online
                  ? "● Online"
                  : "Offline"}
              </span>
            </div>
          </div>

          <div className="messages-chat-actions">

            <button
              type="button"
              title="Search messages"
              onClick={() =>
                setShowChatSearch(
                  (current) => !current
                )
              }
            >
              ⌕
            </button>

            <button
              type="button"
              title="Voice call"
              onClick={() =>
                setShowCall("voice")
              }
            >
              ◯
            </button>

            <button
              type="button"
              title="Video call"
              onClick={() =>
                setShowCall("video")
              }
            >
              ▣
            </button>

            <button
              type="button"
              title="More"
              onClick={() =>
                setShowMore((current) => !current)
              }
            >
              •••
            </button>

            {showMore && (
              <div className="messages-action-menu">

                <button
                  type="button"
                  onClick={() => {
                    togglePinConversation()
                  }}
                >
                  {activeConversation.pinned
                    ? "Unpin conversation"
                    : "Pin conversation"}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    toggleMute()
                    setShowMore(false)
                  }}
                >
                  {activeConversation.muted
                    ? "Unmute conversation"
                    : "Mute conversation"}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowPinned(true)
                    setShowMore(false)
                  }}
                >
                  View pinned messages
                </button>

                <button
                  type="button"
                  className="danger"
                  onClick={() => {
                    setShowBlockConfirm(true)
                    setShowMore(false)
                  }}
                >
                  Block user
                </button>

              </div>
            )}
          </div>
        </header>

        {showChatSearch && (
          <div className="messages-chat-search">
            <span>⌕</span>

            <input
              autoFocus
              type="text"
              placeholder="Search this conversation..."
              value={chatSearch}
              onChange={(event) =>
                setChatSearch(
                  event.target.value
                )
              }
            />

            <button
              type="button"
              onClick={() => {
                setChatSearch("")
                setShowChatSearch(false)
              }}
            >
              ×
            </button>
          </div>
        )}

        <div className="messages-chat-body">
          <div className="messages-date">
            <span>Today</span>
          </div>

          {filteredMessages.length === 0 ? (
            <div className="messages-no-chat-results">
              No messages match your search.
            </div>
          ) : (
            filteredMessages.map((item, index) => {
              const isLastMine =
                item.from === "me" &&
                index ===
                  filteredMessages.length - 1

              return (
                <div
                  key={item.id}
                  className={`messages-row ${
                    item.from === "me"
                      ? "mine"
                      : "theirs"
                  }`}
                >
                  {item.from === "them" && (
                    <Avatar
                      conversation={
                        activeConversation
                      }
                      small
                    />
                  )}

                  <div className="messages-bubble-wrap">
                    <div className="messages-bubble">
                      {item.text}
                    </div>

                    <div className="messages-meta">
                      <small>{item.time}</small>

                      {item.from === "me" && (
                        <span
                          className={`messages-receipt ${
                            isLastMine
                              ? "seen"
                              : ""
                          }`}
                        >
                          ✓✓
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* ================= COMPOSER ================= */}

        <div className="messages-composer">

          <button
            type="button"
            className="messages-composer-button"
            title="Add"
            onClick={() =>
              fileInputRef.current?.click()
            }
          >
            +
          </button>

          <input
            type="text"
            placeholder={`Message ${activeConversation.name}...`}
            value={message}
            onChange={(event) =>
              setMessage(event.target.value)
            }
            onKeyDown={handleKeyDown}
          />

          <button
            type="button"
            title="Emoji"
            onClick={() =>
              setShowEmoji(
                (current) => !current
              )
            }
          >
            ☺
          </button>

          <button
            type="button"
            title="Attach file"
            onClick={() =>
              fileInputRef.current?.click()
            }
          >
            ▧
          </button>

          <button
            type="button"
            className="messages-send"
            onClick={() => sendMessage()}
            disabled={!message.trim()}
          >
            ↑
          </button>

          {showEmoji && (
            <div className="messages-emoji-picker">
              {emojis.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() =>
                    addEmoji(emoji)
                  }
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            hidden
            onChange={attachFile}
          />
        </div>

      </section>

      {/* ================= RIGHT ================= */}

      <aside className="messages-profile">

        <div className="messages-profile-cover" />

        <div className="messages-profile-content">

          <Avatar
            conversation={activeConversation}
          />

          <h2>
            {activeConversation.name}
          </h2>

          <span className="messages-profile-username">
            {activeConversation.username}
          </span>

          <div className="messages-profile-status">
            <span
              className={
                activeConversation.online
                  ? "online"
                  : ""
              }
            />

            {activeConversation.online
              ? "Online now"
              : "Offline"}
          </div>

          <p>
            Just here for good vibes and great
            conversations.
          </p>

          {activeConversation.interests?.length > 0 && (
            <div className="messages-interests">
              <span className="messages-interests-label">
                Shared Interests
              </span>

              <div className="messages-interests-tags">
                {activeConversation.interests.map(
                  (interest) => (
                    <span key={interest}>
                      {interest}
                    </span>
                  )
                )}
              </div>
            </div>
          )}

          <div className="messages-profile-stats">

            <div>
              <strong>124</strong>
              <span>Posts</span>
            </div>

            <div>
              <strong>432</strong>
              <span>Followers</span>
            </div>

            <div>
              <strong>298</strong>
              <span>Following</span>
            </div>

          </div>

          <div className="messages-quick-actions">
            <span className="messages-quick-actions-label">
              Quick Actions
            </span>

            <button
              type="button"
              onClick={() =>
                setShowProfile(true)
              }
            >
              <span className="messages-quick-icon">
                ○
              </span>
              View Profile
            </button>

            <button
              type="button"
              onClick={() =>
                setShowCall("voice")
              }
            >
              <span className="messages-quick-icon">
                ◯
              </span>
              Start Voice Call
            </button>

            <button
              type="button"
              onClick={() =>
                setShowCall("video")
              }
            >
              <span className="messages-quick-icon">
                ▣
              </span>
              Start Video Call
            </button>

            <button
              type="button"
              onClick={() =>
                setShowReportConfirm(true)
              }
            >
              <span className="messages-quick-icon">
                ⚑
              </span>
              Report
            </button>
          </div>

          <div className="messages-profile-section">

            <div className="messages-profile-section-title">
              <strong>
                Shared Media
              </strong>

              <button
                type="button"
                onClick={() =>
                  setShowMedia(true)
                }
              >
                See all
              </button>
            </div>

            <div className="messages-media-grid">

              <button
                type="button"
                onClick={() =>
                  setShowMedia(true)
                }
              />

              <button
                type="button"
                onClick={() =>
                  setShowMedia(true)
                }
              />

              <button
                type="button"
                onClick={() =>
                  setShowMedia(true)
                }
              />

              <button
                type="button"
                className="messages-media-more"
                onClick={() =>
                  setShowMedia(true)
                }
              >
                +12
              </button>

            </div>

          </div>

          <div className="messages-profile-list">

            <button
              type="button"
              onClick={() =>
                setShowTribes(true)
              }
            >
              <span>▣</span>
              Shared Tribes
              <b>3</b>
            </button>

            <button
              type="button"
              onClick={() =>
                setShowPinned(true)
              }
            >
              <span>☆</span>
              Pinned Messages
              <b>2</b>
            </button>

            <button
              type="button"
              className="messages-toggle-row"
              onClick={toggleMute}
            >
              <span>◉</span>
              {activeConversation.muted
                ? "Unmute Conversation"
                : "Mute Conversation"}

              <span
                className={`messages-switch ${
                  activeConversation.muted
                    ? "on"
                    : ""
                }`}
              >
                <span className="messages-switch-thumb" />
              </span>
            </button>

          </div>

          <button
            type="button"
            className="messages-block-button"
            onClick={() =>
              setShowBlockConfirm(true)
            }
          >
            Block User
          </button>

        </div>
      </aside>

      {/* ================= NEW MESSAGE ================= */}

      {showNewMessage && (
        <Modal
          onClose={() =>
            setShowNewMessage(false)
          }
        >
          <div className="messages-modal-header">
            <div>
              <span>NEW MESSAGE</span>
              <h2>Start a conversation</h2>
            </div>

            <button
              type="button"
              onClick={() =>
                setShowNewMessage(false)
              }
            >
              ×
            </button>
          </div>

          <input
            className="messages-modal-input"
            autoFocus
            placeholder="Username or display name"
            value={newName}
            onChange={(event) =>
              setNewName(event.target.value)
            }
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                createConversation()
              }
            }}
          />

          <button
            className="messages-modal-primary"
            type="button"
            onClick={createConversation}
          >
            Start conversation
          </button>
        </Modal>
      )}

      {/* ================= PROFILE ================= */}

      {showProfile && (
        <Modal
          onClose={() =>
            setShowProfile(false)
          }
        >
          <div className="messages-profile-modal">

            <Avatar
              conversation={activeConversation}
            />

            <h2>
              {activeConversation.name}
            </h2>

            <span>
              {activeConversation.username}
            </span>

            <p>
              This is where the full Tribe profile
              will open.
            </p>

            <button
              type="button"
              className="messages-modal-primary"
              onClick={() =>
                setShowProfile(false)
              }
            >
              Close
            </button>

          </div>
        </Modal>
      )}

      {/* ================= MEDIA ================= */}

      {showMedia && (
        <Modal
          onClose={() =>
            setShowMedia(false)
          }
        >
          <div className="messages-modal-header">
            <div>
              <span>MEDIA</span>
              <h2>Shared media</h2>
            </div>

            <button
              type="button"
              onClick={() =>
                setShowMedia(false)
              }
            >
              ×
            </button>
          </div>

          <div className="messages-media-modal-grid">
            <div>Media</div>
            <div>Media</div>
            <div>Media</div>
            <div>Media</div>
            <div>Media</div>
            <div>Media</div>
          </div>
        </Modal>
      )}

      {/* ================= TRIBES ================= */}

      {showTribes && (
        <Modal
          onClose={() =>
            setShowTribes(false)
          }
        >
          <div className="messages-modal-header">
            <div>
              <span>COMMUNITIES</span>
              <h2>Shared Tribes</h2>
            </div>

            <button
              type="button"
              onClick={() =>
                setShowTribes(false)
              }
            >
              ×
            </button>
          </div>

          <div className="messages-modal-list">

            <button type="button">
              🎮 Gaming
              <span>→</span>
            </button>

            <button type="button">
              🎵 Music
              <span>→</span>
            </button>

            <button type="button">
              ⚽ Sports
              <span>→</span>
            </button>

          </div>
        </Modal>
      )}

      {/* ================= PINNED ================= */}

      {showPinned && (
        <Modal
          onClose={() =>
            setShowPinned(false)
          }
        >
          <div className="messages-modal-header">
            <div>
              <span>SAVED</span>
              <h2>Pinned messages</h2>
            </div>

            <button
              type="button"
              onClick={() =>
                setShowPinned(false)
              }
            >
              ×
            </button>
          </div>

          <div className="messages-pinned-item">
            <span>☆</span>

            <div>
              <strong>
                perfect 🔥
              </strong>

              <small>
                Pinned message
              </small>
            </div>
          </div>

          <div className="messages-pinned-item">
            <span>☆</span>

            <div>
              <strong>
                wanna hop on later?
              </strong>

              <small>
                Pinned message
              </small>
            </div>
          </div>
        </Modal>
      )}

      {/* ================= CALL ================= */}

      {showCall && (
        <Modal
          onClose={() =>
            setShowCall(null)
          }
        >
          <div className="messages-call-modal">

            <Avatar
              conversation={activeConversation}
            />

            <h2>
              {showCall === "video"
                ? "Video call"
                : "Voice call"}
            </h2>

            <p>
              Calling{" "}
              {activeConversation.name}...
            </p>

            <div className="messages-call-status">
              ● Connecting
            </div>

            <button
              type="button"
              className="messages-call-end"
              onClick={() =>
                setShowCall(null)
              }
            >
              End call
            </button>

          </div>
        </Modal>
      )}

      {/* ================= BLOCK ================= */}

      {showBlockConfirm && (
        <Modal
          onClose={() =>
            setShowBlockConfirm(false)
          }
        >
          <div className="messages-block-modal">

            <div className="messages-danger-icon">
              !
            </div>

            <h2>
              Block{" "}
              {activeConversation.name}?
            </h2>

            <p>
              They won't be able to message you
              or interact with you on Tribe.
            </p>

            <div className="messages-modal-actions">

              <button
                type="button"
                onClick={() =>
                  setShowBlockConfirm(false)
                }
              >
                Cancel
              </button>

              <button
                type="button"
                className="danger"
                onClick={blockUser}
              >
                Block User
              </button>

            </div>

          </div>
        </Modal>
      )}

      {/* ================= REPORT ================= */}

      {showReportConfirm && (
        <Modal
          onClose={() =>
            setShowReportConfirm(false)
          }
        >
          <div className="messages-block-modal">

            <div className="messages-danger-icon">
              !
            </div>

            <h2>
              Report{" "}
              {activeConversation.name}?
            </h2>

            <p>
              Let us know something's wrong. We'll
              review this conversation.
            </p>

            <div className="messages-modal-actions">

              <button
                type="button"
                onClick={() =>
                  setShowReportConfirm(false)
                }
              >
                Cancel
              </button>

              <button
                type="button"
                className="danger"
                onClick={reportUser}
              >
                Report
              </button>

            </div>

          </div>
        </Modal>
      )}

    </main>
  )
}