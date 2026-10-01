#!/usr/bin/env node
// Uso: node refresh.mjs hold|release
// Lo llaman los hooks de .claude/settings.json (UserPromptSubmit → hold, Stop → release).
// Habla con el plugin `agentRefresh` de vite.config.ts; si el dev server no está arriba, no hace nada.
const action = process.argv[2]
if (action !== 'hold' && action !== 'release') {
  console.error('Uso: node refresh.mjs hold|release')
  process.exit(1)
}
const port = process.env.DHD_PORT || '5173'
try {
  const res = await fetch(`http://localhost:${port}/__dhd/${action}`, {
    method: 'POST',
    signal: AbortSignal.timeout(1500),
  })
  const text = await res.text()
  if (text) console.error(`[refresh] ${action}: ${text}`)
} catch {
  // dev server apagado: nada que refrescar
}
