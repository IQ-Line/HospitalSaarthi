import { PageHeader } from "@pulse/blocks/page-header"
import { BackButton } from "@pulse/blocks/back-button"
import { cn } from "@pulse/utils"

interface PageHeaderWithBackProps {
  title: string
  titleTrailing?: React.ReactNode
  actions?: React.ReactNode
  backButton?: {
    label?: string
    href?: string
    onClick?: () => void
  }
  className?: string
  noBorder?: boolean
}

export function PageHeaderWithBack({ title, titleTrailing, actions, backButton, className, noBorder }: PageHeaderWithBackProps) {
  return (
    <div className={cn(className, noBorder && "!border-b-0")}>
      <PageHeader
        title={title}
        titleTrailing={titleTrailing}
        leading={<BackButton {...backButton} />}
        actions={actions}
        noBorder={noBorder}
      />
    </div>
  )
}

