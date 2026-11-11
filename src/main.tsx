import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { Toaster } from 'sonner'
import { AppErrorBoundary } from '@/components/feedback/AppErrorBoundary'
import { Providers } from '@/app/providers'
import { router } from '@/app/router'
import './styles/globals.css'

const root = document.getElementById('root')

if (!root) {
  throw new Error('No se encontró el elemento #root.')
}

createRoot(root).render(
  <StrictMode>
    <AppErrorBoundary>
      <Providers>
        <RouterProvider router={router} />
        <Toaster
          theme="dark"
          position="top-right"
          closeButton
          toastOptions={{
            style: {
              background: '#161E2B',
              border: '1px solid #2F3947',
              color: '#FFFFFF',
            },
          }}
        />
      </Providers>
    </AppErrorBoundary>
  </StrictMode>,
)
