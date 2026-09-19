import Button from "./Button"

export default function ErrorState({ title = "Something went wrong", message, onRetry }) {
  return (
    <section className="error-state" role="alert">
      <h3>{title}</h3>
      {message && <p>{message}</p>}
      {onRetry && <Button onClick={onRetry}>Try again</Button>}
    </section>
  )
}
