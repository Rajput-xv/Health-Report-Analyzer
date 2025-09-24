import React, { Suspense } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './styles/tailwind.css';
import './styles/global.css';
import './i18n';

import { LoadingProvider } from './context/LoadingContext.jsx';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Suspense fallback={<div style={{ padding: 20, textAlign: 'center' }}>Loading translations...</div>}>
      <LoadingProvider>
        <App />
      </LoadingProvider>
    </Suspense>
  </React.StrictMode>,
);