import json
import sys
from pathlib import Path
import pytest
from fastapi.testclient import TestClient

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'app'))
import app as service  # noqa: E402
import pandas as pd  # noqa: E402
import qc  # noqa: E402

client = TestClient(service.app)


def test_health():
    assert client.get('/health').json() == {'status': 'ok'}


def test_defaults_and_datasets():
    d = client.get('/api/defaults').json()
    assert d['limits']['oxygen_ppm'] == {'lower': 0.0, 'upper': 50.0} and d['tests'] == [1, 2]
    assert [x['name'] for x in client.get('/api/datasets').json()] == ['dataSet1', 'dataSet2', 'dataSet3']
    assert client.get('/api/datasets/dataSet1').text.startswith('laser_power_w')
    assert client.get('/api/datasets/nope').status_code == 404


def test_analyze_bundled_dataset_matches_core_function():
    body = client.post('/api/analyze', data={'dataset': 'dataSet2'}).json()
    exp = qc.analyze(pd.read_csv(ROOT / 'data' / 'dataSet2.csv'))
    assert body['cpk'] == pytest.approx(exp['cpk']) and body['ppk'] == pytest.approx(exp['ppk'])
    assert body['first_signal_print'] == 31 and body['ooc_count'] == exp['ooc_count']
    assert len(body['table']) == 60 and body['table'][30]['out_of_control'] is True


def test_analyze_upload_and_options():
    with open(ROOT / 'data' / 'dataSet2.csv', 'rb') as f:
        body = client.post('/api/analyze', files={'file': ('d.csv', f, 'text/csv')},
                           data={'lsl': 1020, 'tests': '1,2,3,4,5,6,7,8', 'subgroup_size': 4,
                                 'limits': json.dumps({'oxygen_ppm': {'lower': None, 'upper': 40}})}).json()
    assert body['tests_used'] == list(range(1, 9)) and body['xbar']['n'] == 4
    assert [p['parameter'] for p in body['parameters']] == ['oxygen_ppm']
    assert body['lsl'] == 1020 and body['actions']


def test_undefined_values_become_null_not_nan():
    csv = 'tensile_strength_mpa\n' + '\n'.join(['1050'] * 30)
    body = client.post('/api/analyze', files={'file': ('c.csv', csv.encode(), 'text/csv')}).json()
    assert body['cpk'] is None and body['stable'] is True


@pytest.mark.parametrize('payload,files', [
    ({}, None),
    ({'dataset': 'missing'}, None),
    ({'dataset': 'dataSet1', 'tests': '9'}, None),
    ({'dataset': 'dataSet1', 'subgroup_size': 1}, None),
    ({'dataset': 'dataSet1', 'limits': '{bad json'}, None),
    ({'dataset': 'dataSet1', 'limits': json.dumps({'oxygen_ppm': {'lower': 9, 'upper': 1}})}, None),
    ({}, {'file': ('d.csv', b'a,b\n1,2\n', 'text/csv')}),
    ({}, {'file': ('d.csv', b'', 'text/csv')}),
])
def test_bad_requests_give_422(payload, files):
    assert client.post('/api/analyze', data=payload, files=files).status_code == 422


def test_semicolon_csv_with_odd_headers_is_read():
    csv = 'Print;Tensile Strength (MPa)\n' + '\n'.join(f'{i};{1050 + (i % 7)}' for i in range(1, 31))
    r = client.post('/api/analyze', files={'file': ('x.csv', csv.encode('utf-8-sig'), 'text/csv')})
    assert r.status_code == 200 and r.json()['n'] == 30
    assert any('Tensile Strength' in w for w in r.json()['warnings'])
