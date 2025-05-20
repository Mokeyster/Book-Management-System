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
import { ScrollArea } from '@ui/scroll-area'

interface NavItemProps {
  to: string
  icon: React.ReactNode
  label: string
}

const NavItem = ({ to, icon, label }: NavItemProps): React.JSX.Element => {
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

const Sidebar = (): React.JSX.Element => {
  return (
    <aside className="bg-card border-r border-border overflow-hidden w-[240px]">
      <div className="flex items-center justify-start h-16 px-4 border-b border-border">
        <Book className="w-8 h-8 text-primary" />
        <span className="ml-2 text-lg font-semibold">图书管理系统</span>
      </div>
      <ScrollArea className="px-2 py-2 h-[calc(100vh-64px)]">
        <nav>
          <NavItem to="/dashboard" icon={<Home size={20} />} label="首页" />

          <div className="px-3 my-4">
            <h3 className="mb-1 text-xs font-medium text-muted-foreground">图书管理</h3>
            <NavItem to="/books" icon={<BookCopy size={20} />} label="图书列表" />
            <NavItem to="/categories" icon={<Book size={20} />} label="分类管理" />
          </div>

          <div className="px-3 my-4">
            <h3 className="mb-1 text-xs font-medium text-muted-foreground">借阅管理</h3>
            <NavItem to="/borrow/manage" icon={<Calendar size={20} />} label="借阅管理" />
            <NavItem to="/borrow/history" icon={<Clock size={20} />} label="借阅历史" />
            <NavItem to="/borrow/overdue" icon={<Clock size={20} />} label="逾期记录" />
          </div>

          <div className="px-3 my-4">
            <h3 className="mb-1 text-xs font-medium text-muted-foreground">用户管理</h3>
            <NavItem to="/readers" icon={<Users size={20} />} label="读者管理" />
            <NavItem to="/publishers" icon={<Building2 size={20} />} label="出版社管理" />
          </div>

          <div className="px-3 my-4">
            <h3 className="mb-1 text-xs font-medium text-muted-foreground">系统管理</h3>
            <NavItem to="/system/users" icon={<Settings size={20} />} label="用户管理" />
            <NavItem to="/system/configs" icon={<Settings size={20} />} label="系统设置" />
            <NavItem to="/system/backup" icon={<Database size={20} />} label="数据备份" />
            <NavItem to="/system/logs" icon={<FileText size={20} />} label="操作日志" />
          </div>

          <div className="px-3 my-4">
            <h3 className="mb-1 text-xs font-medium text-muted-foreground">统计分析</h3>
            <NavItem to="/reports" icon={<BarChart4 size={20} />} label="报表中心" />
          </div>
        </nav>
      </ScrollArea>
    </aside>
  )
}

export default Sidebar
