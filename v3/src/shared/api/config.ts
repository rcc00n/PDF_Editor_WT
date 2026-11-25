import { resolveMode } from './mode'

export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? '').trim()
export const APP_MODE = resolveMode(API_BASE_URL, import.meta.env.VITE_DEMO_MODE)
export const API_ENABLED = APP_MODE === 'api'
export const DEMO_MODE = APP_MODE === 'demo'
