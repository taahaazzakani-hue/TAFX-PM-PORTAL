import React from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import App from './App.jsx';

// Load brand fonts
const link = document.createElement('link');
link.rel = 'stylesheet';
link.href =
  'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600&family=Inter:wght@400;500;600;700&display=swap';
document.head.appendChild(link);

createRoot(document.getElementById('root')).render(<App />);
