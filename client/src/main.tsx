import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Set default theme from system preferences or local storage
const darkModePreference = localStorage.getItem('darkMode');
if (darkModePreference === 'true' || 
    (darkModePreference === null && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
  document.documentElement.classList.add('dark');
} else {
  document.documentElement.classList.remove('dark');
}

createRoot(document.getElementById("root")!).render(<App />);
