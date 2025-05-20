import { Bell, ChevronDown, LogOut, Moon, Settings, Sun, User } from 'lucide-react'
import { useTheme } from '~/hooks/useTheme'
import { Button } from '@ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@ui/dropdown-menu'
import { useAuthStore } from '~/store/authStore'
import { useNavigate } from 'react-router-dom'
import { Avatar, AvatarFallback } from '@ui/avatar'

const Header = (): React.JSX.Element => {
  const { theme, setTheme } = useTheme()
  const { currentUser, logout } = useAuthStore()
  const navigate = useNavigate()

  const handleLogout = (): void => {
    logout()
    navigate('/login')
  }

  return (
    <header className="flex items-center justify-between h-16 px-4 border-b border-border bg-card">
      <div className="flex items-center"></div>

      <div className="flex items-center space-x-3">
        <Button variant="ghost" size="icon" className="text-muted-foreground">
          <Bell className="w-5 h-5" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="text-muted-foreground">
              {theme === 'dark' ? (
                <Moon className="w-5 h-5" />
              ) : theme === 'light' ? (
                <Sun className="w-5 h-5" />
              ) : (
                <Sun className="w-5 h-5" />
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setTheme('light')}>
              <Sun className="w-4 h-4 mr-2" />
              <span>浅色模式</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTheme('dark')}>
              <Moon className="w-4 h-4 mr-2" />
              <span>深色模式</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTheme('system')}>
              <Settings className="w-4 h-4 mr-2" />
              <span>系统设置</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center space-x-2">
              <Avatar className="w-8 h-8">
                <AvatarFallback>
                  {currentUser?.real_name?.[0] || currentUser?.username?.[0] || 'U'}
                </AvatarFallback>
              </Avatar>
              <span className="font-medium">{currentUser?.real_name || currentUser?.username}</span>
              <ChevronDown className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>我的账户</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate('/profile')}>
              <User className="w-4 h-4 mr-2" />
              <span>个人资料</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate('/system/configs')}>
              <Settings className="w-4 h-4 mr-2" />
              <span>系统设置</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-2" />
              <span>退出登录</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}

export default Header
