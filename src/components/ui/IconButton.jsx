export default function IconButton({
  children,
  label,
  className = "",
  onClick,
  disabled = false,
  type = "button",
  title,
}) {
  return (
    <button
      type={type}
      className={`icon-button ${className}`}
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={title || label}
    >
      {children}
    </button>
  )
}