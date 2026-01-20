import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx'; // This must import App.jsx correctly!
import './index.css';

// Since we are using Tailwind classes directly, we don't need a separate CSS import.

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

