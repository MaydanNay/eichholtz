export function buildPublishedRowMenuItems({ published, onTogglePublish, onEdit, onDelete }) {
  return [
    {
      label: published ? 'Снять с публикации' : 'Опубликовать',
      onClick: onTogglePublish,
    },
    { label: 'Редактировать', onClick: onEdit },
    { label: 'Удалить', onClick: onDelete, danger: true },
  ]
}

export function buildBasicRowMenuItems({ onEdit, onDelete }) {
  return [
    { label: 'Редактировать', onClick: onEdit },
    { label: 'Удалить', onClick: onDelete, danger: true },
  ]
}
