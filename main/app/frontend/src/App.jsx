import React, { useEffect, useMemo, useRef, useState } from 'react'
import { analyze, download, getDatasets, getDefaults, toCsv } from './api.js'
import { ControlChart, Histogram, RuleDiagram } from './Charts.jsx'
import ProcessFlow from './ProcessFlow.jsx'

const TESTS = {
  1: 'One point beyond 3 sigma', 2: '9 in a row on one side', 3: '6 in a row trending', 4: '14 in a row alternating',
  5: '2 of 3 beyond 2 sigma', 6: '4 of 5 beyond 1 sigma', 7: '15 in a row within 1 sigma', 8: '8 in a row beyond 1 sigma',
}
const RULE_TEXT = {
  1: 'A single print lies outside the 3σ control limits: a sudden jump.',
  2: 'Nine prints in a row on the same side of the centre line: the average has shifted.',
  3: 'Six prints in a row, each higher (or each lower) than the last: a steady drift.',
  4: 'Fourteen prints in a row going up, down, up, down: two alternating influences, for example two machines or two powder lots.',
  5: 'Two out of three prints beyond 2σ on the same side: an early warning of a shift.',
  6: 'Four out of five prints beyond 1σ on the same side: a small shift.',
  7: 'Fifteen prints in a row all within 1σ of the centre line: suspiciously little variation (for example, mixed data or rounded readings).',
  8: 'Eight prints in a row, all beyond 1σ (either side): the process is jumping between two levels.',
}
// Reference guide: simple definition, why it matters, nominal value and the sources behind the default limits.
const GUIDE = [
  { key: 'tensile_strength_mpa', what: 'Peak stress the bracket carries before it breaks.', basis: 'Standard minimum is 895 [3]; 1000 is a stricter demo client requirement.', nominal: '≈1060', refs: '[3][4]' },
  { key: 'laser_power_w', what: 'Power of the laser that melts the powder.', basis: 'Range of studied Ti-6Al-4V builds [6]; ±5% band is a demo value.', nominal: '280', refs: '[6]' },
  { key: 'scan_speed_mm_s', what: 'How fast the laser moves across the powder bed.', basis: 'Near the 800 and 1200 mm/s studied in [6]; ±5% band is a demo value.', nominal: '1200', refs: '[6]' },
  { key: 'oxygen_ppm', what: 'Oxygen left in the build chamber.', basis: 'Titanium work targets 100 or less [5]; our 50 is a stricter demo value.', nominal: '30', refs: '[5]' },
  { key: 'porosity_pct', what: 'Share of the part volume that is empty void.', basis: 'Depends on power and speed [6]; the 0.20 limit is a demo value.', nominal: '0.10', refs: '[6]' },
  { key: 'build_orientation_deg', what: 'Angle of the part relative to the build plate.', basis: 'Demo value, fixed at 0 (shows "ok (constant)").', nominal: '0', refs: '' },
]
const UNIT = { tensile_strength_mpa: 'MPa', laser_power_w: 'W', scan_speed_mm_s: 'mm/s', oxygen_ppm: 'ppm', porosity_pct: '%', build_orientation_deg: 'deg' }
const LABEL = {
  tensile_strength_mpa: 'Tensile strength (MPa)', laser_power_w: 'Laser power (W)', scan_speed_mm_s: 'Scan speed (mm/s)', oxygen_ppm: 'Oxygen (ppm)',
  porosity_pct: 'Porosity (%)', build_orientation_deg: 'Build orientation (deg)',
}
const DEMO = {
  dataSet1: 'Demo 1: healthy process',
  dataSet2: 'Demo 2: oxygen drift',
  dataSet3: 'Demo 3: stable but too variable',
}
const REFS = [
  ['Nelson, L. S. (1984). The Shewhart control chart: tests for special causes. Journal of Quality Technology, 16(4), 237-239.', 'The eight special-cause tests.'],
  ['Montgomery, D. C. Introduction to Statistical Quality Control (Wiley). Individuals and moving-range charts (sigma = average moving range / 1.128), X-bar and R charts, Cp/Cpk/Pp/Ppk.', 'Control-chart and capability formulas.'],
  ['Total Materia. ASTM F2924, Ti-6Al-4V made by additive manufacturing: minimum ultimate tensile strength 895 MPa (Class C page). https://www.totalmateria.com/en-us/material/3300110', 'Standard minimum for comparison. Our 1000 MPa is a demonstration client requirement, not this standard.'],
  ['Instron. ASTM A370, Mechanical Testing of Steel Products. https://www.instron.com/en/testing-solutions/astm-standards/astm-a996/', 'A370 covers steel; ASTM E8/E8M is the general metal tension test.'],
  ['Chalmers University of Technology thesis on LPBF oxygen control. https://research.chalmers.se/publication/522522/file/522522_Fulltext.pdf', 'Oxygen level of 100 ppm or less recommended for titanium.'],
  ['du Plessis, A. (2019). Effect of process parameters on porosity in laser powder bed fusion Ti-6Al-4V. https://blogs.sun.ac.za/duplessis/files/2020/03/effect-of-process-parameters-on-porosity-du-Plessis-2019.pdf', 'Plausible laser power and scan speed ranges.'],
]
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

