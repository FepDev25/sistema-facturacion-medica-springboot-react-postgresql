import { useNavigate } from '@tanstack/react-router'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface BackToListButtonProps {
  fallbackTo: string
  label: string
}

export function BackToListButton({ fallbackTo, label }: BackToListButtonProps) {
  const navigate = useNavigate()

  function handleBack() {
    if (window.history.length > 1) {
      window.history.back()
      return
    }

    void navigate({ to: fallbackTo })
  }

  return (
    <Button variant="outline" size="sm" aria-label={label} onClick={handleBack}>
      <ArrowLeft className="h-4 w-4" />
      {label}
    </Button>
  )
}
