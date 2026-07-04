import { useEffect, useRef, useState } from 'react'

export default function Reveal({
  children,
  className = '',
  variant = 'up',
  delay = 0,
  as: Component = 'div',
  style,
  threshold = 0.12,
  rootMargin = '0px 0px -8% 0px',
  ...props
}) {
  const ref = useRef(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const node = ref.current
    if (!node) return undefined

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true)
          observer.disconnect()
        }
      },
      { threshold, rootMargin },
    )

    observer.observe(node)
    return () => observer.disconnect()
  }, [threshold, rootMargin])

  return (
    <Component
      ref={ref}
      className={`reveal reveal--${variant}${visible ? ' reveal--visible' : ''} ${className}`.trim()}
      style={{ '--reveal-delay': `${delay}ms`, ...style }}
      {...props}
    >
      {children}
    </Component>
  )
}
