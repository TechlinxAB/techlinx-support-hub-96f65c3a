
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import './App.css'

// Force white background at the earliest possible moment
document.body.style.backgroundColor = 'white';
document.documentElement.style.backgroundColor = 'white';

// Add a white loading screen immediately
const loadingDiv = document.createElement('div');
loadingDiv.style.position = 'fixed';
loadingDiv.style.inset = '0';
loadingDiv.style.backgroundColor = 'white';
loadingDiv.style.zIndex = '9999';
loadingDiv.id = 'initial-loading-screen';
document.body.appendChild(loadingDiv);

// Remove it after app mounts
window.addEventListener('load', () => {
  setTimeout(() => {
    const loadingScreen = document.getElementById('initial-loading-screen');
    if (loadingScreen) {
      loadingScreen.style.opacity = '0';
      setTimeout(() => {
        loadingScreen?.remove();
      }, 300);
    }
  }, 100);
});

const container = document.getElementById("root");
if (!container) throw new Error("Failed to find the root element");
const root = createRoot(container);

root.render(<App />);
