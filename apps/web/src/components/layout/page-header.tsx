interface PageHeaderProps {
  title: string
  description?: string
  action?: React.ReactNode
}

export function PageHeader({ title, description, action }: PageHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-4 mb-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold gradient-text">{title}</h1>
        {description && (
          <p className="mt-1 text-sm text-text-tertiary">{description}</p>
        )}
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  )
}
