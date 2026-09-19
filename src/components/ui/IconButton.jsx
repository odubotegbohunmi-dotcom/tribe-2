export default function IconButton({ children, label, className = "", type = "button", ...props }) {
  return (
    <button type={type} className={`icon-button ${className}`.trim()} aria-label={label} {...props}>
      {children}
    </button>
  )
}
