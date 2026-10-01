import '@fontsource-variable/cinzel';
import '@fontsource-variable/nunito';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './styles.css';
import './styles-app.css';
import './pwa/install';
import { registerSW } from './pwa/register';

async function boot() {
  // canvas textures need the face font to be ready before the first dice are painted
  try {
    await Promise.race([
      Promise.all([document.fonts.load('900 64px "Nunito Variable"'), document.fonts.load('700 32px "Cinzel Variable"')]),
      new Promise((r) => setTimeout(r, 1500)),
    ]);
  } catch {
    /* fonts are optional */
  }
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
  registerSW();
}

boot();