const initial = (d) => ({
  lsl: d.lsl, targetCpk: d.target_cpk, baseline: '', subgroupSize: d.subgroup_size, tests: d.tests,
  limits: Object.fromEntries(Object.entries(d.limits).map(([k, v]) => [k, { lower: v.lower ?? '', upper: v.upper ?? '' }])),
})

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
      setS(initial(d))
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
  const xbRows = xbar ? xbar.means.map((v, i) => ({ n: i + 1, m: v, sd: xbar.sds[i] })) : []
  const mrRows = res ? res.mr.values.map((v, i) => ({ n: i + 2, v })) : []

  return (
    <div className="shell">
    <header className="top">
      <div>
        <h1>AeroPrint QC</h1>
        <p className="tag">SPC and capability screening for 3D-printed titanium brackets</p>
        <p className="muted small prompt">An aerospace contractor 3D-printing titanium brackets is failing client strength tests, and does not track enough process parameters against final part strength. This tool monitors and flags <em>when</em> the process goes out of control and <em>whether</em> it can meet the strength requirement, and points to what to investigate.</p>
      </div>
      <ul className="can small">
        <li>Upload prints in production order, or try a built-in demo.</li>
        <li>See <strong>when</strong> the process shifted (X̄, S, I and MR charts, eight special-cause tests).</li>
        <li>See <strong>whether</strong> it is capable (Cpk, Ppk, Cp, Pp, histogram).</li>
        <li>Check every parameter against its tolerance, and find which one moves with strength.</li>
        <li>Get corrective investigations and download a per-print results file.</li>
      </ul>
    </header>
    <div className="app">
      <aside>

        <button className="reset" onClick={() => { setS(initial(defaults)); setSource({ dataset: 'dataSet2', file: null }) }}>Reset everything to the team defaults</button>
        <h3>1. Choose data</h3>
        <p className="muted small">Try a built-in demo, or upload your own file below.</p>
        <div className="seg">
          {datasets.map((d) => (
            <button key={d.name} className={!source.file && source.dataset === d.name ? 'on' : ''} title={d.description}
                    onClick={() => setSource({ dataset: d.name, file: null })}>{DEMO[d.name] || d.name}</button>
          ))}
        </div>
        <p className="muted small">{source.file ? `Uploaded: ${source.file.name}` : datasets.find((d) => d.name === source.dataset)?.description}</p>
        <label className="file">Upload your own data (CSV file)
          <input type="file" accept=".csv,.tsv,.txt,text/csv" onChange={(e) => e.target.files[0] && setSource({ dataset: null, file: e.target.files[0] })} />
        </label>
        <p className="muted small">Your file needs one row per print, in the order they were printed. Required column: <code>tensile_strength_mpa</code> (tensile strength in MPa). Optional columns, each in its own column: <code>laser_power_w</code> (laser power in W), <code>scan_speed_mm_s</code> (scan speed in mm/s), <code>oxygen_ppm</code> (oxygen in ppm), <code>porosity_pct</code> (porosity in %), <code>build_orientation_deg</code> (build orientation in degrees). Without the optional columns you still get the strength charts. Column names are matched loosely, so headers like <code>Tensile Strength (MPa)</code>, <code>UTS</code> or <code>O2</code> are found automatically, and a note under the banner tells you what was matched.</p>

        <h3>2. Set the requirement</h3>
        <p className="muted small">What the client demands of every part.</p>
        <label>Target for Cpk and Ppk (1.33: the nearer limit is at least 4σ away, a common minimum) [2]
          <input type="number" value={s.targetCpk} step="0.01" onChange={(e) => set('targetCpk', e.target.value)} /></label>

        <h3>3. Tolerances (editable)</h3>
        <p className="muted small">The allowed range for the strength and for each machine setting or measurement. Prints outside the range are flagged. The strength has a minimum only; stronger is never a problem.</p>
        <table className="limits">
          <thead><tr><th>Parameter</th><th>Lower</th><th>Upper</th></tr></thead>
          <tbody>
            <tr>
              <td>{LABEL.tensile_strength_mpa} [3][4]</td>
              <td><input type="number" value={s.lsl} step="10" onChange={(e) => set('lsl', e.target.value)} /></td>
              <td><input type="number" disabled placeholder="none" /></td>
            </tr>
            {Object.keys(s.limits).map((p) => (
              <tr key={p}>
                <td>{LABEL[p]}</td>
                <td><input type="number" value={s.limits[p].lower} onChange={(e) => setLimit(p, 'lower', e.target.value)} /></td>
                <td><input type="number" value={s.limits[p].upper} onChange={(e) => setLimit(p, 'upper', e.target.value)} /></td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="muted small">Lower = smallest allowed value, Upper = largest allowed value. Leave a box empty for no limit. </p>
        <p className="muted small"><strong>This table is interactive.</strong> Change any number and the results update within about a second. The guide below is fixed: it shows the reference values we start from and where they come from. Use Reset to return to them.</p>
        <details className="preset">
          <summary>Parameter guide and reference values</summary>
          <p className="small muted">LSL = lower limit, USL = upper limit. Values are in the unit shown with each parameter.</p>
          <table className="guide">
            <thead><tr><th>Parameter</th><th>Meaning</th><th>LSL</th><th>USL</th></tr></thead>
            <tbody>{GUIDE.map((g) => {
              const lim = g.key === 'tensile_strength_mpa' ? { lower: defaults.lsl, upper: null } : defaults.limits[g.key]
              const show = (v) => (v === null || v === undefined ? '–' : v)
              return (
                <tr key={g.key}>
                  <td><strong>{LABEL[g.key]}</strong></td>
                  <td>{g.what} {g.refs}<br /><span className="muted">{g.basis}</span></td>
                  <td>{show(lim.lower)}</td><td>{show(lim.upper)}</td>
                </tr>)
            })}</tbody>
          </table>
          <p className="small">The 1.33 target for Cpk and Ppk is a common textbook minimum [2]. None of these are aerospace qualification limits: replace them with your client's real values.</p>
        </details>

        <h3>4. Special-cause tests</h3>
        <p className="muted small">Rules that flag a print when the chart shows a pattern unlikely to be random noise (for example, a sudden jump or a slow drift) [1]. "Sigma" is the normal size of print-to-print variation.</p>
        {Object.entries(TESTS).map(([t, name]) => (
          <label key={t} className="check"><input type="checkbox" checked={s.tests.includes(Number(t))} onChange={() => toggleTest(Number(t))} /> {t}: {name}</label>
        ))}
        <details className="preset">
          <summary>Show what each rule looks like</summary>
          <p className="small">Each picture is a control chart: the blue line joins the prints, the dashed lines are the control limits, and the red dots are the prints that trigger the rule.</p>
          {Object.entries(TESTS).map(([t, name]) => (
            <div key={t} className="rule"><strong>Test {t}: {name}</strong><RuleDiagram rule={Number(t)} /><p className="small muted">{RULE_TEXT[t]}</p></div>
          ))}
        </details>
        <p className="muted small">Ticking more tests catches smaller shifts but also raises false alarms (a flag when nothing is wrong). On 60 prints of pure noise: test 1 alone about 22%, tests 1+2 about 30%, tests 1,2,5,6 about 45%, all eight about 60%.</p>

        <h3>5. Advanced (optional)</h3>
        <p className="muted small">The defaults are fine for most uses.</p>
        <label>Baseline prints: how many early prints define normal (0 = automatic)
          <input type="number" min="0" value={s.baseline} placeholder="auto" onChange={(e) => set('baseline', e.target.value)} /></label>
        <label>X-bar subgroup size: prints grouped per point on the X-bar and R charts
          <select value={s.subgroupSize} onChange={(e) => set('subgroupSize', e.target.value)}>
            {[2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => <option key={n}>{n}</option>)}</select></label>
      </aside>

      <main>
        {busy && <div className="busy">Analysing...</div>}
        {err && <p className="error" role="alert">Cannot analyse input: {err}</p>}
        {res && (<>
          <div className="steps">
            <div><strong>1 · Detect</strong><br />Watch the charts and the red banner. They tell you <em>when</em> the process went out of control.</div>
            <div><strong>2 · Diagnose</strong><br />Check the parameter table and corrective list. They point to <em>where</em> to look.</div>
            <div><strong>3 · Verify</strong><br />Fix that variable, upload the new prints, and confirm the charts recover.</div>
          </div>
          <div className={`banner ${status.tone}`} role="status">{status.text}</div>
          {res.warnings.map((w, i) => <p key={i} className="muted small">Note: {w}</p>)}

          <div className="cards">
            <Card label="Mean strength" value={`${f(res.mean, 1)} MPa`} sub={`σ̂ (overall) ${f(res.overall_sd, 1)} MPa, n = ${res.n}`} />
            <Card label="Cpk (short-term)" value={f(res.cpk)} sub={res.cpk === null ? 'undefined: no variation' : `95% CI ${f(res.cpk_ci[0])} to ${f(res.cpk_ci[1])}`} tone={res.cpk !== null && res.cpk >= res.target_cpk ? 'good' : 'bad'} />
            <Card label="Ppk (long-term)" value={f(res.ppk)} sub={`target ${f(res.target_cpk)}`} tone={res.ppk !== null && res.ppk >= res.target_cpk ? 'good' : 'bad'} />
            <Card label="Prints below requirement" value={`${res.below_count} / ${res.n}`} sub={`minimum ${res.lsl} MPa`} tone={res.below_count ? 'bad' : 'good'} />
            <Card label="Out-of-control prints" value={res.ooc_count} sub={res.first_signal_print ? `first at print ${res.first_signal_print}` : 'none flagged'} tone={res.ooc_count ? 'bad' : 'good'} />
          </div>

          <p className="muted small cpknote">Both use the same formula, (mean − minimum) ÷ (3 × σ̂). <strong>Cpk</strong> takes σ̂ from print-to-print differences (what the process can do when steady). <strong>Ppk</strong> takes σ̂ from all the data (what it actually did). A Ppk much lower than Cpk means the process drifted along the way.</p>

          <Section title="Control charts" hint={`We treat the first ${xbar.baseline_k * xbar.n} prints as the process at its normal (shaded green), draw the limits from them, then check whether later points stay inside. The X̄ chart watches the average; the S chart watches the spread.`}>
            <div className="grid2">
              <ControlChart title={`X̄ chart (average of each ${xbar.n} prints)`} note={`${xbar.subgroups} subgroups`} data={xbRows} y="m" xLabel="Subgroup" yLabel="X̄ (MPa)"
                            center={xbar.xbar_center} ucl={xbar.xbar_ucl} lcl={xbar.xbar_lcl} flagged={xbar.xbar_flagged} baselineEnd={xbar.baseline_k} />
              <ControlChart title={`S chart (spread of each ${xbar.n} prints)`} note="standard deviation" data={xbRows} y="sd" xLabel="Subgroup" yLabel="S (MPa)"
                            center={xbar.s_center} ucl={xbar.s_ucl} lcl={xbar.s_lcl} flagged={xbar.s_flagged} baselineEnd={xbar.baseline_k} />
              <Histogram values={res.x} lsl={res.lsl} />
            </div>
            
          </Section>

          <Section title="Print-by-print charts (I and MR)" hint="X̄ and S group prints, so a single bad print can hide inside its group. These two plot every print on its own: the I chart shows each print's strength, and the MR chart shows how much each print differs from the one before (moving range). The special-cause tests in the sidebar run on the I chart, and the same moving ranges give σ̂ for Cpk (σ̂ = average MR ÷ 1.128) [2].">
<div className="grid2">
                <ControlChart title="I chart (each print)" note="individual strength" data={iRows} y="v" xLabel="Print" yLabel="Strength (MPa)"
                              center={res.center} ucl={res.ucl} lcl={res.lcl} spec={res.lsl} flagged={res.flagged} baselineEnd={res.baseline} />
                <ControlChart title="MR chart (change from previous print)" note="moving range" data={mrRows} y="v" xLabel="Print" yLabel="MR (MPa)"
                              center={res.mr.center} ucl={res.mr.ucl} lcl={res.mr.lcl} flagged={res.mr.flagged} baselineEnd={res.mr.baseline + 1} />
              </div>
          </Section>

          <Section title="Process-parameter inspection" hint="Each print checked against the tolerances in the sidebar, plus capability for each parameter. Cp and Pp need both a lower and an upper limit. Status is judged on Ppk. n/a means it cannot be computed: Cp and Pp need two limits (tensile strength has only a minimum), and a parameter that never varies has no spread.">
            <div className="scroll"><table>
              <thead><tr><th>Parameter</th><th>Lower</th><th>Upper</th><th>Mean</th><th>% outside</th><th>Cp</th><th>Cpk</th><th>Pp</th><th>Ppk</th><th>First signal</th><th>Status</th></tr></thead>
              <tbody>
                <tr>
                  <td><strong>{LABEL.tensile_strength_mpa}</strong></td><td>{res.lsl}</td><td>no limit</td><td>{f(res.mean, 3)}</td>
                  <td>{f(res.below_pct, 1)}</td><td title="Needs both a lower and an upper limit">n/a</td><td>{f(res.cpk)}</td><td title="Needs both a lower and an upper limit">n/a</td><td>{f(res.ppk)}</td>
                  <td>{res.first_signal_print ? `print ${res.first_signal_print}` : '-'}</td>
                  <td><span className={`chip ${res.stable && res.capable ? 'good' : 'bad'}`}>{!res.stable ? 'out of control' : res.capable ? 'ok' : 'not capable'}</span></td>
                </tr>
                {res.parameters.map((p) => (
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

          <Section title="Process flow (reference)">
            <ProcessFlow lsl={defaults.lsl} />
          </Section>

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

          <Section title="References">
            <ol className="refs refs-main">{REFS.map(([t, n], i) => <li key={i} id={`ref${i + 1}`}>{t}<br /><em>{n}</em></li>)}</ol>
          </Section>
        </>)}
      </main>
    </div>
    </div>
  )
}
