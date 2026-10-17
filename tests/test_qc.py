from pathlib import Path
import sys
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
import pandas as pd
import pytest
from qc import analyze,validate
ROOT = Path(__file__).resolve().parents[1]
@pytest.mark.parametrize('name',['stable_capable','oxygen_drift','high_variation'])
def test_datasets(name):
    d = pd.read_csv(ROOT/'data'/f'{name}.csv')
    result = analyze(d)
    assert result['n']==120
    assert result['builds']==24
    assert result['overall_sd']>0
    assert result['within_sd']>0

def test_missing_column():
    d=pd.read_csv(ROOT/'data'/'stable_capable.csv').drop(columns=['strength_mpa'])
    with pytest.raises(ValueError):validate(d)

def test_drift_alert():
    d=pd.read_csv(ROOT/'data'/'oxygen_drift.csv')
    r=analyze(d)
    assert r['failure_count']>=0
    assert not r['capable'] or not r['stable']
