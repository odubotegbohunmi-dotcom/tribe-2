import { useState } from "react"
import Button from "../../components/ui/Button"

const COLORS = ["#8062ff", "#39d4e8", "#2ec99a", "#f5bf4f", "#ff6868", "#ff9a43", "#a58cff", "#ee70a8"]

export default function TribeCreateWizard({ onClose, onCreate, creating, error }) {
  const [step, setStep] = useState(1)
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [announcement, setAnnouncement] = useState("")
  const [color, setColor] = useState(COLORS[0])
  const [tagInput, setTagInput] = useState("")
  const [tags, setTags] = useState([])

  function addTag(event) {
    if (event.key !== "Enter") return
    event.preventDefault()
    const tag = tagInput.trim().replace(/^#/, "").slice(0, 30)
    if (tag && !tags.includes(tag) && tags.length < 8) setTags((items) => [...items, tag])
    setTagInput("")
  }

  return (
    <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && !creating && onClose()}>
      <section className="modal tribe-create-modal v1-create-wizard" role="dialog" aria-modal="true" aria-labelledby="create-tribe-title">
        <header className="v1-wizard-heading">
          <div><span className="v1-wizard-mark">ϟ</span><div><h2 id="create-tribe-title">Create Your Tribe</h2><p>Step {step} of 3</p></div></div>
          <button type="button" className="v1-icon-button" onClick={onClose} disabled={creating} aria-label="Close">×</button>
        </header>
        <div className="v1-step-track" aria-label={`Step ${step} of 3`}>{[1, 2, 3].map((item) => <span key={item} className={item <= step ? "complete" : ""} />)}</div>

        {step === 1 && <div className="v1-wizard-fields">
          <label>TRIBE NAME *<input autoFocus maxLength={80} value={name} onChange={(event) => setName(event.target.value)} placeholder="Name your community" /></label>
          <label>VISIBILITY<select defaultValue="public" disabled><option value="public">Public · anyone can join</option></select></label>
          <p className="v1-field-note">New Tribes use the existing public community visibility.</p>
        </div>}

        {step === 2 && <div className="v1-wizard-fields">
          <label>DESCRIPTION<textarea maxLength={1000} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="What is this Tribe about?" rows={4} /></label>
          <label>ANNOUNCEMENT<textarea maxLength={300} value={announcement} onChange={(event) => setAnnouncement(event.target.value)} placeholder="A welcome message for members" rows={2} /></label>
          <fieldset className="v1-color-field"><legend>THEME COLOR</legend><div>{COLORS.map((item) => <button key={item} type="button" aria-label={`Choose ${item}`} aria-pressed={color === item} style={{ backgroundColor: item }} onClick={() => setColor(item)} />)}</div></fieldset>
          <label>TAGS <small>(PRESS ENTER TO ADD)</small><input value={tagInput} onChange={(event) => setTagInput(event.target.value)} onKeyDown={addTag} placeholder="Add a topic tag" /></label>
          <div className="v1-tag-list">{tags.map((tag) => <button type="button" key={tag} onClick={() => setTags((items) => items.filter((item) => item !== tag))}>#{tag} ×</button>)}</div>
        </div>}

        {step === 3 && <div className="v1-wizard-fields">
          <div className="v1-tribe-preview" style={{ "--tribe-accent": color }}><span>{name.trim().charAt(0).toUpperCase() || "T"}</span><strong>{name || "Your Tribe"}</strong><small>{description || "Your community description"}</small>{tags.length > 0 && <div>{tags.map((tag) => <span key={tag}>#{tag}</span>)}</div>}{announcement && <p>{announcement}</p>}</div>
          <section className="v1-unavailable-choice"><h3>AI assistant personality</h3><p>Tribe-specific AI behavior is not enabled. These options are unavailable and won’t change AI responses.</p><div><button type="button" disabled>Friendly &amp; Welcoming · unavailable</button><button type="button" disabled>Expert &amp; Professional · unavailable</button></div></section>
        </div>}

        {error && <p className="v1-form-error" role="alert">{error}</p>}
        <footer className="v1-wizard-actions">
          {step > 1 ? <Button variant="surface" disabled={creating} onClick={() => setStep((value) => value - 1)}>Back</Button> : <Button variant="surface" disabled={creating} onClick={onClose}>Cancel</Button>}
          {step < 3 ? <Button disabled={step === 1 ? name.trim().length < 3 : creating} onClick={() => setStep((value) => value + 1)}>Next →</Button> : <Button disabled={creating || name.trim().length < 3} onClick={() => onCreate({ name, description, announcement, color, tags })}>{creating ? "Creating..." : "ϟ Launch Tribe"}</Button>}
        </footer>
      </section>
    </div>
  )
}
