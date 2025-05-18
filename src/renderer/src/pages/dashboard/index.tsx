import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@ui/card'
import { BookCopy, Users, Calendar, Clock, CircleAlert, BookOpen } from 'lucide-react'
import {
  Bar,
  BarChart,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts'
import { formatDate } from '~/utils'
import { IBookStatistics, IBorrowStatistics, IReaderStatistics } from '@appTypes/statisticsTypes'

const Dashboard = (): React.JSX.Element => {
  const [bookStats, setBookStats] = useState<IBookStatistics | null>(null)
  const [borrowStats, setBorrowStats] = useState<IBorrowStatistics | null>(null)
  const [readerStats, setReaderStats] = useState<IReaderStatistics | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStatistics = async (): Promise<void> => {
      setLoading(true)
      try {
        const [bookData, borrowData, readerData] = await Promise.all([
          window.api.stats.getBookStatistics(),
          window.api.stats.getBorrowStatistics(),
          window.api.stats.getReaderStatistics()
        ])

        setBookStats(bookData)
        setBorrowStats(borrowData)
        setReaderStats(readerData)
      } catch (error) {
        console.error('获取统计数据失败:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchStatistics()
  }, [])

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">系统概览</h1>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-lg text-muted-foreground">加载统计数据中...</div>
        </div>
      ) : (
        <>
          {/* 概览卡片 */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <DashboardCard
              title="图书总数"
              value={bookStats?.totalBooks || 0}
              description="系统中的图书总量"
              icon={<BookCopy className="w-5 h-5 text-blue-500" />}
            />
            <DashboardCard
              title="读者总数"
              value={readerStats?.totalReaders || 0}
              description="注册的读者数量"
              icon={<Users className="w-5 h-5 text-green-500" />}
            />
            <DashboardCard
              title="今日借阅"
              value={borrowStats?.todayBorrowCount || 0}
              description={`截至 ${formatDate(new Date(), 'yyyy-MM-dd')}`}
              icon={<Calendar className="w-5 h-5 text-purple-500" />}
            />
            <DashboardCard
              title="逾期未还"
              value={borrowStats?.overdueCount || 0}
              description="需要跟进处理"
              icon={<CircleAlert className="w-5 h-5 text-red-500" />}
            />
          </div>

          {/* 图表 */}
          <div className="grid gap-4 md:grid-cols-2">
            {/* 借阅趋势图 */}
            <Card>
              <CardHeader>
                <CardTitle>近期借阅趋势</CardTitle>
                <CardDescription>最近7天借阅数据</CardDescription>
              </CardHeader>
              <CardContent className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={borrowStats?.dailyBorrowStats || []}>
                    <XAxis dataKey="date" tickFormatter={(value) => formatDate(value, 'MM-dd')} />
                    <YAxis />
                    <Tooltip
                      formatter={(value: number) => [value, '借阅数量']}
                      labelFormatter={(value) => formatDate(value, 'yyyy-MM-dd')}
                    />
                    <Line
                      type="monotone"
                      dataKey="count"
                      stroke="#8884d8"
                      name="借阅数量"
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* 分类分布图 */}
            <Card>
              <CardHeader>
                <CardTitle>图书分类分布</CardTitle>
                <CardDescription>按分类统计的图书数量</CardDescription>
              </CardHeader>
              <CardContent className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={bookStats?.categoryDistribution || []}>
                    <XAxis
                      dataKey="category_name"
                      tickFormatter={(value) =>
                        value.length > 10 ? `${value.substring(0, 10)}...` : value
                      }
                    />
                    <YAxis />
                    <Tooltip
                      formatter={(value: number) => [value, '图书数量']}
                      labelFormatter={(name) => `分类: ${name}`}
                    />
                    <Bar dataKey="count" name="图书数量" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* 活跃读者和受欢迎图书 */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>活跃读者</CardTitle>
                <CardDescription>借阅次数最多的读者</CardDescription>
              </CardHeader>
              <CardContent>
                {readerStats?.mostActiveReaders?.length ? (
                  <div className="space-y-4">
                    {readerStats.mostActiveReaders.slice(0, 5).map((reader, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="flex items-center justify-center w-8 h-8 text-sm rounded-full bg-muted">
                            {index + 1}
                          </div>
                          <span>{reader.name}</span>
                        </div>
                        <div className="flex items-center">
                          <BookOpen className="w-4 h-4 mr-1 text-muted-foreground" />
                          <span>{reader.borrow_count}本</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-6 text-center text-muted-foreground">暂无数据</div>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>热门图书</CardTitle>
                <CardDescription>借阅次数最多的图书</CardDescription>
              </CardHeader>
              <CardContent>
                {borrowStats?.popularBooks?.length ? (
                  <div className="space-y-4">
                    {borrowStats.popularBooks.slice(0, 5).map((book, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="flex items-center justify-center w-8 h-8 text-sm rounded-full bg-muted">
                            {index + 1}
                          </div>
                          <span className="text-sm">{book.title}</span>
                        </div>
                        <div className="flex items-center text-sm">
                          <Clock className="w-4 h-4 mr-1 text-muted-foreground" />
                          <span>{book.borrow_count}次</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-6 text-center text-muted-foreground">暂无数据</div>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  )
}

// 仪表盘卡片组件
const DashboardCard = ({
  title,
  value,
  description,
  icon
}: {
  title: string
  value: number
  description: string
  icon: React.ReactNode
}): React.JSX.Element => {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between space-x-4">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-3xl font-bold">{value.toLocaleString()}</p>
            <p className="mt-1 text-xs text-muted-foreground">{description}</p>
          </div>
          <div className="p-2 rounded-full bg-muted/20">{icon}</div>
        </div>
      </CardContent>
    </Card>
  )
}

export default Dashboard
