
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { fbPixel } from './utils/facebookPixel'

const container = document.getElementById("root");
if (!container) throw new Error("Failed to find the root element");
const root = createRoot(container);

// Track initial page view
fbPixel.trackPageView();

root.render(<App />);
