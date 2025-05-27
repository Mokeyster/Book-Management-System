import { Outlet } from 'react-router-dom'
import { Toaster } from '@ui/sonner'

import Header from './Header'
import Sidebar from './Sidebar'
import { ScrollArea } from './ui/scroll-area'

const Layout = (): React.JSX.Element => {
  return (
    <div className="flex w-screen h-screen bg-background text-foreground">
      <Sidebar />
      <div className="flex flex-col flex-1">
        <Header />
        <ScrollArea className="flex-1 h-full">
          <div className="p-6">
            <Outlet />
          </div>
        </ScrollArea>
      </div>
      <Toaster position="top-right" />
    </div>
  )
}

export default Layout
