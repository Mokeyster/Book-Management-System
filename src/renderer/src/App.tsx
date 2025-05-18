import { RouterProvider } from 'react-router-dom'
import { Toaster } from '@ui/sonner'
import { ThemeProvider } from '~/components/ui/theme-provider'
import { router } from './router'
import './styles/tailwind.css'
import './assets/main.css'

function App(): React.JSX.Element {
  return (
    <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
      <RouterProvider router={router} />
      <Toaster richColors position="top-right" />
    </ThemeProvider>
  )
}

export default App
