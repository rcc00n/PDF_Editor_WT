export type ApplicationMode = 'api' | 'demo' | 'unconfigured'

export function resolveMode(apiBase = '', demoFlag = ''): ApplicationMode {
  const api = apiBase.trim()
  if (demoFlag && demoFlag !== 'true' && demoFlag !== 'false') return 'unconfigured'
  if (demoFlag === 'true') return api ? 'unconfigured' : 'demo'
  return api ? 'api' : 'unconfigured'
}
