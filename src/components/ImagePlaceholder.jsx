export default function ImagePlaceholder({ label, className = '', aspectRatio }) {
  const style = aspectRatio ? { aspectRatio } : undefined

  return (
    <div className={`placeholder ${className}`} style={style} role="img" aria-label={label || 'Заглушка изображения'}>
      {label && <span className="placeholder__label">{label}</span>}
    </div>
  )
}
