import React from 'react'

// Reference picture of the build process. Chips marked with a dot are the columns this tool can check.
export default function ProcessFlow({ lsl }) {
  const steps = [
    { n: 1, title: 'Powder preparation', sub: 'Ti-6Al-4V powder', chips: [] },
    { n: 2, title: 'Build setup', sub: 'Part placed on the build plate', chips: [['Build orientation', '0', 'deg']] },
    { n: 3, title: 'Laser powder bed fusion', sub: 'These act together while printing', chips: [['Laser power', '280', 'W'], ['Scan speed', '1200', 'mm/s'], ['Oxygen', '30', 'ppm']], wide: true },
    { n: 4, title: 'Printed bracket', sub: 'Inspected for voids', chips: [['Porosity', '0.10', '%']] },
    { n: 5, title: 'Post-processing and test', sub: 'Same condition for every print', chips: [] },
    { n: 6, title: 'Result', sub: 'Compared with the minimum', chips: [['Tensile strength', '≈1060', 'MPa']], result: true, note: `LSL ${lsl} MPa` },
  ]
  return (
    <div className="flow" role="img" aria-label="Process flow from powder preparation to tensile strength">
      {steps.map((st, i) => (
        <React.Fragment key={st.n}>
          <div className={`step ${st.wide ? 'wide' : ''} ${st.result ? 'result' : ''}`}>
            <span className="badge">{st.n}</span>
            <strong>{st.title}</strong>
            <span className="sub">{st.sub}</span>
            {st.chips.length > 0 && (
              <div className="chips">
                {st.chips.map(([name, val, unit]) => (
                  <span className="pchip" key={name}><i />{name}<b>{val} {unit}</b></span>
                ))}
              </div>
            )}
            {st.note && <span className="lsl">{st.note}</span>}
          </div>
          {i < steps.length - 1 && <span className="arrow" aria-hidden="true">›</span>}
        </React.Fragment>
      ))}
      <p className="legend small muted"><i /> tracked by this tool. Nominal values are the demo starting values.</p>
    </div>
  )
}
