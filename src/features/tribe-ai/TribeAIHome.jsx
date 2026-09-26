import { Link } from "react-router-dom"

const aiFeatures = [
  {
    icon: "🔥",
    title: "Trending Intelligence",
    description:
      "Ask Tribe AI what's getting attention across the community.",
  },
  {
    icon: "👥",
    title: "Find Your People",
    description:
      "Discover Tribes and creators based on your interests.",
  },
  {
    icon: "💡",
    title: "Post Ideas",
    description:
      "Get ideas for posts, discussions, and content.",
  },
  {
    icon: "🧭",
    title: "Explore Tribe",
    description:
      "Find communities and conversations you might enjoy.",
  },
]

export default function LivePage() {
  return (
    <main className="tribe-ai-page">

      {/* HERO */}

      <header className="tribe-ai-header">
        <div>
          <span className="tribe-ai-eyebrow">
            ✦ TRIBE AI
          </span>

          <h1>
            Your intelligent guide
            <br />
            through Tribe.
          </h1>

          <p>
            Discover communities, conversations, creators,
            and ideas with your AI-powered Tribe companion.
          </p>

          <Link
            to="/tribe-ai"
            className="tribe-ai-button"
          >
            Open Tribe AI →
          </Link>
        </div>

        <div className="tribe-ai-header-icon">
          ✦
        </div>
      </header>


      {/* FEATURES */}

      <section className="tribe-ai-section">

        <div className="tribe-ai-section-title">
          <span>
            WHAT CAN IT DO?
          </span>

          <h2>
            Built to help you find your place.
          </h2>
        </div>


        <div className="tribe-ai-grid">

          {aiFeatures.map((feature) => (
            <div
              key={feature.title}
              className="tribe-ai-card"
            >

              <div className="tribe-ai-card-icon">
                {feature.icon}
              </div>

              <h3>
                {feature.title}
              </h3>

              <p>
                {feature.description}
              </p>

              <span>
                →
              </span>

            </div>
          ))}

        </div>

      </section>


      {/* COMING FEATURES */}

      <section className="tribe-ai-banner">

        <div className="tribe-ai-banner-icon">
          ✦
        </div>

        <div>

          <span>
            COMING SOON
          </span>

          <h2>
            Real Tribe AI
          </h2>

          <p>
            Personalized recommendations,
            safety tools, community discovery,
            and smarter conversations.
          </p>

        </div>


        <Link
          to="/tribe-ai"
        >
          Try it →
        </Link>

      </section>


    </main>
  )
}