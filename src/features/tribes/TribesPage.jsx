import Button from "../../components/ui/Button"

const tribes = [["🎮", "Gamers United", "Games • Community • Friends", "42.8K"], ["🎵", "Music Central", "Artists • Producers • Fans", "31.2K"], ["⚽", "Football Talk", "Football • Sports • Debate", "27.5K"], ["💻", "Tech World", "Technology • AI • Coding", "19.3K"]]

export default function TribesPage() {
  return <><header className="topbar"><h2>Tribes</h2><Button className="search" variant="surface">⌕ Search</Button></header><div className="tribes-page">
    <div className="tribes-hero"><div><h1>Find your tribe.</h1><p>Join communities built around what you love.</p></div><Button className="new-tribe-button">+ Create Tribe</Button></div>
    <div className="tribe-tabs">{["Discover", "Joined", "Created"].map((tab, index) => <Button key={tab} className={`tribe-tab ${index === 0 ? "active" : ""}`} variant="ghost">{tab}</Button>)}</div>
    <h3 className="tribes-heading">Popular right now</h3><div className="tribe-grid">{tribes.map(([icon, name, description, members]) => <div className="big-tribe-card" key={name}><div className="big-tribe-icon">{icon}</div><h3>{name}</h3><p>{description}</p><span>{members} members</span><Button variant="surface">Join Tribe</Button></div>)}</div>
  </div></>
}
