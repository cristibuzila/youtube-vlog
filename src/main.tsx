// Defensive safeguard for browser iframe environments where window.fetch has only a getter
(function() {
  try {
    if (typeof window !== 'undefined') {
      const origFetch = window.fetch ? window.fetch.bind(window) : undefined;
      let activeFetch = origFetch;
      try {
        Object.defineProperty(window, 'fetch', {
          get() {
            return activeFetch;
          },
          set(newFetch) {
            activeFetch = newFetch;
          },
          configurable: true,
          enumerable: true,
        });
      } catch {
        if (window.Window && window.Window.prototype) {
          try {
            Object.defineProperty(window.Window.prototype, 'fetch', {
              get() {
                return activeFetch;
              },
              set(newFetch) {
                activeFetch = newFetch;
              },
              configurable: true,
              enumerable: true,
            });
          } catch {}
        }
      }
    }
  } catch {}
})();

import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
