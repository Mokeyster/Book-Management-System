import { useNavigate } from 'react-router-dom'
import { Info } from 'lucide-react'
import { Button } from '@ui/button'

const NotFoundPage = (): React.JSX.Element => {
  const navigate = useNavigate()

  return (
    <div className="flex flex-col items-center justify-center w-screen h-screen gap-3 text-xl bg-background text-foreground">
      <Info className="w-16 h-16 text-muted-foreground" />
      <div>404 Not Found</div>
      <div className="text-sm text-muted-foreground">页面未找到</div>
      <Button variant="outline" onClick={() => navigate(-1)}>
        返回
      </Button>
    </div>
  )
}

export default NotFoundPage
