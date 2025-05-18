import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Toaster } from '@ui/sonner'

import Header from './Header'
import Sidebar from './Sidebar'

const Layout = (): React.JSX.Element => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  const toggleSidebar = (): void => {
    setSidebarCollapsed((prev) => !prev)
  }

  return (
    <div className="flex w-screen min-h-screen bg-background text-foreground">
      <Sidebar collapsed={sidebarCollapsed} />
      <div className="flex flex-col flex-1">
        <Header toggleSidebar={toggleSidebar} sidebarCollapsed={sidebarCollapsed} />
        <main className="flex-1 p-4 md:p-6">
          <Outlet />
        </main>
      </div>
      <Toaster position="top-right" />
    </div>
  )
}

export default Layout
