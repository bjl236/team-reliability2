// Relative URLs (no leading slash) so the app works behind a path prefix on Posit Connect.
export async function getDefaults() {
  const r = await fetch('api/defaults')
  if (!r.ok) throw new Error('Could not load defaults')
  return r.json()
}

export async function getDatasets() {
  const r = await fetch('api/datasets')
  if (!r.ok) throw new Error('Could not load datasets')
  return r.json()
}

export async function analyze({ file, dataset, settings }) {
  const fd = new FormData()
  if (file) fd.append('file', file)
  else fd.append('dataset', dataset)
  fd.append('lsl', settings.lsl)
  fd.append('target_cpk', settings.targetCpk)
  if (settings.baseline) fd.append('baseline', settings.baseline)
  fd.append('subgroup_size', settings.subgroupSize)
  fd.append('window', settings.window)
  fd.append('tests', settings.tests.join(','))
  const limits = {}
  for (const [k, v] of Object.entries(settings.limits)) limits[k] = { lower: v.lower === '' ? null : Number(v.lower), upper: v.upper === '' ? null : Number(v.upper) }
  fd.append('limits', JSON.stringify(limits))
  const r = await fetch('api/analyze', { method: 'POST', body: fd })
  const body = await r.json().catch(() => ({}))
  if (!r.ok) throw new Error(body.detail || `Request failed (${r.status})`)
  return body
}

export function toCsv(rows) {
  if (!rows.length) return ''
  const cols = Object.keys(rows[0])
  const esc = (v) => (v === null || v === undefined ? '' : String(v).includes(',') ? `"${v}"` : String(v))
  return [cols.join(','), ...rows.map((r) => cols.map((c) => esc(r[c])).join(','))].join('\n')
}

export function download(name, text) {
  const url = URL.createObjectURL(new Blob([text], { type: 'text/csv' }))
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  URL.revokeObjectURL(url)
}
