import './App.css'
import { BrowserRouter, Routes, Route } from "react-router"
import Home from "./pages/Home"
import Recovery from "./pages/Recovery"

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/recovery" element={<Recovery />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
