import type { Field } from '@/entities/types'

const BASE_WIDTH = 0.34
const BASE_HEIGHT = 0.055
const BASE_FONT_SIZE = 12
const BASE_CHARS = 32

function supportsMaxLength(field: Field) {
  return field.type === 'text' || field.type === 'numeric'
}

export function suggestedMaxLength(field: Field) {
  if (!supportsMaxLength(field)) return undefined
  const fontSize = field.fontSize ?? BASE_FONT_SIZE
  const widthScale = field.w / BASE_WIDTH
  const fontScale = BASE_FONT_SIZE / fontSize
  const charsPerLine = Math.max(6, Math.round(BASE_CHARS * widthScale * fontScale))
  const lines = field.key === 'notes' ? Math.max(2, Math.round(field.h / BASE_HEIGHT)) : 1
  return Math.max(6, charsPerLine * lines)
}

export function resolveMaxLength(field: Field) {
  if (!supportsMaxLength(field)) return undefined
  if (typeof field.maxLength === 'number' && field.maxLength > 0) return Math.round(field.maxLength)
  return suggestedMaxLength(field)
}

export function supportsFieldMaxLength(field: Field) {
  return supportsMaxLength(field)
}
