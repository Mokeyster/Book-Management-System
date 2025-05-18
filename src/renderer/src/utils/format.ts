import { format } from 'date-fns'

// 日期格式化
export const formatDate = (date: string | Date, formatString: string = 'yyyy-MM-dd'): string => {
  if (!date) return '-'
  const dateObj = typeof date === 'string' ? new Date(date) : date
  return format(dateObj, formatString)
}

// 图书状态映射
export const bookStatusMap = {
  1: { text: '在库', color: 'bg-green-500' },
  2: { text: '借出', color: 'bg-blue-500' },
  3: { text: '预约', color: 'bg-yellow-500' },
  4: { text: '损坏', color: 'bg-red-500' },
  5: { text: '丢失', color: 'bg-gray-500' }
}

// 读者状态映射
export const readerStatusMap = {
  1: { text: '正常', color: 'bg-green-500' },
  2: { text: '暂停', color: 'bg-yellow-500' },
  3: { text: '注销', color: 'bg-red-500' }
}

// 借阅状态映射
export const borrowStatusMap = {
  1: { text: '借出', color: 'bg-blue-500' },
  2: { text: '已归还', color: 'bg-green-500' },
  3: { text: '逾期', color: 'bg-red-500' },
  4: { text: '续借', color: 'bg-yellow-500' }
}

// 用户状态映射
export const userStatusMap = {
  1: { text: '正常', color: 'bg-green-500' },
  2: { text: '锁定', color: 'bg-yellow-500' },
  3: { text: '禁用', color: 'bg-red-500' }
}

// 获取状态徽章样式
export const getStatusBadgeClass = (
  status: number,
  statusMap: Record<number, { text: string; color: string }>
): string => {
  const { color } = statusMap[status] || { color: 'bg-gray-500' }
  return `${color} text-white text-xs font-medium px-2.5 py-0.5 rounded`
}
