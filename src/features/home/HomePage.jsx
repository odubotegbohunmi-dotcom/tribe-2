import Avatar from "../../components/ui/Avatar"
import Button from "../../components/ui/Button"

const posts = [
  { initial: "T", author: "Tribe Community", handle: "@tribe · 2h", body: <>Welcome to Tribe 2.0 👋<br />Find your people. Build your tribe.</>, actions: ["♡ 24", "💬 8", "↻ 5", "⌁"] },
  { initial: "A", author: "Alex", handle: "@alex · 4h", body: "Just found an amazing new tribe 🔥", actions: ["♡ 17", "💬 3", "↻ 2", "⌁"] },
]

export default function HomePage() {
  return (
    <>
      <header className="topbar"><h2>Home</h2><Button className="search" variant="surface">⌕ Search</Button></header>
      <section className="composer">
        <Avatar name="M" />
        <div className="composer-content">
          <input type="text" placeholder="What's happening in your Tribe?" />
          <div className="composer-bottom"><div className="composer-options"><span>＋</span><span>◉</span><span>☺</span></div><Button>Post</Button></div>
        </div>
      </section>
      {posts.map((post) => <article className="post" key={post.author}>
        <div className="post-header"><Avatar name={post.initial} /><div><strong>{post.author}</strong><small>{post.handle}</small></div></div>
        <p>{post.body}</p>
        <div className="post-actions">{post.actions.map((action) => <span key={action}>{action}</span>)}</div>
      </article>)}
    </>
  )
}
