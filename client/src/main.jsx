import { StrictMode } from "react"
import { createRoot } from "react-dom/client"

import App from "./App.jsx"
import { BrowserRouter as Router } from "react-router-dom"
import { applyTheme, readTheme } from "./theme.js"

applyTheme(readTheme())

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <Router>
      <App />
    </Router>
  </StrictMode>
)