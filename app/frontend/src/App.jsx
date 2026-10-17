import React, { useEffect, useMemo, useRef, useState } from 'react'
import { analyze, download, getDatasets, getDefaults, toCsv } from './api.js'
import { ControlChart, Histogram, RollingChart } from './Charts.jsx'

const TESTS = {
  1: 'One point beyond 3 sigma', 2: '9 in a row on one side', 3: '6 in a row trending', 4: '14 in a row alternating',
  5: '2 of 3 beyond 2 sigma', 6: '4 of 5 beyond 1 sigma', 7: '15 in a row within 1 sigma', 8: '8 in a row beyond 1 sigma',
}
const LABEL = {
  laser_power_w: 'Laser power (W)', scan_speed_mm_s: 'Scan speed (mm/s)', oxygen_ppm: 'Oxygen (ppm)',
  porosity_pct: 'Porosity (%)', build_orientation_deg: 'Build orientation (deg)',
}
const f = (v, d = 2) => (v === null || v === undefined ? 'n/a' : Number(v).toFixed(d))

function Card({ label, value, sub, tone }) {
  return (
    <div className={`card ${tone || ''}`}>
      <div className="card-label">{label}</div>
      <div className="card-value">{value}</div>
      {sub && <div className="card-sub">{sub}</div>}
    </div>
  )
}

function Section({ title, hint, children }) {
  return (
    <section>
      <h2>{title}</h2>
      {hint && <p className="muted hint">{hint}</p>}
      {children}
    </section>
  )
}

