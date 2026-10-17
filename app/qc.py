"""AeroPrint QC - statistics core (plain functions, no web / plotting code).

One CSV row = one print, in production order.  Strength has only a minimum, so
strength capability is one-sided.  Charts: I-MR chart of individual prints and
an X-bar/R chart of consecutive subgroups.  Limits come from an in-control
baseline (first N prints), never from the whole series.
"""
import math
import numpy as np
import pandas as pd
from scipy import stats

STRENGTH = 'tensile_strength_mpa'
PARAMS = ['laser_power_w', 'scan_speed_mm_s', 'oxygen_ppm', 'porosity_pct', 'build_orientation_deg']
COLUMNS = PARAMS + [STRENGTH]
# Demonstration tolerances (lower, upper); None = no limit.  NOT aerospace qualification limits.
DEFAULT_LIMITS = {'laser_power_w': (266.0, 294.0), 'scan_speed_mm_s': (1140.0, 1260.0),
                  'oxygen_ppm': (0.0, 50.0), 'porosity_pct': (0.0, 0.20),
                  'build_orientation_deg': (0.0, 0.0)}
DEFAULT_TESTS = (1, 2)   # more tests = more false alarms on short series (see README table)
D2_MR = 1.128  # d2 for moving ranges of 2
# Shewhart constants by subgroup size n: (A2, D3, D4, d2)
XBAR_CONST = {2: (1.880, 0.0, 3.267, 1.128), 3: (1.023, 0.0, 2.574, 1.693), 4: (0.729, 0.0, 2.282, 2.059),
              5: (0.577, 0.0, 2.114, 2.326), 6: (0.483, 0.0, 2.004, 2.534), 7: (0.419, 0.076, 1.924, 2.704),
              8: (0.373, 0.136, 1.864, 2.847), 9: (0.337, 0.184, 1.816, 2.970), 10: (0.308, 0.223, 1.777, 3.078)}
MIN_PRINTS = 20


# ---------------------------------------------------------------- input
def validate(df):
    """Check and clean input. Only `tensile_strength_mpa` is required; the five process
    parameters are optional. Rows must be in production order. Returns a cleaned copy."""
    d = df.copy()
    d.columns = [str(c).strip() for c in d.columns]
    if STRENGTH not in d.columns:
        raise ValueError(f'Missing required column: {STRENGTH}')
    cols = [c for c in COLUMNS if c in d.columns]
    for c in cols:
        d[c] = pd.to_numeric(d[c], errors='coerce')
    if d[cols].isna().any().any():
        raise ValueError('Numeric columns contain missing or non-numeric values.')
    if len(d) < MIN_PRINTS:
        raise ValueError(f'Provide at least {MIN_PRINTS} prints (rows).')
    if (d[STRENGTH] <= 0).any():
        raise ValueError(f'{STRENGTH} must be positive.')
    if 'porosity_pct' in d.columns and ((d['porosity_pct'] < 0) | (d['porosity_pct'] > 100)).any():
        raise ValueError('porosity_pct must be between 0 and 100.')
    return d.reset_index(drop=True)


# ---------------------------------------------------------------- building blocks
def mr_sigma(x):
    """Within (short-term) sigma from the average moving range: mean|x[i]-x[i-1]| / 1.128."""
    x = np.asarray(x, dtype=float)
    if len(x) < 2:
        return float('nan')
    return float(np.abs(np.diff(x)).mean() / D2_MR)


def capability(mean, sigma, lo, hi):
    """(Cp, Cpk) for any mix of limits. Cp needs both limits; undefined (nan) if sigma <= 0."""
    if not np.isfinite(sigma) or sigma <= 0 or (lo is None and hi is None):
        return float('nan'), float('nan')
    cp = (hi - lo) / (6 * sigma) if (lo is not None and hi is not None) else float('nan')
    sides = []
    if lo is not None:
        sides.append(mean - lo)
    if hi is not None:
        sides.append(hi - mean)
    return cp, min(sides) / (3 * sigma)


def index_ci(index, n, conf=0.95):
    """Approximate CI for a capability index: index +/- z*sqrt(1/(9n) + index^2/(2(n-1)))."""
    if not np.isfinite(index) or n < 2:
        return float('nan'), float('nan')
    z = stats.norm.ppf(0.5 + conf / 2.0)
    se = math.sqrt(1.0 / (9.0 * n) + index ** 2 / (2.0 * (n - 1)))
    return index - z * se, index + z * se


def i_chart_limits(x, baseline_n):
    """I chart limits from the first `baseline_n` prints: centre = baseline mean, sigma = MRbar/1.128."""
    base = np.asarray(x[:baseline_n], dtype=float)
    if len(base) < 5:
        raise ValueError('Baseline needs at least 5 prints.')
    sigma = mr_sigma(base)
    c = float(base.mean())
    return {'center': c, 'sigma': sigma, 'ucl': c + 3 * sigma, 'lcl': c - 3 * sigma}


