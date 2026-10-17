from pathlib import Path
import numpy as np
import pandas as pd

OUT = Path(__file__).parent/'data'
OUT.mkdir(exist_ok=True)

def make(name, seed, scenario):
    rng = np.random.default_rng(seed)
    rows = []
    for b in range(1, 25):
        oxygen = rng.normal(75, 12)
        humidity = rng.normal(30, 5)
        chamber = rng.normal(38, 2)
        power = rng.normal(285, 5)
        speed = rng.normal(1100, 35)
        stress = rng.normal(450, 20)
        shift = 0
        if scenario == 'drift' and b >= 14:
            oxygen += 115
            shift = -38
        if scenario == 'variable':
            oxygen += rng.normal(50, 38)
        for s in range(1, 6):
            o = max(5, oxygen+rng.normal(0, 7))
            h = max(1, humidity+rng.normal(0, 2))
            t = chamber+rng.normal(0, 0.8)
            p = power+rng.normal(0, 2)
            v = speed+rng.normal(0, 12)
            st = max(0, stress+rng.normal(0, 8))
            base = 1010 if scenario=='capable' else 956
            noise = 11 if scenario=='capable' else (24 if scenario=='variable' else 12)
            strength = base - 0.31*(o-75) - 0.25*(h-30) + 0.35*(p-285) - 0.018*(v-1100) - 0.055*(st-450) + shift + rng.normal(0,noise)
            rows.append([f'B{b:03d}',f'B{b:03d}-S{s}',round(strength,2),round(o,1),round(h,1),round(t,1),round(p,1),round(v,1),round(st,1)])
    df = pd.DataFrame(rows,columns=['build_id','sample_id','strength_mpa','oxygen_ppm','humidity_pct','chamber_temp_c','laser_power_w','scan_speed_mm_s','stress_mpa'])
    df.to_csv(OUT/f'{name}.csv',index=False)
    print(name, len(df))

make('stable_capable',42,'capable')
make('oxygen_drift',43,'drift')
make('high_variation',44,'variable')
