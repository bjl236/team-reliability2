"""Generate the three synthetic demo datasets with the normal distribution (the Python
equivalent of R's rnorm). Fixed seeds -> identical files every run.
One row = one print, in production order. Writes to data/ and app/sample_data/ (the app folder is
what gets deployed, so it needs its own copy).
Nominal values (team spec, simulated LPBF titanium): laser 280 W, scan 1200 mm/s, oxygen 30 ppm,
porosity 0.10 %, orientation 0 deg, tensile strength about 1060 MPa. NOT certified aerospace limits."""
from pathlib import Path
import numpy as np
import pandas as pd

ROOT = Path(__file__).parent
OUTS = [ROOT / 'data', ROOT / 'app' / 'sample_data']
COLUMNS = ['laser_power_w', 'scan_speed_mm_s', 'oxygen_ppm', 'porosity_pct', 'build_orientation_deg', 'tensile_strength_mpa']


def make(name, seed, scenario, n=60):
    rng = np.random.default_rng(seed)
    k = 2.0 if scenario == 'variable' else 1.0            # spread multiplier for the process parameters
    ox_sd = 3.5 * k * (1.6 if scenario == 'variable' else 1.0)
    base = 1045.0 if scenario == 'variable' else 1060.0
    noise = {'capable': 7.0, 'drift': 7.0, 'variable': 20.0}[scenario]
    rows = []
    for i in range(1, n + 1):
        power = rng.normal(280, 3 * k)
        speed = rng.normal(1200, 12 * k)
        oxygen = max(0.5, rng.normal(30, ox_sd))
        if scenario == 'drift' and i > 30:                # planted special cause from print 31
            oxygen += 45
        porosity = max(0.0, rng.normal(0.10, 0.018 * k))
        strength = (base + 0.25 * (power - 280) - 0.02 * (speed - 1200) - 1.1 * (oxygen - 30)
                    - 120 * (porosity - 0.10) + rng.normal(0, noise))
        rows.append([round(power, 1), round(speed, 1), round(oxygen, 1), round(porosity, 3), 0, round(strength, 1)])
    df = pd.DataFrame(rows, columns=COLUMNS)
    for out in OUTS:
        out.mkdir(parents=True, exist_ok=True)
        df.to_csv(out / f'{name}.csv', index=False)
    print(name, len(df), 'mean %.1f sd %.1f' % (df.tensile_strength_mpa.mean(), df.tensile_strength_mpa.std()))


SEEDS = {'dataSet1': 3, 'dataSet2': 6, 'dataSet3': 4}

if __name__ == '__main__':
    make('dataSet1', SEEDS['dataSet1'], 'capable')
    make('dataSet2', SEEDS['dataSet2'], 'drift')
    make('dataSet3', SEEDS['dataSet3'], 'variable')