def nelson_tests(x, center, sigma, tests=DEFAULT_TESTS):
    """The eight Nelson special-cause tests. Returns {test: [0-based indices]}; the flagged
    point is the one that completes the pattern.
      1: one point beyond 3 sigma          2: 9 in a row on one side of the centre line
      3: 6 in a row steadily up or down    4: 14 in a row alternating up and down
      5: 2 of 3 beyond 2 sigma, same side  6: 4 of 5 beyond 1 sigma, same side
      7: 15 in a row within 1 sigma        8: 8 in a row beyond 1 sigma (either side)
    Constant data (sigma = 0) produces no flags."""
    m = np.asarray(x, dtype=float)
    out = {t: [] for t in tests}
    if not np.isfinite(sigma) or sigma <= 0:
        return out
    z = (m - center) / sigma
    d = np.diff(m)
    for i in range(len(m)):
        if 1 in out and abs(z[i]) > 3:
            out[1].append(i)
        if 2 in out and i >= 8 and ((z[i - 8:i + 1] > 0).all() or (z[i - 8:i + 1] < 0).all()):
            out[2].append(i)
        if 3 in out and i >= 5 and ((d[i - 5:i] > 0).all() or (d[i - 5:i] < 0).all()):
            out[3].append(i)
        if 4 in out and i >= 13:
            w = np.sign(d[i - 13:i])
            if (w[1:] * w[:-1] < 0).all():
                out[4].append(i)
        if 5 in out and i >= 2:
            w = z[i - 2:i + 1]
            if (z[i] > 2 and (w > 2).sum() >= 2) or (z[i] < -2 and (w < -2).sum() >= 2):
                out[5].append(i)
        if 6 in out and i >= 4:
            w = z[i - 4:i + 1]
            if (z[i] > 1 and (w > 1).sum() >= 4) or (z[i] < -1 and (w < -1).sum() >= 4):
                out[6].append(i)
        if 7 in out and i >= 14 and (np.abs(z[i - 14:i + 1]) < 1).all():
            out[7].append(i)
        if 8 in out and i >= 7 and (np.abs(z[i - 7:i + 1]) > 1).all():
            out[8].append(i)
    return out


