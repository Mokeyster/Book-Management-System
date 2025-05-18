import { Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '~/store/authStore'

interface AuthRouteProps {
  children: React.ReactNode
}

const AuthRoute: React.FC<AuthRouteProps> = ({ children }: AuthRouteProps) => {
  const { isAuthenticated } = useAuthStore()
  const location = useLocation()

  if (!isAuthenticated) {
    // 重定向到登录页，并保存当前路径作为重定向目标
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return <>{children}</>
}

export default AuthRoute
