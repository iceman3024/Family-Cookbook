import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';

// Since we are using Tailwind classes directly, we don't need a separate CSS import.

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

