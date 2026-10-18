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
          <XAxis type="number" dataKey="n" domain={[rows[0].n, rows[rows.length - 1].n]} allowDecimals={false} label={{ value: xLabel, position: 'insideBottom', offset: -10, fontSize: 12 }} tick={{ fontSize: 11 }} />
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

// Small teaching pictures for the eight special-cause rules. Values are in sigma units from the centre line.
const RULES = {
  1: { pts: [0.3, -0.5, 0.6, -0.2, 0.4, -0.7, 3.5, 0.2, -0.4, 0.5], hit: [6] },
  2: { pts: [-0.4, 0.5, 0.3, 0.8, 0.4, 1.0, 0.5, 0.7, 0.3, 0.9, 0.6, -0.3], hit: [1, 2, 3, 4, 5, 6, 7, 8, 9] },
  3: { pts: [0.3, -0.6, -0.3, 0.0, 0.4, 0.9, 1.4, 1.9, 2.4, 2.0], hit: [2, 3, 4, 5, 6, 7] },
  4: { pts: [0.2, 1.0, -1.0, 0.9, -0.9, 1.1, -1.0, 0.8, -0.9, 1.0, -0.8, 0.9, -1.0, 0.8, -0.9, 0.1], hit: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14] },
  5: { pts: [0.2, -0.4, 0.5, 2.4, 0.3, 2.5, -0.3, 0.4, -0.5], hit: [3, 4, 5] },
  6: { pts: [0.2, -0.3, 1.4, 1.3, 0.4, 1.5, 1.2, -0.2, 0.3], hit: [2, 3, 4, 5, 6] },
  7: { pts: [1.4, -1.3, 0.2, -0.3, 0.4, -0.2, 0.3, 0.1, -0.3, 0.2, -0.4, 0.3, -0.1, 0.4, -0.2, 0.3, -0.3, 1.2], hit: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16] },
  8: { pts: [0.3, 1.6, -1.4, 1.5, -1.7, 1.3, -1.5, 1.6, -1.4, 0.2], hit: [1, 2, 3, 4, 5, 6, 7, 8] },
}

export function RuleDiagram({ rule }) {
  const { pts, hit } = RULES[rule]
  const W = 280, H = 130, L = 30, R = 6, T = 8, B = 8
  const x = (i) => L + (i * (W - L - R)) / (pts.length - 1)
  const y = (v) => T + ((4 - Math.max(-3.9, Math.min(3.9, v))) * (H - T - B)) / 8
  const lines = [[3, 'UCL +3σ', C.limit], [2, '+2σ', '#9ca3af'], [1, '+1σ', '#9ca3af'], [0, 'CL', C.center], [-1, '-1σ', '#9ca3af'], [-2, '-2σ', '#9ca3af'], [-3, 'LCL -3σ', C.limit]]
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={`Example of rule ${rule}`}>
      {lines.map(([v, t, c]) => (
        <g key={v}>
          <line x1={L} x2={W - R} y1={y(v)} y2={y(v)} stroke={c} strokeWidth={v === 0 ? 1 : 0.7} strokeDasharray={Math.abs(v) === 3 ? '5 3' : '2 3'} />
          <text x={L - 3} y={y(v) + 3} fontSize="7.5" textAnchor="end" fill={c}>{t.replace('UCL ', '').replace('LCL ', '')}</text>
        </g>
      ))}
      <polyline fill="none" stroke={C.line} strokeWidth="1.3" points={pts.map((v, i) => `${x(i)},${y(v)}`).join(' ')} />
      {pts.map((v, i) => <circle key={i} cx={x(i)} cy={y(v)} r={hit.includes(i) ? 3.6 : 2.2} fill={hit.includes(i) ? C.bad : C.line} />)}
    </svg>
  )
}
