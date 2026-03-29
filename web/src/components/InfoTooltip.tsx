import { useEffect, useId, useRef, useState } from 'react'

type InfoTooltipProps = {
  label: string
  description: string
  className?: string
}

function InfoTooltip(props: InfoTooltipProps) {
  const { label, description, className } = props

  const [isOpen, setIsOpen] = useState(false)
  const tooltipId = useId()
  const rootRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    if (!isOpen) {
      return
    }

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target
      if (!(target instanceof Node)) {
        return
      }
      if (!rootRef.current?.contains(target)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('pointerdown', handlePointerDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
    }
  }, [isOpen])

  const rootClass = [
    'info-tooltip',
    className ?? '',
    isOpen ? 'is-open' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <span ref={rootRef} className={rootClass}>
      <span className="info-tooltip-label">{label}</span>
      <span
        className="info-tooltip-trigger"
        role="button"
        tabIndex={0}
        aria-describedby={tooltipId}
        aria-expanded={isOpen}
        aria-label={`Show description for ${label}`}
        onClick={(event) => {
          event.preventDefault()
          event.stopPropagation()
          setIsOpen((previous) => !previous)
        }}
        onBlur={(event) => {
          const next = event.relatedTarget
          if (!(next instanceof Node) || !rootRef.current?.contains(next)) {
            setIsOpen(false)
          }
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            setIsOpen((previous) => !previous)
            return
          }

          if (event.key === 'Escape') {
            event.preventDefault()
            setIsOpen(false)
          }
        }}
      >
        ?
      </span>
      <span id={tooltipId} role="tooltip" className="info-tooltip-content">
        {description}
      </span>
    </span>
  )
}

export default InfoTooltip
