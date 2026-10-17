import numpy as np
import pandas as pd
from scipy import stats

REQUIRED = ['build_id','sample_id','strength_mpa','oxygen_ppm','humidity_pct','chamber_temp_c','laser_power_w','scan_speed_mm_s','stress_mpa']

def validate(df):
    missing = [c for c in REQUIRED if c not in df]
    if missing:
        raise ValueError('Missing columns: ' + ', '.join(missing))
    d = df.copy()
    for c in REQUIRED[2:]:
        d[c] = pd.to_numeric(d[c], errors='coerce')
    if d[REQUIRED[2:]].isna().any().any():
        raise ValueError('Numeric measurements contain missing or invalid values.')
    if len(d) < 10 or d['build_id'].nunique() < 3:
        raise ValueError('Provide at least 10 specimens from at least 3 builds.')
    if (d['strength_mpa'] <= 0).any() or (d['stress_mpa'] < 0).any():
        raise ValueError('Strength must be positive and stress nonnegative.')
    return d

def analyze(df, lsl=900, target_cpk=1.33):
    d = validate(df)
    if lsl <= 0 or target_cpk <= 0:
        raise ValueError('Limits and target must be positive.')
    x = d['strength_mpa'].to_numpy(dtype=float)
    overall_sd = np.std(x, ddof=1)
    groups = d.groupby('build_id', sort=False)['strength_mpa']
    # Pooled within-build SD: only builds with at least two specimens contribute.
    num = sum((len(g)-1)*np.var(g, ddof=1) for _, g in groups if len(g)>1)
    den = sum(len(g)-1 for _, g in groups if len(g)>1)
    within_sd = np.sqrt(num/den) if den > 0 else np.nan
    mean = x.mean()
    cpk = (mean-lsl)/(3*within_sd) if within_sd > 0 else np.nan
    ppk = (mean-lsl)/(3*overall_sd) if overall_sd > 0 else np.nan
    # One-sided lower specification: no Cp/Pp or upper-tail capability.
    # I-MR chart on chronologically ordered build averages, not individual specimens.
    bm = groups.mean().to_numpy()
    mr = np.abs(np.diff(bm))
    sigma_mr = mr.mean()/1.128 if len(mr) else np.nan
    center = bm.mean()
    ucl = center + 3*sigma_mr
    lcl = center - 3*sigma_mr
    ooc = (bm < lcl) | (bm > ucl)
    associations = []
    for col in REQUIRED[3:]:
        if d[col].nunique() > 1:
            r, p = stats.pearsonr(d[col], d['strength_mpa'])
            associations.append({'parameter':col, 'r':float(r),'p_value':float(p)})
    associations = sorted(associations, key=lambda z:abs(z['r']), reverse=True)
    failures = int((x < lsl).sum())
    stable = not ooc.any()
    capable = bool(np.isfinite(cpk) and cpk >= target_cpk and np.isfinite(ppk) and ppk >= target_cpk)
    return {'mean':mean,'within_sd':within_sd,'overall_sd':overall_sd,'cpk':cpk,'ppk':ppk,'failure_count':failures,'failure_pct':100*failures/len(x),'n':len(x),'builds':len(bm),'build_means':bm,'center':center,'ucl':ucl,'lcl':lcl,'ooc':ooc,'stable':stable,'capable':capable,'associations':associations}
