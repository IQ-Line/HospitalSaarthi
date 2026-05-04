import { useNavigate } from "@tanstack/react-router"
import { Button } from "@pulse/ui/button"
import { ArrowLeft } from "lucide-react"

interface BackButtonProps {
  label?: string
  href?: string
  onClick?: () => void
  className?: string
}

export function BackButton({ label, href, onClick, className }: BackButtonProps) {
  const navigate = useNavigate()

  const handleClick = () => {
    if (onClick) {
      onClick()
    } else if (href) {
      navigate(href)
    } else {
      navigate(-1)
    }
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      className={`h-8 w-8 p-0 ${className || ""}`}
      onClick={handleClick}
    >
      <ArrowLeft className="h-4 w-4" />
      {label && <span className="ml-2">{label}</span>}
    </Button>
  )
}


