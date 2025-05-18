import { NavLink } from 'react-router-dom'
import {
  Book,
  BarChart4,
  BookCopy,
  Calendar,
  Clock,
  Users,
  Building2,
  Settings,
  Database,
  FileText,
  Home
} from 'lucide-react'

import { cn } from '~/utils'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@ui/tooltip'
import { ScrollArea } from '@ui/scroll-area'

interface SidebarProps {
  collapsed: boolean
}

interface NavItemProps {
  to: string
  icon: React.ReactNode
  label: string
  collapsed: boolean
}

const NavItem = ({ to, icon, label, collapsed }: NavItemProps): React.JSX.Element => {
  if (collapsed) {
    return (
      <TooltipProvider>
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>
            <NavLink
              to={to}
              className={({ isActive }) =>
                cn(
                  'flex items-center justify-center h-10 w-10 rounded-md my-1',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
                )
              }
            >
              {icon}
            </NavLink>
          </TooltipTrigger>
          <TooltipContent side="right" className="ml-2">
            {label}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          'flex items-center h-10 px-4 rounded-md my-1',
          isActive
            ? 'bg-primary text-primary-foreground'
            : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
        )
      }
    >
      {icon}
      <span className="ml-3">{label}</span>
    </NavLink>
  )
}

const Sidebar = ({ collapsed }: SidebarProps): React.JSX.Element => {
  return (
    <aside
      className={cn(
        'bg-card border-r border-border transition-all duration-300 overflow-hidden',
        collapsed ? 'w-[60px]' : 'w-[240px]'
      )}
    >
      <div
        className={cn(
          'flex items-center h-16 border-b border-border px-4',
          collapsed ? 'justify-center' : 'justify-start'
        )}
      >
        <Book className="w-8 h-8 text-primary" />
        {!collapsed && <span className="ml-2 text-lg font-semibold">图书管理系统</span>}
      </div>
      <ScrollArea className="px-2 py-2 h-[calc(100vh-64px)]">
        <nav>
          <NavItem to="/dashboard" icon={<Home size={20} />} label="首页" collapsed={collapsed} />

          <div className={cn('my-4', collapsed ? 'px-1' : 'px-3')}>
            <h3
              className={cn(
                'mb-1 text-xs font-medium text-muted-foreground',
                collapsed && 'text-center'
              )}
            >
              {collapsed ? '图书' : '图书管理'}
            </h3>
            <NavItem
              to="/books"
              icon={<BookCopy size={20} />}
              label="图书列表"
              collapsed={collapsed}
            />
            <NavItem
              to="/categories"
              icon={<Book size={20} />}
              label="分类管理"
              collapsed={collapsed}
            />
          </div>

          <div className={cn('my-4', collapsed ? 'px-1' : 'px-3')}>
            <h3
              className={cn(
                'mb-1 text-xs font-medium text-muted-foreground',
                collapsed && 'text-center'
              )}
            >
              {collapsed ? '借阅' : '借阅管理'}
            </h3>
            <NavItem
              to="/borrow/manage"
              icon={<Calendar size={20} />}
              label="借阅管理"
              collapsed={collapsed}
            />
            <NavItem
              to="/borrow/history"
              icon={<Clock size={20} />}
              label="借阅历史"
              collapsed={collapsed}
            />
            <NavItem
              to="/borrow/overdue"
              icon={<Clock size={20} />}
              label="逾期记录"
              collapsed={collapsed}
            />
          </div>

          <div className={cn('my-4', collapsed ? 'px-1' : 'px-3')}>
            <h3
              className={cn(
                'mb-1 text-xs font-medium text-muted-foreground',
                collapsed && 'text-center'
              )}
            >
              {collapsed ? '用户' : '用户管理'}
            </h3>
            <NavItem
              to="/readers"
              icon={<Users size={20} />}
              label="读者管理"
              collapsed={collapsed}
            />
            <NavItem
              to="/publishers"
              icon={<Building2 size={20} />}
              label="出版社管理"
              collapsed={collapsed}
            />
          </div>

          <div className={cn('my-4', collapsed ? 'px-1' : 'px-3')}>
            <h3
              className={cn(
                'mb-1 text-xs font-medium text-muted-foreground',
                collapsed && 'text-center'
              )}
            >
              {collapsed ? '系统' : '系统管理'}
            </h3>
            <NavItem
              to="/system/users"
              icon={<Settings size={20} />}
              label="用户管理"
              collapsed={collapsed}
            />
            <NavItem
              to="/system/configs"
              icon={<Settings size={20} />}
              label="系统设置"
              collapsed={collapsed}
            />
            <NavItem
              to="/system/backup"
              icon={<Database size={20} />}
              label="数据备份"
              collapsed={collapsed}
            />
            <NavItem
              to="/system/logs"
              icon={<FileText size={20} />}
              label="操作日志"
              collapsed={collapsed}
            />
          </div>

          <div className={cn('my-4', collapsed ? 'px-1' : 'px-3')}>
            <h3
              className={cn(
                'mb-1 text-xs font-medium text-muted-foreground',
                collapsed && 'text-center'
              )}
            >
              {collapsed ? '统计' : '统计分析'}
            </h3>
            <NavItem
              to="/reports"
              icon={<BarChart4 size={20} />}
              label="报表中心"
              collapsed={collapsed}
            />
          </div>
        </nav>
      </ScrollArea>
    </aside>
  )
}

export default Sidebar