export default function App() {
  const [defaults, setDefaults] = useState(null)
  const [datasets, setDatasets] = useState([])
  const [source, setSource] = useState({ dataset: 'dataSet2', file: null })
  const [s, setS] = useState(null)            // settings
  const [res, setRes] = useState(null)
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const seq = useRef(0)

  useEffect(() => {
    Promise.all([getDefaults(), getDatasets()]).then(([d, ds]) => {
      setDefaults(d); setDatasets(ds)
      setS({ lsl: d.lsl, targetCpk: d.target_cpk, baseline: '', subgroupSize: d.subgroup_size, window: d.window, tests: d.tests,
             limits: Object.fromEntries(Object.entries(d.limits).map(([k, v]) => [k, { lower: v.lower ?? '', upper: v.upper ?? '' }])) })
    }).catch((e) => setErr(String(e.message || e)))
  }, [])

  useEffect(() => {
    if (!s) return
    const id = ++seq.current
    setBusy(true)
    const t = setTimeout(() => {
      analyze({ file: source.file, dataset: source.dataset, settings: s })
        .then((r) => { if (id === seq.current) { setRes(r); setErr('') } })
        .catch((e) => { if (id === seq.current) { setErr(String(e.message || e)); setRes(null) } })
        .finally(() => { if (id === seq.current) setBusy(false) })
    }, 350)
    return () => clearTimeout(t)
  }, [s, source])

  const set = (k, v) => setS((p) => ({ ...p, [k]: v }))
  const setLimit = (p, side, v) => setS((x) => ({ ...x, limits: { ...x.limits, [p]: { ...x.limits[p], [side]: v } } }))
  const toggleTest = (t) => set('tests', s.tests.includes(t) ? s.tests.filter((x) => x !== t) : [...s.tests, t].sort())

  const status = useMemo(() => {
    if (!res) return null
    if (!res.stable) return { tone: 'bad', text: `OUT OF CONTROL from print ${res.first_signal_print}: ${res.ooc_count} print(s) flagged. Find and remove the special cause before trusting capability (baseline = prints 1-${res.baseline}).` }
    if (!res.capable) return { tone: 'warn', text: 'STABLE BUT NOT CAPABLE: the process is in control but does not meet the required capability. This is a spread/centering problem, not a special cause.' }
    return { tone: 'good', text: 'SCREENING PASSED: no control signals and Cpk and Ppk both meet the target. Passing is not qualification.' }
  }, [res])

  if (!s) return <div className="boot">{err ? <p className="error">{err}</p> : 'Loading...'}</div>

  const xbar = res?.xbar
  const iRows = res ? res.x.map((v, i) => ({ n: i + 1, v })) : []
  const xbRows = xbar ? xbar.means.map((v, i) => ({ n: i + 1, m: v, r: xbar.ranges[i] })) : []

  return (
    <div className="app">
      <aside>
        <h1>AeroPrint QC</h1>
        <p className="muted small">SPC and capability screening for 3D-printed titanium brackets. Synthetic demo data; not an aerospace qualification system.</p>

        <h3>Data</h3>
        <div className="seg">
          {datasets.map((d) => (
            <button key={d.name} className={!source.file && source.dataset === d.name ? 'on' : ''} title={d.description}
                    onClick={() => setSource({ dataset: d.name, file: null })}>{d.name}</button>
          ))}
        </div>
        <p className="muted small">{source.file ? `Uploaded: ${source.file.name}` : datasets.find((d) => d.name === source.dataset)?.description}</p>
        <label className="file">Upload your CSV
          <input type="file" accept=".csv,text/csv" onChange={(e) => e.target.files[0] && setSource({ dataset: null, file: e.target.files[0] })} />
        </label>
        <p className="muted small">One row per print, in production order. Required column: <code>tensile_strength_mpa</code>. Optional: laser_power_w, scan_speed_mm_s, oxygen_ppm, porosity_pct, build_orientation_deg.</p>

        <h3>Requirements</h3>
        <label>Minimum tensile strength (MPa)
          <input type="number" value={s.lsl} step="10" onChange={(e) => set('lsl', e.target.value)} /></label>
        <label>Minimum required Cpk
          <input type="number" value={s.targetCpk} step="0.01" onChange={(e) => set('targetCpk', e.target.value)} /></label>

        <h3>Tolerances (editable)</h3>
        <table className="limits">
          <thead><tr><th>Parameter</th><th>Lower</th><th>Upper</th></tr></thead>
          <tbody>
            {Object.keys(s.limits).map((p) => (
              <tr key={p}>
                <td>{LABEL[p]}</td>
                <td><input type="number" value={s.limits[p].lower} onChange={(e) => setLimit(p, 'lower', e.target.value)} /></td>
                <td><input type="number" value={s.limits[p].upper} onChange={(e) => setLimit(p, 'upper', e.target.value)} /></td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="muted small">Leave a box empty for no limit. Demonstration thresholds, not aerospace limits.</p>

        <h3>Special-cause tests</h3>
        {Object.entries(TESTS).map(([t, name]) => (
          <label key={t} className="check"><input type="checkbox" checked={s.tests.includes(Number(t))} onChange={() => toggleTest(Number(t))} /> {t}: {name}</label>
        ))}
        <p className="muted small">More tests catch smaller shifts but raise false alarms. On 60 prints of pure noise: test 1 alone about 22%, tests 1+2 about 30%, tests 1,2,5,6 about 45%, all eight about 60%.</p>

        <h3>Advanced</h3>
        <label>Baseline prints (0 = automatic)
          <input type="number" min="0" value={s.baseline} placeholder="auto" onChange={(e) => set('baseline', e.target.value)} /></label>
        <label>X-bar subgroup size
          <select value={s.subgroupSize} onChange={(e) => set('subgroupSize', e.target.value)}>
            {[2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => <option key={n}>{n}</option>)}</select></label>
        <label>Rolling Cpk window (prints)
          <input type="number" min="5" value={s.window} onChange={(e) => set('window', e.target.value)} /></label>
      </aside>

      <main>
        {busy && <div className="busy">Analysing...</div>}
        {err && <p className="error" role="alert">Cannot analyse input: {err}</p>}
        {res && (<>
          <div className={`banner ${status.tone}`} role="status">{status.text}</div>
          {res.warnings.map((w, i) => <p key={i} className="muted small">Note: {w}</p>)}

          <div className="cards">
            <Card label="Mean strength" value={`${f(res.mean, 1)} MPa`} sub={`SD ${f(res.overall_sd, 1)} MPa, n = ${res.n}`} />
            <Card label="Cpk (within sigma)" value={f(res.cpk)} sub={res.cpk === null ? 'undefined: no variation' : `95% CI ${f(res.cpk_ci[0])} to ${f(res.cpk_ci[1])}`} tone={res.cpk !== null && res.cpk >= res.target_cpk ? 'good' : 'bad'} />
            <Card label="Ppk (overall sigma)" value={f(res.ppk)} sub={`target ${f(res.target_cpk)}`} tone={res.ppk !== null && res.ppk >= res.target_cpk ? 'good' : 'bad'} />
            <Card label="Prints below requirement" value={`${res.below_count} / ${res.n}`} sub={`minimum ${res.lsl} MPa`} tone={res.below_count ? 'bad' : 'good'} />
            <Card label="Out-of-control prints" value={res.ooc_count} sub={res.first_signal_print ? `first at print ${res.first_signal_print}` : 'none flagged'} tone={res.ooc_count ? 'bad' : 'good'} />
          </div>
          {res.first_below_target_print && <p className="info">Rolling Cpk first fell below {f(res.target_cpk)} at print {res.first_below_target_print}.</p>}

          <Section title="Control charts" hint={`Limits come from the baseline (prints 1-${res.baseline}, shaded), not the whole series. Tests applied: ${res.tests_used.join(', ')}.`}>
            <div className="grid2">
              <ControlChart title="Individuals chart (I)" note="each print" data={iRows} y="v" xLabel="Print" yLabel="Strength (MPa)"
                            center={res.center} ucl={res.ucl} lcl={res.lcl} spec={res.lsl} flagged={res.flagged} baselineEnd={res.baseline} />
              <RollingChart rolling={res.rolling} target={res.target_cpk} window={res.window} />
              <ControlChart title={`X-bar chart (subgroups of ${xbar.n})`} note={`${xbar.subgroups} subgroups`} data={xbRows} y="m" xLabel="Subgroup" yLabel="Mean (MPa)"
                            center={xbar.xbar_center} ucl={xbar.xbar_ucl} lcl={xbar.xbar_lcl} flagged={xbar.xbar_flagged} baselineEnd={xbar.baseline_k} />
              <ControlChart title="R chart" note="range within subgroup" data={xbRows} y="r" xLabel="Subgroup" yLabel="Range (MPa)"
                            center={xbar.r_center} ucl={xbar.r_ucl} lcl={xbar.r_lcl} flagged={xbar.r_flagged} baselineEnd={xbar.baseline_k} />
              <Histogram values={res.x} lsl={res.lsl} />
            </div>
          </Section>

          <Section title="Process-parameter inspection" hint="Pass/fail of each print against the tolerances, plus capability. Cp and Pp need two limits. Cpk uses within sigma (moving range), Ppk uses overall SD; status is judged on Ppk.">
            <div className="scroll"><table>
              <thead><tr><th>Parameter</th><th>Lower</th><th>Upper</th><th>Mean</th><th>% outside</th><th>Cp</th><th>Cpk</th><th>Pp</th><th>Ppk</th><th>First signal</th><th>Status</th></tr></thead>
              <tbody>{res.parameters.map((p) => (
                <tr key={p.parameter}>
                  <td>{LABEL[p.parameter]}</td><td>{p.lsl ?? '-'}</td><td>{p.usl ?? '-'}</td><td>{f(p.mean, 3)}</td>
                  <td>{f(p.pct_out_of_spec, 1)}</td><td>{f(p.cp)}</td><td>{f(p.cpk)}</td><td>{f(p.pp)}</td><td>{f(p.ppk)}</td>
                  <td>{p.first_signal_print ? `print ${p.first_signal_print}` : '-'}</td>
                  <td><span className={`chip ${p.status.startsWith('ok') ? 'good' : 'bad'}`}>{p.status}</span></td>
                </tr>))}
                {!res.parameters.length && <tr><td colSpan="11" className="muted">No process-parameter columns with limits found (they are optional).</td></tr>}
              </tbody></table></div>
          </Section>

          {res.associations.length > 0 && (
            <Section title="Which parameters move with strength?" hint="Pearson correlation across prints. A lead for investigation, not proof of cause.">
              <div className="scroll"><table><thead><tr><th>Parameter</th><th>Pearson r</th><th>p-value (exploratory)</th></tr></thead>
                <tbody>{res.associations.map((a) => <tr key={a.parameter}><td>{LABEL[a.parameter]}</td><td>{f(a.r, 3)}</td><td>{a.p_value < 0.001 ? '<0.001' : f(a.p_value, 3)}</td></tr>)}</tbody></table></div>
            </Section>)}

          <Section title="Suggested corrective investigations">
            <ul className="actions">{res.actions.map((a, i) => <li key={i}>{a}</li>)}</ul>
          </Section>

          <Section title="Inspect and export" hint="Per-print results with pass/fail against every tolerance and the SPC flags.">
            <button className="primary" onClick={() => download('aeroprint_results.csv', toCsv(res.table))}>Download results CSV</button>
            <div className="scroll"><table>
              <thead><tr><th>#</th><th>Strength</th><th>Flag</th><th>Tests</th>{res.parameters.map((p) => <th key={p.parameter}>{LABEL[p.parameter]}</th>)}</tr></thead>
              <tbody>{res.table.slice(0, 25).map((r) => (
                <tr key={r.print_number} className={r.flag !== 'OK' ? 'row-bad' : ''}>
                  <td>{r.print_number}</td><td>{r.tensile_strength_mpa}</td><td>{r.flag}</td><td>{r.tests_triggered}</td>
                  {res.parameters.map((p) => <td key={p.parameter} className={r[`${p.parameter}_in_spec`] === false ? 'cell-bad' : ''}>{r[p.parameter]}</td>)}
                </tr>))}</tbody></table></div>
            {res.table.length > 25 && <p className="muted small">Showing 25 of {res.table.length} prints. The download has all of them.</p>}
          </Section>
        </>)}
      </main>
    </div>
  )
}
