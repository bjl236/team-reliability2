import React from 'react'
import {
  ComposedChart, Line, Area, Bar, BarChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceLine, ReferenceArea, ResponsiveContainer, Cell,
} from 'recharts'

const C = { line: '#2563eb', limit: '#dc2626', center: '#6b7280', spec: '#d97706', bad: '#dc2626', ok: '#16a34a', band: '#93c5fd' }
const num = (v, d = 1) => (v === null || v === undefined ? '-' : Number(v).toFixed(d))

function pad(values, extra = []) {
  const all = [...values, ...extra].filter((v) => v !== null && v !== undefined && Number.isFinite(v))
  const lo = Math.min(...all), hi = Math.max(...all), p = (hi - lo) * 0.08 || 1
  return [lo - p, hi + p]
}

export function ControlChart({ title, note, data, y, xLabel, yLabel, center, ucl, lcl, spec, flagged = [], baselineEnd, digits = 1 }) {
  const rows = data.map((d, i) => ({ ...d, n: d.n ?? i + 1 }))
  const bad = rows.filter((r, i) => flagged.includes(i)).map((r) => ({ n: r.n, v: r[y] }))
  const domain = pad(rows.map((r) => r[y]), [ucl, lcl, spec])
  return (
    <figure className="chart">
      <figcaption><strong>{title}</strong>{note && <span className="muted"> {note}</span>}</figcaption>
      <ResponsiveContainer width="100%" height={280}>
        <ComposedChart data={rows} margin={{ top: 8, right: 56, bottom: 18, left: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis type="number" dataKey="n" domain={[1, rows.length]} allowDecimals={false} label={{ value: xLabel, position: 'insideBottom', offset: -10, fontSize: 12 }} tick={{ fontSize: 11 }} />
          <YAxis domain={domain} tickFormatter={(v) => num(v, digits)} width={56} tick={{ fontSize: 11 }} label={{ value: yLabel, angle: -90, position: 'insideLeft', fontSize: 12, dx: -2 }} />
          <Tooltip formatter={(v) => num(v, digits + 1)} labelFormatter={(l) => `${xLabel} ${l}`} />
          {baselineEnd && <ReferenceArea x1={1} x2={baselineEnd} fill="#16a34a" fillOpacity={0.07} label={{ value: 'baseline', fontSize: 11, fill: C.ok, position: 'insideTopLeft' }} />}
          {ucl !== undefined && <ReferenceLine y={ucl} stroke={C.limit} strokeDasharray="5 4" label={{ value: 'UCL', position: 'right', fontSize: 11, fill: C.limit }} />}
          {lcl !== undefined && <ReferenceLine y={lcl} stroke={C.limit} strokeDasharray="5 4" label={{ value: 'LCL', position: 'right', fontSize: 11, fill: C.limit }} />}
          {center !== undefined && <ReferenceLine y={center} stroke={C.center} strokeDasharray="2 3" label={{ value: 'CL', position: 'right', fontSize: 11, fill: C.center }} />}
          {spec !== undefined && <ReferenceLine y={spec} stroke={C.spec} strokeWidth={1.5} label={{ value: 'Min', position: 'right', fontSize: 11, fill: C.spec }} />}
          <Line type="linear" dataKey={y} stroke={C.line} strokeWidth={1.5} dot={{ r: 2.5, fill: C.line }} isAnimationActive={false} />
          <Scatter data={bad} dataKey="v" xAxisId={0} fill={C.bad} shape="cross" legendType="none" isAnimationActive={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </figure>
  )
}

export function RollingChart({ rolling, target, window }) {
  const rows = rolling.map((r) => ({ ...r, band: r.ci_low === null ? null : [r.ci_low, r.ci_high] }))
  if (!rows.length) return null
  const domain = pad(rolling.flatMap((r) => [r.cpk, r.ci_low, r.ci_high]), [target])
  return (
    <figure className="chart">
      <figcaption><strong>Rolling Cpk</strong><span className="muted"> window of {window} prints, 95% interval</span></figcaption>
      <ResponsiveContainer width="100%" height={280}>
        <ComposedChart data={rows} margin={{ top: 8, right: 56, bottom: 18, left: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis type="number" dataKey="print_number" domain={['dataMin', 'dataMax']} allowDecimals={false} label={{ value: 'Print at end of window', position: 'insideBottom', offset: -10, fontSize: 12 }} tick={{ fontSize: 11 }} />
          <YAxis domain={domain} tickFormatter={(v) => num(v, 1)} width={56} tick={{ fontSize: 11 }} />
          <Tooltip formatter={(v) => (Array.isArray(v) ? v.map((x) => num(x, 2)).join(' to ') : num(v, 2))} />
          <Area dataKey="band" stroke="none" fill={C.band} fillOpacity={0.45} isAnimationActive={false} />
          <ReferenceLine y={target} stroke={C.limit} strokeDasharray="5 4" label={{ value: 'target', position: 'right', fontSize: 11, fill: C.limit }} />
          <Line type="linear" dataKey="cpk" stroke={C.line} strokeWidth={2} dot={false} isAnimationActive={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </figure>
  )
}

export function Histogram({ values, lsl }) {
  const lo = Math.min(...values), hi = Math.max(...values)
  const bins = Math.min(20, Math.max(6, Math.round(Math.sqrt(values.length) * 1.6)))
  const w = (hi - lo) / bins || 1
  const rows = Array.from({ length: bins }, (_, i) => ({ start: lo + i * w, mid: lo + (i + 0.5) * w, count: 0 }))
  values.forEach((v) => { rows[Math.min(bins - 1, Math.floor((v - lo) / w))].count += 1 })
  return (
    <figure className="chart">
      <figcaption><strong>Strength distribution</strong><span className="muted"> bars below the minimum are red</span></figcaption>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={rows} margin={{ top: 8, right: 16, bottom: 18, left: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="mid" tickFormatter={(v) => num(v, 0)} tick={{ fontSize: 11 }} label={{ value: 'Tensile strength (MPa)', position: 'insideBottom', offset: -10, fontSize: 12 }} />
          <YAxis allowDecimals={false} width={40} tick={{ fontSize: 11 }} />
          <Tooltip formatter={(v) => [v, 'prints']} labelFormatter={(l) => `${num(l, 0)} MPa`} />
          <Bar dataKey="count" isAnimationActive={false}>
            {rows.map((r, i) => <Cell key={i} fill={r.mid < lsl ? C.bad : C.line} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </figure>
  )
}
