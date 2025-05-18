import { Suspense, lazy } from 'react'
import { createBrowserRouter, Navigate } from 'react-router-dom'

import Layout from '~/components/Layout'
import Loading from '~/components/Loading'
import LoginPage from '~/pages/auth/LoginPage'
import Dashboard from '~/pages/dashboard'
import NotFoundPage from '~/pages/404'

// 路由懒加载
const BookManagement = lazy(() => import('~/pages/books/BookManagement'))
const BookCategoryPage = lazy(() => import('~/pages/books/BookCategoryPage'))
const BookDetail = lazy(() => import('~/pages/books/BookDetail'))
const ReaderManagement = lazy(() => import('~/pages/readers/ReaderManagement'))
const ReaderDetail = lazy(() => import('~/pages/readers/ReaderDetail'))
const BorrowManagement = lazy(() => import('~/pages/borrow/BorrowManagement'))
const BorrowHistory = lazy(() => import('~/pages/borrow/BorrowHistory'))
const OverdueRecords = lazy(() => import('~/pages/borrow/OverdueRecords'))
const PublisherManagement = lazy(() => import('~/pages/publishers/PublisherManagement'))
const UserManagement = lazy(() => import('~/pages/system/UserManagement'))
const ConfigManagement = lazy(() => import('~/pages/system/ConfigManagement'))
const DataBackup = lazy(() => import('~/pages/system/DataBackup'))
const OperationLogs = lazy(() => import('~/pages/system/OperationLogs'))
const ReportCenter = lazy(() => import('~/pages/reports/ReportCenter'))

// 路由鉴权组件
import AuthRoute from './AuthRoute'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Navigate to="/dashboard" replace />
  },
  {
    path: '/login',
    element: <LoginPage />
  },
  {
    path: '/',
    element: (
      <AuthRoute>
        <Layout />
      </AuthRoute>
    ),
    children: [
      {
        path: 'dashboard',
        element: <Dashboard />
      },
      {
        path: 'books',
        element: (
          <Suspense fallback={<Loading />}>
            <BookManagement />
          </Suspense>
        )
      },
      {
        path: 'books/:id',
        element: (
          <Suspense fallback={<Loading />}>
            <BookDetail />
          </Suspense>
        )
      },
      {
        path: 'categories',
        element: (
          <Suspense fallback={<Loading />}>
            <BookCategoryPage />
          </Suspense>
        )
      },
      {
        path: 'readers',
        element: (
          <Suspense fallback={<Loading />}>
            <ReaderManagement />
          </Suspense>
        )
      },
      {
        path: 'readers/:id',
        element: (
          <Suspense fallback={<Loading />}>
            <ReaderDetail />
          </Suspense>
        )
      },
      {
        path: 'borrow/manage',
        element: (
          <Suspense fallback={<Loading />}>
            <BorrowManagement />
          </Suspense>
        )
      },
      {
        path: 'borrow/history',
        element: (
          <Suspense fallback={<Loading />}>
            <BorrowHistory />
          </Suspense>
        )
      },
      {
        path: 'borrow/overdue',
        element: (
          <Suspense fallback={<Loading />}>
            <OverdueRecords />
          </Suspense>
        )
      },
      {
        path: 'publishers',
        element: (
          <Suspense fallback={<Loading />}>
            <PublisherManagement />
          </Suspense>
        )
      },
      {
        path: 'system/users',
        element: (
          <Suspense fallback={<Loading />}>
            <UserManagement />
          </Suspense>
        )
      },
      {
        path: 'system/configs',
        element: (
          <Suspense fallback={<Loading />}>
            <ConfigManagement />
          </Suspense>
        )
      },
      {
        path: 'system/backup',
        element: (
          <Suspense fallback={<Loading />}>
            <DataBackup />
          </Suspense>
        )
      },
      {
        path: 'system/logs',
        element: (
          <Suspense fallback={<Loading />}>
            <OperationLogs />
          </Suspense>
        )
      },
      {
        path: 'reports',
        element: (
          <Suspense fallback={<Loading />}>
            <ReportCenter />
          </Suspense>
        )
      }
    ]
  },
  {
    path: '*',
    element: <NotFoundPage />
  }
])
