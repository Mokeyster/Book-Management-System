import { Loader2 } from 'lucide-react'

const Loading = (): React.JSX.Element => {
  return (
    <div className="flex items-center justify-center h-full min-h-[200px] w-full">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  )
}

export default Loading
