import AppRouter from "./router"
import AuthProvider from "../features/auth/AuthProvider"

export default function App() {
  return <AuthProvider><AppRouter /></AuthProvider>
}
