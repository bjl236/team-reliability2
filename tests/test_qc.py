"""Known-answer, degenerate-case and planted-signal tests for app/qc.py."""
import math
import sys
from pathlib import Path
import numpy as np
import pandas as pd
import pytest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'app'))
import qc  # noqa: E402

S = qc.STRENGTH


def load(name):
    return pd.read_csv(ROOT / 'data' / f'{name}.csv')


def series(vals):
    return pd.DataFrame({S: np.asarray(vals, dtype=float)})


def noisy(mean, n, sd=4.0, seed=0):
    return np.random.default_rng(seed).normal(mean, sd, n)


# ---- known answers (hand calculation / textbook constants) --------------
def test_mr_sigma_by_hand():
    # x = 10,12,11,13,12 -> MR = 2,1,2,1 -> MRbar 1.5 -> sigma 1.5/1.128
    assert qc.mr_sigma([10, 12, 11, 13, 12]) == pytest.approx(1.5 / 1.128)


def test_i_chart_limits_by_hand():
    lim = qc.i_chart_limits([10, 12, 11, 13, 12], 5)
    s = 1.5 / 1.128
    assert lim['center'] == pytest.approx(11.6)
    assert lim['ucl'] == pytest.approx(11.6 + 3 * s) and lim['lcl'] == pytest.approx(11.6 - 3 * s)


def test_one_sided_cpk_by_hand():
    cp, cpk = qc.capability(mean=1060, sigma=20, lo=1000, hi=None)   # (1060-1000)/(3*20)
    assert np.isnan(cp) and cpk == pytest.approx(1.0)


def test_two_sided_cp_cpk_by_hand():
    cp, cpk = qc.capability(275.0, 2.0, 266.0, 294.0)
    assert cp == pytest.approx(28 / 12) and cpk == pytest.approx(9 / 6)


def test_xbar_r_textbook_constants():
    # 4 subgroups of 5, each with range 2 and means 10,12,11,13. Rbar=2, Xbb=11.5, A2=0.577, D4=2.114
    x = []
    for m in (10, 12, 11, 13):
        x += [m - 1, m - 0.5, m, m + 0.5, m + 1]
    r = qc.xbar_r(x, n=5, baseline_k=4)
    assert r['xbar_center'] == pytest.approx(11.5)
    assert r['r_center'] == pytest.approx(2.0)
    assert r['xbar_ucl'] == pytest.approx(11.5 + 0.577 * 2) and r['xbar_lcl'] == pytest.approx(11.5 - 0.577 * 2)
    assert r['r_ucl'] == pytest.approx(2.114 * 2) and r['r_lcl'] == 0.0
    assert r['sigma_within'] == pytest.approx(2 / 2.326)


def test_index_ci_is_ordered_around_estimate():
    lo, hi = qc.index_ci(1.5, 100)
    assert lo < 1.5 < hi


# ---- degenerate cases -----------------------------------------------------
def test_constant_strength_gives_undefined_capability_and_no_signals():
    r = qc.analyze(series([1050.0] * 40))
    assert math.isnan(r['cpk']) and math.isnan(r['ppk'])
    assert r['flagged'] == [] and r['stable'] and not r['capable'] and r['below_count'] == 0


def test_too_few_prints_rejected():
    with pytest.raises(ValueError):
        qc.validate(series([1050.0] * 10))


def test_missing_strength_and_non_numeric_rejected():
    with pytest.raises(ValueError):
        qc.validate(load('dataSet1').drop(columns=[S]))
    bad = load('dataSet1'); bad[S] = bad[S].astype(object); bad.loc[0, S] = 'abc'
    with pytest.raises(ValueError):
        qc.validate(bad)


def test_only_strength_column_is_needed():
    r = qc.analyze(load('dataSet1')[[S]])
    assert r['parameters'].empty and r['associations'] == [] and r['n'] == 60


def test_constant_parameter_inside_limits_is_ok_constant():
    p = qc.analyze(load('dataSet1'))['parameters'].set_index('parameter')
    assert p.loc['build_orientation_deg', 'status'] == 'ok (constant)'
    assert math.isnan(p.loc['build_orientation_deg', 'cpk'])


def test_constant_parameter_outside_limits_is_flagged():
    d = load('dataSet1'); d['build_orientation_deg'] = 5.0
    p = qc.analyze(d)['parameters'].set_index('parameter')
    assert p.loc['build_orientation_deg', 'status'] == 'out of limits (constant)'
    assert p.loc['build_orientation_deg', 'pct_out_of_spec'] == 100.0


# ---- planted signals -----------------------------------------------------
def test_planted_shift_flagged_where_planted():
    x = np.concatenate([noisy(1060, 30, seed=11), noisy(1000, 20, seed=2)])
    r = qc.analyze(series(x), baseline=30)
    assert r['first_signal_print'] == 31


def test_no_false_alarm_on_stable_process_with_defaults():
    r = qc.analyze(series(noisy(1060, 60, seed=5)))
    assert r['stable']


def test_documented_false_alarm_rate_of_default_tests():
    """README quotes ~20-35% per 60-print series for tests 1+2 on pure noise (limits from a 30-print baseline)."""
    hits = 0
    for s in range(300):
        r = qc.analyze(series(np.random.default_rng(5000 + s).normal(1060, 8, 60)))
        hits += not r['stable']
    assert 0.20 <= hits / 300 <= 0.40