def xbar_r(x, n=5, baseline_k=None):
    """X-bar and R chart of consecutive subgroups of size n (trailing partial subgroup dropped).
    Limits from the first `baseline_k` subgroups: Xbar-bar +/- A2*Rbar, R: D3*Rbar, D4*Rbar."""
    if n not in XBAR_CONST:
        raise ValueError('subgroup_size must be an integer from 2 to 10.')
    x = np.asarray(x, dtype=float)
    m = len(x) // n
    if m < 4:
        raise ValueError(f'Need at least 4 subgroups of {n} prints for an X-bar/R chart.')
    g = x[:m * n].reshape(m, n)
    means, ranges = g.mean(axis=1), g.max(axis=1) - g.min(axis=1)
    k = baseline_k or max(4, m // 2)
    k = int(min(max(k, 4), m))
    a2, d3, d4, d2 = XBAR_CONST[n]
    xbb, rbar = float(means[:k].mean()), float(ranges[:k].mean())
    lim = {'xbar_center': xbb, 'xbar_ucl': xbb + a2 * rbar, 'xbar_lcl': xbb - a2 * rbar,
           'r_center': rbar, 'r_ucl': d4 * rbar, 'r_lcl': d3 * rbar}
    return {'n': n, 'subgroups': m, 'baseline_k': k, 'means': means, 'ranges': ranges, **lim,
            'sigma_within': rbar / d2,
            'xbar_flagged': [int(i) for i in np.where((means > lim['xbar_ucl']) | (means < lim['xbar_lcl']))[0]],
            'r_flagged': [int(i) for i in np.where((ranges > lim['r_ucl']) | (ranges < lim['r_lcl']))[0]]}


def rolling_capability(x, lsl, window=20, conf=0.95):
    """One-sided Cpk over a rolling window of prints. `print_number` is 1-based (window end)."""
    x = np.asarray(x, dtype=float)
    rows = []
    for e in range(window - 1, len(x)):
        seg = x[e - window + 1:e + 1]
        k = capability(float(seg.mean()), mr_sigma(seg), lsl, None)[1]
        lo, hi = index_ci(k, len(seg), conf)
        rows.append({'print_number': e + 1, 'mean': float(seg.mean()), 'cpk': k, 'ci_low': lo, 'ci_high': hi})
    return pd.DataFrame(rows, columns=['print_number', 'mean', 'cpk', 'ci_low', 'ci_high'])


def _first_signal(x, baseline_n, tests=DEFAULT_TESTS):
    lim = i_chart_limits(x, baseline_n)
    fired = nelson_tests(x, lim['center'], lim['sigma'], tests)
    idx = sorted({i for v in fired.values() for i in v})
    return (idx[0] + 1) if idx else None


# ---------------------------------------------------------------- parameters
def parameter_inspection(d, limits=None, target=1.33, baseline_n=None):
    """Pass/fail and capability for each process parameter present in `d` that has a limit.
    Cp/Cpk use within sigma (MRbar/1.128); Pp/Ppk use overall SD; status is judged on Ppk.
    A constant parameter inside its limits is reported 'ok (constant)'."""
    limits = DEFAULT_LIMITS if limits is None else limits
    rows = []
    for col, (lo, hi) in limits.items():
        if col not in d.columns or (lo is None and hi is None):
            continue
        x = d[col].to_numpy(float)
        within, overall, mean = mr_sigma(x), float(np.std(x, ddof=1)), float(x.mean())
        cp, cpk = capability(mean, within, lo, hi)
        pp, ppk = capability(mean, overall, lo, hi)
        bad = np.zeros(len(x), bool)
        if lo is not None:
            bad |= x < lo
        if hi is not None:
            bad |= x > hi
        if overall == 0:
            status = 'out of limits (constant)' if bad.any() else 'ok (constant)'
        elif ppk >= target:
            status = 'ok'
        elif np.isfinite(pp):
            status = 'off-center' if pp >= target else 'too much spread'
        else:
            status = 'too close to limit'
        sig = _first_signal(x, baseline_n) if baseline_n and overall > 0 else None
        rows.append({'parameter': col, 'lsl': lo, 'usl': hi, 'mean': mean, 'within_sd': within, 'overall_sd': overall,
                     'cp': cp, 'cpk': cpk, 'pp': pp, 'ppk': ppk, 'pct_out_of_spec': 100.0 * float(bad.mean()),
                     'status': status, 'first_signal_print': sig})
    return pd.DataFrame(rows, columns=['parameter', 'lsl', 'usl', 'mean', 'within_sd', 'overall_sd', 'cp', 'cpk',
                                       'pp', 'ppk', 'pct_out_of_spec', 'status', 'first_signal_print'])


# ---------------------------------------------------------------- main entry
def analyze(df, lsl=1000.0, target_cpk=1.33, baseline=None, subgroup_size=5, window=20,
            tests=DEFAULT_TESTS, limits=None):
    """Full analysis of a print-by-print dataset. Returns a dict (keys documented in README).
    lsl: minimum required tensile strength (MPa). target_cpk: minimum required capability.
    baseline: number of leading prints assumed in control (default: half the prints, at least 20).
    limits: {parameter: (lower, upper)} tolerances; None uses DEFAULT_LIMITS."""
    d = validate(df)
    if lsl <= 0 or target_cpk <= 0:
        raise ValueError('Minimum strength and target Cpk must be positive.')
    x = d[STRENGTH].to_numpy(float)
    n = len(x)
    b = int(baseline) if baseline else min(max(MIN_PRINTS, n // 2), n)
    if not 5 <= b <= n:
        raise ValueError(f'baseline must be between 5 and {n}.')
    window = int(min(max(window, 5), n))
    tests = tuple(sorted(set(int(t) for t in tests)))
    if not tests or not set(tests) <= set(range(1, 9)):
        raise ValueError('tests must be a non-empty subset of 1-8.')

    mean, overall_sd, within_sd = float(x.mean()), float(np.std(x, ddof=1)), mr_sigma(x)
    cpk = capability(mean, within_sd, lsl, None)[1]
    ppk = capability(mean, overall_sd, lsl, None)[1]
    lim = i_chart_limits(x, b)
    fired = nelson_tests(x, lim['center'], lim['sigma'], tests)
    flagged = sorted({i for v in fired.values() for i in v})
    by_print = {i: [t for t in tests if i in fired[t]] for i in flagged}
    roll = rolling_capability(x, lsl, window)
    below = roll[roll['cpk'] < target_cpk]
    xb = xbar_r(x, int(subgroup_size))
    par = parameter_inspection(d, limits, target_cpk, b)

    assoc = []
    for c in PARAMS:
        if c in d.columns and d[c].nunique() > 1:
            r, p = stats.pearsonr(d[c], x)
            assoc.append({'parameter': c, 'r': float(r), 'p_value': float(p)})
    assoc.sort(key=lambda z: abs(z['r']), reverse=True)

    stable = not flagged
    capable = bool(np.isfinite(cpk) and np.isfinite(ppk) and cpk >= target_cpk and ppk >= target_cpk)
    warns = []
    if not stable:
        warns.append('Process is not in statistical control: capability indices are not predictive until special causes are removed.')
    if not np.isfinite(cpk):
        warns.append('Capability undefined: strength has no variation.')
    if b < 20:
        warns.append('Baseline has fewer than 20 prints: control limits are rough.')
    res = {
        'n': n, 'mean': mean, 'within_sd': within_sd, 'overall_sd': overall_sd, 'cpk': cpk, 'ppk': ppk,
        'cpk_ci': index_ci(cpk, n), 'ppk_ci': index_ci(ppk, n), 'lsl': lsl, 'target_cpk': target_cpk,
        'below_count': int((x < lsl).sum()), 'below_pct': 100.0 * float((x < lsl).mean()),
        'ooc_count': len(flagged), 'x': x, 'baseline': b, **lim,
        'tests': fired, 'tests_used': tests, 'tests_by_print': by_print, 'flagged': flagged,
        'first_signal_print': (flagged[0] + 1) if flagged else None,
        'rolling': roll, 'window': window,
        'first_below_target_print': int(below['print_number'].iloc[0]) if len(below) else None,
        'xbar': xb, 'parameters': par, 'associations': assoc,
        'stable': stable, 'capable': capable, 'warnings': warns,
    }
    res['actions'] = corrective_actions(res)
    return res


def corrective_actions(r):
    """Conservative, rule-based investigation suggestions. They point where to look; they do not prove cause."""
    acts, par = [], r['parameters']
    if not r['stable']:
        first = r['first_signal_print']
        acts.append(f"Special cause suspected from print {first}: trace and review prints from {first} onward "
                    f"(powder lot, calibration, maintenance, operator and machine logs) before trusting capability numbers.")
        early = par[par['first_signal_print'].notna() & (par['first_signal_print'] <= first + 5)]
        for _, row in early.iterrows():
            acts.append(f"{row['parameter']} also signalled at print {int(row['first_signal_print'])}: "
                        f"check its sensor, setpoint and drift around that print.")
        if r['associations']:
            a = r['associations'][0]
            acts.append(f"Strongest screening lead: {a['parameter']} (r = {a['r']:.2f} with strength). "
                        f"Confirm with a controlled experiment before changing qualified settings.")
    elif not r['capable']:
        acts.append('Process is stable but not capable: a common-cause problem. Reduce overall variation and/or re-center '
                    'the mean; searching for a single special cause will not fix it.')
    if r['below_count']:
        acts.append(f"{r['below_count']} print(s) below the {r['lsl']:g} MPa minimum: quarantine and review per local procedure.")
    for _, row in par[par['status'].isin(['off-center', 'too much spread', 'too close to limit', 'out of limits (constant)'])].iterrows():
        acts.append(f"{row['parameter']}: {row['status']} ({row['pct_out_of_spec']:.0f}% of prints outside {_fmt_lim(row)}): "
                    f"check setpoint, calibration and drift.")
    acts.append('Always: confirm the tensile test method (ASTM A370) and the approved specification, material/process '
                'qualification and engineering sign-off. Correlation is not causation.')
    return acts


def _fmt_lim(row):
    lo = '-inf' if row['lsl'] is None or pd.isna(row['lsl']) else f"{row['lsl']:g}"
    hi = 'inf' if row['usl'] is None or pd.isna(row['usl']) else f"{row['usl']:g}"
    return f'[{lo}, {hi}]'


def flag_prints(d, r, limits=None):
    """Per-print inspection table (for CSV export): pass/fail against every limit plus SPC flags."""
    limits = DEFAULT_LIMITS if limits is None else limits
    out = d.copy()
    out.insert(0, 'print_number', np.arange(1, len(out) + 1))
    out['below_min_strength'] = out[STRENGTH] < r['lsl']
    out['out_of_control'] = out['print_number'].isin([i + 1 for i in r['flagged']])
    out['tests_triggered'] = [','.join(str(t) for t in r['tests_by_print'].get(i, [])) for i in range(len(out))]
    anyspec = np.zeros(len(out), bool)
    for col, (lo, hi) in limits.items():
        if col in out.columns and not (lo is None and hi is None):
            ok = np.ones(len(out), bool)
            if lo is not None:
                ok &= out[col].to_numpy(float) >= lo
            if hi is not None:
                ok &= out[col].to_numpy(float) <= hi
            out[f'{col}_in_spec'] = ok
            anyspec |= ~ok
    out['flag'] = np.select([out['below_min_strength'], out['out_of_control'], anyspec],
                            ['BELOW_MINIMUM', 'OUT_OF_CONTROL', 'PARAM_OUT_OF_SPEC'], 'OK')
    return out
