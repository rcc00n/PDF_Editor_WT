export type ApplicationMode = 'api' | 'demo' | 'unconfigured'

export function resolveMode(apiBase = '', demoFlag = ''): ApplicationMode {
  const api = apiBase.trim()
  if (demoFlag && demoFlag !== 'true' && demoFlag !== 'false') return 'unconfigured'
  if (demoFlag === 'true') return api ? 'unconfigured' : 'demo'
  return api ? 'api' : 'unconfigured'
}

// Older builds mixed demo and connected records under rf_store_v1. Never
// automatically upload that ambiguous queue; preserve the old key for review.
export function stateStorageKey(mode: ApplicationMode) {
  return mode === 'api' ? 'rf_api_store_v2' : mode === 'demo' ? 'rf_demo_store_v1' : 'rf_unconfigured_store_v1'
}

export function pdfStorageKey(mode: ApplicationMode) {
  return mode === 'api' ? 'rf_api_pdf_cache_v2' : mode === 'demo' ? 'rf_demo_offline_cache' : 'rf_unconfigured_pdf_cache'
}
