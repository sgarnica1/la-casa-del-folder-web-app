import React from 'react'
import ReactDOM from 'react-dom/client'
import { ClerkProvider } from '@clerk/clerk-react'
import { esES } from '@clerk/localizations'
import { initMercadoPago } from '@mercadopago/sdk-react'
import App from './app/App.tsx'
import './index.css'

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
const MERCADO_PAGO_PUBLIC_KEY = import.meta.env.VITE_MERCADO_PAGO_PUBLIC_KEY;

if (MERCADO_PAGO_PUBLIC_KEY) {
  initMercadoPago(MERCADO_PAGO_PUBLIC_KEY);
}

if (!PUBLISHABLE_KEY) {
  throw new Error("Missing Clerk Publishable Key");
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ClerkProvider
      publishableKey={PUBLISHABLE_KEY}
      afterSignOutUrl="/"
      localization={esES}
      appearance={{
        elements: {
          modalContent: 'z-50'
        }
      }}
    >
      <App />
    </ClerkProvider>
  </React.StrictMode>,
)