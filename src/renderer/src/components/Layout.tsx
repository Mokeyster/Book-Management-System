import { Outlet } from 'react-router-dom'
import { Toaster } from '@ui/sonner'

import Header from './Header'
import Sidebar from './Sidebar'

const Layout = (): React.JSX.Element => {
  return (
    <div className="flex w-screen min-h-screen bg-background text-foreground">
      <Sidebar />
      <div className="flex flex-col flex-1">
        <Header />
        <main className="flex-1 p-4 md:p-6">
          <Outlet />
        </main>
      </div>
      <Toaster position="top-right" />
    </div>
  )
}

export default Layout
