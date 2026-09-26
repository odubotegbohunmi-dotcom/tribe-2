import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import { supabase } from "../../lib/supabase"

const LiveSessionContext = createContext(null)

const ICE_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
]

export function LiveSessionProvider({ children }) {
  const [activeStream, setActiveStream] = useState(null)
  const [localStreamReady, setLocalStreamReady] = useState(false)
  const [cameraEnabled, setCameraEnabled] = useState(true)
  const [microphoneEnabled, setMicrophoneEnabled] =
    useState(true)
  const [screenSharing, setScreenSharing] =
    useState(false)

  const localStreamRef = useRef(null)
const channelRef = useRef(null)
const peersRef = useRef(new Map())
const pendingIceRef = useRef(new Map())
const streamIdRef = useRef(null)
  /*
   * ---------------------------------------------------------
   * CLEAN UP PEERS
   * ---------------------------------------------------------
   */

  const closePeers = useCallback(() => {
    peersRef.current.forEach((peer) => {
      try {
        peer.close()
      } catch {
        // Ignore already-closed peers.
      }
    })

    peersRef.current.clear()
  }, [])

  /*
   * ---------------------------------------------------------
   * STOP CAMERA
   * ---------------------------------------------------------
   */

  const stopLocalStream = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current
        .getTracks()
        .forEach((track) => track.stop())

      localStreamRef.current = null
    }

    setLocalStreamReady(false)
    setCameraEnabled(false)
    setMicrophoneEnabled(false)
    setScreenSharing(false)
  }, [])

  /*
   * ---------------------------------------------------------
   * START CAMERA + MICROPHONE
   * ---------------------------------------------------------
   */

  const startCamera = useCallback(async () => {
    if (localStreamRef.current) {
      return localStreamRef.current
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error(
        "Camera and microphone access are not supported by this browser."
      )
    }

    const stream =
      await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          facingMode: "user",
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      })

    localStreamRef.current = stream

    setCameraEnabled(true)
    setMicrophoneEnabled(true)
    setScreenSharing(false)
    setLocalStreamReady(true)

    return stream
  }, [])

  /*
   * ---------------------------------------------------------
   * CAMERA TOGGLE
   * ---------------------------------------------------------
   */

  const toggleCamera = useCallback(() => {
    const stream = localStreamRef.current

    if (!stream) {
      return false
    }

    const videoTracks = stream.getVideoTracks()

    if (!videoTracks.length) {
      return false
    }

    const nextEnabled = !cameraEnabled

    videoTracks.forEach((track) => {
      track.enabled = nextEnabled
    })

    setCameraEnabled(nextEnabled)

    return nextEnabled
  }, [cameraEnabled])

  /*
   * ---------------------------------------------------------
   * MICROPHONE TOGGLE
   * ---------------------------------------------------------
   */

  const toggleMicrophone = useCallback(() => {
    const stream = localStreamRef.current

    if (!stream) {
      return false
    }

    const audioTracks = stream.getAudioTracks()

    if (!audioTracks.length) {
      return false
    }

    const nextEnabled = !microphoneEnabled

    audioTracks.forEach((track) => {
      track.enabled = nextEnabled
    })

    setMicrophoneEnabled(nextEnabled)

    return nextEnabled
  }, [microphoneEnabled])

  /*
   * ---------------------------------------------------------
   * SCREEN SHARING
   * ---------------------------------------------------------
   */

  const toggleScreenShare = useCallback(async () => {
    const cameraStream = localStreamRef.current

    if (!cameraStream) {
      throw new Error(
        "Start your camera before sharing your screen."
      )
    }

    if (screenSharing) {
      const cameraOnlyStream =
        await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1920 },
            height: { ideal: 1080 },
            facingMode: "user",
          },
          audio: false,
        })

      const cameraTrack =
        cameraOnlyStream.getVideoTracks()[0]

      const oldVideoTrack =
        cameraStream.getVideoTracks()[0]

      for (const peer of peersRef.current.values()) {
        const sender = peer
          .getSenders()
          .find(
            (item) =>
              item.track?.kind === "video"
          )

        if (sender) {
          await sender.replaceTrack(cameraTrack)
        }
      }

      if (oldVideoTrack) {
        oldVideoTrack.stop()
        cameraStream.removeTrack(oldVideoTrack)
      }

      cameraStream.addTrack(cameraTrack)

      setScreenSharing(false)

      return cameraStream
    }

    const displayStream =
      await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true,
      })

    const screenTrack =
      displayStream.getVideoTracks()[0]

    const oldVideoTrack =
      cameraStream.getVideoTracks()[0]

    for (const peer of peersRef.current.values()) {
      const sender = peer
        .getSenders()
        .find(
          (item) =>
            item.track?.kind === "video"
        )

      if (sender) {
        await sender.replaceTrack(screenTrack)
      }
    }

    if (oldVideoTrack) {
      oldVideoTrack.stop()
      cameraStream.removeTrack(oldVideoTrack)
    }

    cameraStream.addTrack(screenTrack)

    setScreenSharing(true)

    screenTrack.onended = async () => {
      try {
        await toggleScreenShare()
      } catch {
        // The user already stopped sharing.
      }
    }

    return cameraStream
  }, [screenSharing])

  /*
   * ---------------------------------------------------------
   * SEND SIGNAL
   * ---------------------------------------------------------
   */

  const sendSignal = useCallback((payload) => {
    if (!channelRef.current) {
      return
    }

    void channelRef.current.send({
      type: "broadcast",
      event: "signal",
      payload,
    })
  }, [])

  /*
   * ---------------------------------------------------------
   * CREATE STREAMER PEER
   * ---------------------------------------------------------
   */

  const createStreamerPeer = useCallback(
  async (viewerId, userId) => {
    if (!viewerId || viewerId === userId) return null

    const existing = peersRef.current.get(viewerId)
    if (existing) {
      const stream = localStreamRef.current

      if (stream) {
        const senders = existing.getSenders()

        for (const track of stream.getTracks()) {
          const sender = senders.find(
            (item) => item.track?.kind === track.kind
          )

          if (sender) {
            await sender.replaceTrack(track)
          } else {
            existing.addTrack(track, stream)
          }
        }
      }

      return existing
    }

    const peer = new RTCPeerConnection({
      iceServers: ICE_SERVERS,
    })

    peersRef.current.set(viewerId, peer)

    peer.onicecandidate = (event) => {
      if (!event.candidate) return

      sendSignal({
        type: "ice",
        from: userId,
        target: viewerId,
        candidate: event.candidate,
      })
    }

    const stream = localStreamRef.current

    if (stream) {
      stream.getTracks().forEach((track) => {
        peer.addTrack(track, stream)
      })
    }

    return peer
  },
  [sendSignal]
)

  /*
   * ---------------------------------------------------------
   * START STREAM
   * ---------------------------------------------------------
   */

  const startStream = useCallback(
    async ({ user, title }) => {
      if (!user?.id) {
        throw new Error(
          "You must be signed in to go live."
        )
      }

      if (activeStream) {
        return activeStream
      }

      const streamTitle =
        title?.trim() ||
        `${user.user_metadata?.display_name || "Tribe member"} is live`

      const { data, error } =
        await supabase
          .from("live_streams")
          .insert({
            streamer_id: user.id,
            title: streamTitle,
            status: "live",
          })
          .select(
            "id, streamer_id, title, status, created_at"
          )
          .single()

      if (error) {
        throw new Error(error.message)
      }

      streamIdRef.current = data.id
      setActiveStream(data)

      return data
    },
    [activeStream]
  )

  /*
   * ---------------------------------------------------------
   * CONNECT REALTIME CHANNEL
   * ---------------------------------------------------------
   */

  const connectToStream = useCallback(
    async ({
      streamId,
      userId,
      streamerId,
      isStreamer,
      onRemoteStream,
      onChatMessage,
    }) => {
      if (!streamId || !userId) {
        return
      }

      if (channelRef.current) {
        await supabase.removeChannel(
          channelRef.current
        )

        channelRef.current = null
      }

      closePeers()

      const channel = supabase.channel(
        `live:${streamId}`,
        {
          config: {
            broadcast: {
              self: false,
            },
          },
        }
      )

      channel.on(
        "broadcast",
        { event: "signal" },
        async ({ payload }) => {
          if (!payload) {
            return
          }

          if (
            payload.target &&
            payload.target !== userId
          ) {
            return
          }

          try {
            /*
             * VIEWER ARRIVES
             */

            if (
              payload.type === "viewer-join" &&
              isStreamer
            ) {
              const peer =
                await createStreamerPeer(
                  payload.from,
                  userId
                )

              if (!peer) {
                return
              }

              const offer =
                await peer.createOffer()

              await peer.setLocalDescription(
                offer
              )

              sendSignal({
                type: "offer",
                from: userId,
                target: payload.from,
                offer,
              })

              return
            }

            /*
             * VIEWER RECEIVES OFFER
             */

            if (
              payload.type === "offer" &&
              !isStreamer
            ) {
              let peer =
                peersRef.current.get(
                  payload.from
                )

              if (!peer) {
                peer =
                  new RTCPeerConnection({
                    iceServers:
                      ICE_SERVERS,
                  })

                peersRef.current.set(
                  payload.from,
                  peer
                )

                peer.onicecandidate = (
                  event
                ) => {
                  if (
                    !event.candidate
                  ) {
                    return
                  }

                  sendSignal({
                    type: "ice",
                    from: userId,
                    target:
                      payload.from,
                    candidate:
                      event.candidate,
                  })
                }

                peer.ontrack = (event) => {
                  const remoteStream =
                    event.streams?.[0]

                  if (
                    remoteStream &&
                    onRemoteStream
                  ) {
                    onRemoteStream(
                      remoteStream
                    )
                  }
                }
              }

              await peer.setRemoteDescription(
  new RTCSessionDescription(
    payload.offer
  )
)

const pending =
  pendingIceRef.current.get(payload.from) || []

for (const candidate of pending) {
  await peer.addIceCandidate(candidate)
}

pendingIceRef.current.delete(payload.from)

const answer =
  await peer.createAnswer()

              await peer.setLocalDescription(
                answer
              )

              sendSignal({
                type: "answer",
                from: userId,
                target: payload.from,
                answer,
              })

              return
            }

            /*
             * STREAMER RECEIVES ANSWER
             */

            if (
              payload.type === "answer" &&
              isStreamer
            ) {
              const peer =
                peersRef.current.get(
                  payload.from
                )

              if (!peer) {
                return
              }

              await peer.setRemoteDescription(
                new RTCSessionDescription(
                  payload.answer
                )
              )

              return
            }

            /*
             * ICE CANDIDATE
             */

            if (payload.type === "ice") {
  const peer = peersRef.current.get(payload.from)

  if (!peer) {
    return
  }

  const candidate = new RTCIceCandidate(payload.candidate)

  if (peer.remoteDescription) {
    await peer.addIceCandidate(candidate)
    return
  }

  const pending = pendingIceRef.current.get(payload.from) || []
  pending.push(candidate)
  pendingIceRef.current.set(payload.from, pending)
}
          } catch (signalError) {
            console.error(
              "Live signaling error:",
              signalError
            )
          }
        }
      )

      channel.on(
        "broadcast",
        { event: "chat" },
        ({ payload }) => {
          if (payload && onChatMessage) {
            onChatMessage(payload)
          }
        }
      )

      channelRef.current = channel

      await channel.subscribe()

      /*
       * Give the streamer a moment to
       * subscribe before the viewer
       * announces itself.
       */

      if (!isStreamer) {
        window.setTimeout(() => {
          sendSignal({
            type: "viewer-join",
            from: userId,
            target: streamerId,
          })
        }, 500)
      }
    },
    [
      closePeers,
      createStreamerPeer,
      sendSignal,
    ]
  )

  /*
   * ---------------------------------------------------------
   * CHAT
   * ---------------------------------------------------------
   */

  const sendChatMessage = useCallback(
    (message) => {
      if (!channelRef.current) {
        return
      }

      void channelRef.current.send({
        type: "broadcast",
        event: "chat",
        payload: message,
      })
    },
    []
  )

  /*
   * ---------------------------------------------------------
   * END STREAM
   * ---------------------------------------------------------
   */

  const endStream = useCallback(
    async () => {
      if (!activeStream?.id) {
        return
      }

      const { error } =
        await supabase
          .from("live_streams")
          .update({
            status: "ended",
            ended_at:
              new Date().toISOString(),
          })
          .eq("id", activeStream.id)

      if (error) {
        throw new Error(error.message)
      }

      if (channelRef.current) {
        await supabase.removeChannel(
          channelRef.current
        )

        channelRef.current = null
      }

      closePeers()
      stopLocalStream()

      streamIdRef.current = null
      setActiveStream(null)
    },
    [
      activeStream,
      closePeers,
      stopLocalStream,
    ]
  )

  /*
   * ---------------------------------------------------------
   * DISCONNECT VIEWER
   * ---------------------------------------------------------
   */

  const disconnectViewer = useCallback(
    async () => {
      if (channelRef.current) {
        await supabase.removeChannel(
          channelRef.current
        )

        channelRef.current = null
      }

      closePeers()
    },
    [closePeers]
  )

  /*
   * ---------------------------------------------------------
   * PROVIDER CLEANUP
   *
   * IMPORTANT:
   * We intentionally DO NOT stop the
   * camera here when changing routes.
   *
   * The provider lives above the pages.
   * ---------------------------------------------------------
   */

  useEffect(() => {
    return () => {
      if (channelRef.current) {
        void supabase.removeChannel(
          channelRef.current
        )
      }

      closePeers()

      /*
       * Browser/tab shutdown will naturally
       * release the camera.
       */
      stopLocalStream()
    }
  }, [closePeers, stopLocalStream])

  const value = useMemo(
    () => ({
      activeStream,

      localStream:
        localStreamRef.current,

      localStreamReady,

      cameraEnabled,
      microphoneEnabled,
      screenSharing,

      startCamera,
      stopLocalStream,

      toggleCamera,
      toggleMicrophone,
      toggleScreenShare,

      startStream,
      endStream,

      connectToStream,
      disconnectViewer,

      sendChatMessage,
    }),
    [
      activeStream,
      localStreamReady,
      cameraEnabled,
      microphoneEnabled,
      screenSharing,
      startCamera,
      stopLocalStream,
      toggleCamera,
      toggleMicrophone,
      toggleScreenShare,
      startStream,
      endStream,
      connectToStream,
      disconnectViewer,
      sendChatMessage,
    ]
  )

  return (
    <LiveSessionContext.Provider value={value}>
      {children}
    </LiveSessionContext.Provider>
  )
}

export function useLiveSession() {
  const context =
    useContext(LiveSessionContext)

  if (!context) {
    throw new Error(
      "useLiveSession must be used inside LiveSessionProvider."
    )
  }

  return context
}

export default LiveSessionProvider