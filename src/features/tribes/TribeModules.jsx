import { useCallback, useEffect, useState } from "react"
import { Link } from "react-router-dom"
import Button from "../../components/ui/Button"
import { supabase } from "../../lib/supabase"
import useAuth from "../../hooks/useAuth"

function ModulePanel({ title, description, children }) {
  return <section className="tribe-module-panel"><header><div><h2>{title}</h2><p>{description}</p></div></header>{children}</section>
}

export function TribeWikiTab({ tribeId, canContribute }) {
  const [items, setItems] = useState([])
  const [title, setTitle] = useState("")
  const [body, setBody] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(true)
  const load = useCallback(async () => {
    const { data, error: queryError } = await supabase.from("tribe_resources").select("id, title, body, category, author_id, created_at").eq("tribe_id", tribeId).order("created_at", { ascending: false })
    if (queryError) setError(queryError.message); else setItems(data || [])
    setLoading(false)
  }, [tribeId])
  useEffect(() => { void load() }, [load])
  async function add(event) {
    event.preventDefault(); setError("")
    const { error: insertError } = await supabase.from("tribe_resources").insert({ tribe_id: tribeId, title: title.trim(), body: body.trim(), category: "guide" })
    if (insertError) setError(insertError.message); else { setTitle(""); setBody(""); await load() }
  }
  return <ModulePanel title="Tribe Wiki" description="Guides and resources shared by this community.">
    {canContribute && <form className="tribe-module-form" onSubmit={add}><input required maxLength={120} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Resource title" /><textarea required maxLength={5000} value={body} onChange={(event) => setBody(event.target.value)} placeholder="Write a guide or resource" rows={3} /><Button type="submit">Add resource</Button></form>}
    {error && <p className="v1-form-error" role="alert">{error}</p>}{loading ? <p>Loading resources…</p> : items.length ? <div className="tribe-module-list">{items.map((item) => <article key={item.id}><span className="v1-module-label">GUIDE</span><h3>{item.title}</h3><p>{item.body}</p><small>{new Date(item.created_at).toLocaleDateString()}</small></article>)}</div> : <p className="v1-module-empty">No resources yet.</p>}
  </ModulePanel>
}

export function TribeQATab({ tribeId, canContribute }) {
  const [items, setItems] = useState([]); const [title, setTitle] = useState(""); const [body, setBody] = useState(""); const [answerDrafts, setAnswerDrafts] = useState({}); const [error, setError] = useState(""); const [loading, setLoading] = useState(true)
  const load = useCallback(async () => { const { data, error: queryError } = await supabase.from("tribe_questions").select("id, title, body, created_at, tribe_answers(id, body, created_at)").eq("tribe_id", tribeId).order("created_at", { ascending: false }); if (queryError) setError(queryError.message); else setItems(data || []); setLoading(false) }, [tribeId])
  useEffect(() => { void load() }, [load])
  async function ask(event) { event.preventDefault(); const { error: insertError } = await supabase.from("tribe_questions").insert({ tribe_id: tribeId, title: title.trim(), body: body.trim() }); if (insertError) setError(insertError.message); else { setTitle(""); setBody(""); await load() } }
  async function answer(event, questionId) { event.preventDefault(); const text = answerDrafts[questionId]?.trim(); if (!text) return; const { error: insertError } = await supabase.from("tribe_answers").insert({ tribe_id: tribeId, question_id: questionId, body: text }); if (insertError) setError(insertError.message); else { setAnswerDrafts((drafts) => ({ ...drafts, [questionId]: "" })); await load() } }
  return <ModulePanel title="Questions & Answers" description="Ask the community and share what you know.">
    {canContribute && <form className="tribe-module-form" onSubmit={ask}><input required maxLength={180} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Your question" /><textarea required maxLength={4000} value={body} onChange={(event) => setBody(event.target.value)} placeholder="Add context (optional)" rows={2} /><Button type="submit">Ask question</Button></form>}
    {error && <p className="v1-form-error" role="alert">{error}</p>}{loading ? <p>Loading questions…</p> : items.length ? <div className="tribe-module-list">{items.map((item) => <article key={item.id}><span className="v1-module-label">QUESTION</span><h3>{item.title}</h3><p>{item.body}</p>{item.tribe_answers?.map((answer) => <blockquote key={answer.id}>{answer.body}</blockquote>)}{canContribute && <form className="tribe-inline-form" onSubmit={(event) => answer(event, item.id)}><input value={answerDrafts[item.id] || ""} onChange={(event) => setAnswerDrafts((drafts) => ({ ...drafts, [item.id]: event.target.value }))} placeholder="Write an answer" required /><Button type="submit">Answer</Button></form>}</article>)}</div> : <p className="v1-module-empty">No questions yet.</p>}
  </ModulePanel>
}

export function TribeEventsTab({ tribeId, canContribute, canManage }) {
  const { user } = useAuth()
  const [items, setItems] = useState([]); const [rsvps, setRsvps] = useState({}); const [title, setTitle] = useState(""); const [description, setDescription] = useState(""); const [startsAt, setStartsAt] = useState(""); const [error, setError] = useState(""); const [loading, setLoading] = useState(true)
  const load = useCallback(async () => { const { data, error: queryError } = await supabase.from("tribe_events").select("id, title, description, starts_at, created_by").eq("tribe_id", tribeId).order("starts_at", { ascending: true }); if (queryError) { setError(queryError.message); setLoading(false); return } setItems(data || []); const ids = (data || []).map((item) => item.id); if (ids.length && user?.id) { const { data: ownRsvps, error: rsvpError } = await supabase.from("tribe_event_rsvps").select("event_id, status").in("event_id", ids).eq("user_id", user.id); if (rsvpError) setError(rsvpError.message); else setRsvps(Object.fromEntries((ownRsvps || []).map((row) => [row.event_id, row.status]))) } else setRsvps({}); setLoading(false) }, [tribeId, user?.id])
  useEffect(() => { void load() }, [load])
  async function create(event) { event.preventDefault(); const { error: insertError } = await supabase.from("tribe_events").insert({ tribe_id: tribeId, title: title.trim(), description: description.trim(), starts_at: new Date(startsAt).toISOString() }); if (insertError) setError(insertError.message); else { setTitle(""); setDescription(""); setStartsAt(""); await load() } }
  async function toggleRsvp(eventId) { const current = rsvps[eventId]; const result = current ? await supabase.from("tribe_event_rsvps").delete().eq("event_id", eventId) : await supabase.from("tribe_event_rsvps").insert({ event_id: eventId, status: "going" }); if (result.error) setError(result.error.message); else await load() }
  return <ModulePanel title="Tribe Events" description="Upcoming events hosted by this community.">
    {canManage && <form className="tribe-module-form" onSubmit={create}><input required maxLength={140} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Event name" /><textarea maxLength={2000} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Details" rows={2} /><label>Starts<input required type="datetime-local" value={startsAt} onChange={(event) => setStartsAt(event.target.value)} /></label><Button type="submit">Create event</Button></form>}
    {error && <p className="v1-form-error" role="alert">{error}</p>}{loading ? <p>Loading events…</p> : items.length ? <div className="tribe-module-list">{items.map((item) => <article className="tribe-event-card" key={item.id}><span className="v1-module-label">{new Date(item.starts_at).toLocaleString()}</span><h3>{item.title}</h3><p>{item.description}</p>{canContribute && <Button variant="surface" onClick={() => void toggleRsvp(item.id)}>{rsvps[item.id] ? "Cancel RSVP" : "RSVP"}</Button>}</article>)}</div> : <p className="v1-module-empty">No events scheduled.</p>}
  </ModulePanel>
}

export function TribeVoiceTab() { return <ModulePanel title="Voice" description="Tribe-specific voice rooms are not available yet."><div className="v1-module-empty">Open the existing Live destination for stream-link guidance. <Link to="/live">Open Live</Link></div></ModulePanel> }
export function TribeAITab() { return <ModulePanel title="Tribe AI" description="Tribe-specific assistant behavior is not available yet."><div className="v1-module-empty">The existing AI experience remains unchanged. <Link to="/tribe-ai">Open Tribe AI</Link></div></ModulePanel> }
