export default function Avatar({ src, name = "", label = "Avatar", className = "" }) {
  const initial = name.trim().charAt(0).toUpperCase() || "?"

  return (
    <div className={`avatar ${className}`.trim()} aria-label={label}>
      {src ? <img src={src} alt={label} /> : initial}
    </div>
  )
}