def test_baseline_limits_do_not_hide_start_of_shift():
    r = qc.analyze(load('dataSet2'))
    assert r['first_signal_print'] == 31 and min(r['flagged']) == 30


# ---- the eight Nelson tests, each with a planted pattern --------------------
def fire(x, t, c=0.0, s=1.0):
    return qc.nelson_tests(x, c, s, tests=(t,))[t]


def test_nelson_1():
    assert fire([0, 0, 3.5, 0], 1) == [2]


def test_nelson_2():
    assert fire([0.5] * 9, 2) == [8] and fire([0.5] * 8, 2) == []


def test_nelson_3():
    assert fire([1, 2, 3, 4, 5, 6], 3) == [5] and fire([1, 2, 3, 4, 5, 4], 3) == []


def test_nelson_4():
    z = [(-1) ** i for i in range(14)]
    assert fire(z, 4) == [13] and fire(z[:13], 4) == []


def test_nelson_5():
    assert fire([2.5, 0, 2.5], 5) == [2] and fire([2.5, 0, -2.5], 5) == []


def test_nelson_6():
    assert fire([1.5, 1.5, 0, 1.5, 1.5], 6) == [4] and fire([1.5, 1.5, 0, 0, 1.5], 6) == []


def test_nelson_7():
    assert fire([0.2] * 15, 7) == [14]


def test_nelson_8():
    assert fire([1.5, -1.5] * 4, 8) == [7]


def test_nelson_constant_data_no_flags():
    assert fire([5.0] * 20, 1, c=5.0, s=0.0) == []


def test_invalid_test_selection_rejected():
    with pytest.raises(ValueError):
        qc.analyze(load('dataSet1'), tests=(9,))
    assert qc.analyze(load('dataSet2'), tests=range(1, 9))['tests_used'] == tuple(range(1, 9))


# ---- the three demo datasets behave as documented ---------------------------
def test_dataset1_is_stable_and_capable():
    r = qc.analyze(load('dataSet1'))
    assert r['stable'] and r['capable'] and r['below_count'] == 0 and r['ooc_count'] == 0
    assert (r['parameters']['status'].isin(['ok', 'ok (constant)'])).all()


def test_dataset2_oxygen_drift():
    r = qc.analyze(load('dataSet2'))
    p = r['parameters'].set_index('parameter')
    assert not r['stable'] and not r['capable'] and r['below_count'] >= 2 and r['ooc_count'] > 20
    assert p.loc['oxygen_ppm', 'first_signal_print'] == 31 and p.loc['oxygen_ppm', 'status'] != 'ok'
    assert r['associations'][0]['parameter'] == 'oxygen_ppm'
    assert any('oxygen_ppm also signalled at print 31' in a for a in r['actions'])


def test_dataset3_stable_but_not_capable():
    r = qc.analyze(load('dataSet3'))
    assert r['stable'] and not r['capable'] and r['cpk'] < 1.33


def test_xbar_chart_flags_drift_subgroups():
    xb = qc.analyze(load('dataSet2'))['xbar']
    assert min(xb['xbar_flagged']) >= 5          # subgroup 7 begins at print 31; none flagged earlier than 6th
    assert len(xb['xbar_flagged']) >= 3


# ---- rolling capability / parameters / export -------------------------------
def test_rolling_capability_window_and_first_below():
    r = qc.analyze(load('dataSet2'), window=20)
    assert r['rolling']['print_number'].iloc[0] == 20 and len(r['rolling']) == 41
    assert r['first_below_target_print'] is not None and r['first_below_target_print'] > 30


def test_parameter_limits_editable_and_optional():
    r = qc.analyze(load('dataSet1'), limits={'laser_power_w': (279.0, 281.0)})
    assert list(r['parameters']['parameter']) == ['laser_power_w']
    assert r['parameters'].iloc[0]['pct_out_of_spec'] > 20


def test_one_sided_parameter_has_no_cp():
    p = qc.analyze(load('dataSet1'), limits={'oxygen_ppm': (None, 50.0)})['parameters'].iloc[0]
    assert math.isnan(p['cp']) and np.isfinite(p['cpk'])


def test_flag_prints_marks_ooc_and_below_minimum():
    d = qc.validate(load('dataSet2'))
    r = qc.analyze(d)
    f = qc.flag_prints(d, r)
    assert len(f) == 60 and (f.loc[f['print_number'] <= 30, 'out_of_control'] == False).all()  # noqa: E712
    assert f.loc[f['print_number'] == 31, 'out_of_control'].item()
    assert (f.loc[f['below_min_strength'], 'flag'] == 'BELOW_MINIMUM').all()
    assert 'oxygen_ppm_in_spec' in f.columns and (~f['oxygen_ppm_in_spec']).any()


def test_sample_data_copy_matches_data_folder():
    for n in ('dataSet1', 'dataSet2', 'dataSet3'):
        a = (ROOT / 'data' / f'{n}.csv').read_text()
        b = (ROOT / 'app' / 'sample_data' / f'{n}.csv').read_text()
        assert a == b
