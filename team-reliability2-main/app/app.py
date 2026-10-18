"""AeroPrint QC - FastAPI service. Entry point for Posit Connect: `app:app`.

Endpoints
  GET  /health                 liveness check
  GET  /api/defaults           default tolerances, tests and settings
  GET  /api/datasets           bundled demo datasets
  GET  /api/datasets/{name}    one demo dataset as CSV
  POST /api/analyze            run the analysis (upload a CSV, or name a bundled dataset)
The React front end (app/frontend/dist, built with Vite) is served at / when present.
All statistics live in qc.py; this file only validates requests and shapes JSON.
"""
import io
import json
import math
from pathlib import Path
from typing import Optional

import numpy as np
import pandas as pd
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.responses import PlainTextResponse
from fastapi.staticfiles import StaticFiles

import qc

HERE = Path(__file__).resolve().parent
SAMPLES = HERE / 'sample_data'
DIST = HERE / 'frontend' / 'dist'
DATASETS = {
    'dataSet1': 'Stable and capable: every print in control and well above the minimum strength.',
    'dataSet2': 'Oxygen drift: oxygen rises from print 31 and strength falls (special cause).',
    'dataSet3': 'High variation: stable but too variable to meet the minimum (common cause).',
}
MAX_BYTES = 5_000_000

app = FastAPI(title='AeroPrint QC', version='1.0.0',
              description='SPC and process-capability screening for 3D-printed titanium brackets. '
                          'Educational prototype on synthetic data.')


def clean(o):
    """Make numpy / pandas / nan values JSON-safe (nan and inf become null)."""
    if isinstance(o, dict):
        return {str(k): clean(v) for k, v in o.items()}
    if isinstance(o, (list, tuple)):
        return [clean(v) for v in o]
    if isinstance(o, np.ndarray):
        return clean(o.tolist())
    if isinstance(o, pd.DataFrame):
        return clean(o.to_dict('records'))
    if isinstance(o, (np.bool_, bool)):
        return bool(o)
    if isinstance(o, (np.integer,)):
        return int(o)
    if isinstance(o, (np.floating, float)):
        return None if not math.isfinite(o) else float(o)
    return o


@app.get('/health')
def health():
    return {'status': 'ok'}


@app.get('/api/defaults')
def defaults():
    return {'limits': {k: {'lower': v[0], 'upper': v[1]} for k, v in qc.DEFAULT_LIMITS.items()},
            'tests': list(qc.DEFAULT_TESTS), 'lsl': 1000.0, 'target_cpk': 1.33, 'subgroup_size': 5,
            'columns': qc.COLUMNS, 'required': [qc.STRENGTH]}


@app.get('/api/datasets')
def datasets():
    return [{'name': k, 'description': v} for k, v in DATASETS.items()]


@app.get('/api/datasets/{name}', response_class=PlainTextResponse)
def dataset_csv(name: str):
    if name not in DATASETS:
        raise HTTPException(404, 'Unknown dataset.')
    return (SAMPLES / f'{name}.csv').read_text()


def parse_limits(raw: Optional[str]):
    if not raw:
        return None
    try:
        obj = json.loads(raw)
        out = {}
        for k, v in obj.items():
            if k not in qc.PARAMS:
                raise ValueError(f'Unknown parameter in limits: {k}')
            lo, hi = v.get('lower'), v.get('upper')
            lo = None if lo in (None, '') else float(lo)
            hi = None if hi in (None, '') else float(hi)
            if lo is not None and hi is not None and lo > hi:
                raise ValueError(f'{k}: lower limit is above upper limit.')
            out[k] = (lo, hi)
        return out
    except (ValueError, AttributeError, TypeError) as e:
        raise HTTPException(422, f'Bad limits: {e}')


def read_table(raw: bytes):
    """Read a CSV-like upload. Picks the separator (comma, semicolon, tab or pipe) that appears most often in the
    header line, and ignores a leading byte-order mark that Excel adds."""
    text = raw.decode('utf-8-sig')
    header = text.splitlines()[0] if text.strip() else ''
    sep = max(',;\t|', key=header.count) if any(c in header for c in ',;\t|') else ','
    return pd.read_csv(io.StringIO(text), sep=sep)


@app.post('/api/analyze')
async def analyze(file: Optional[UploadFile] = File(None), dataset: Optional[str] = Form(None),
                  lsl: float = Form(1000.0), target_cpk: float = Form(1.33), baseline: Optional[int] = Form(None),
                  subgroup_size: int = Form(5), tests: str = Form('1,2'),
                  limits: Optional[str] = Form(None)):
    """Analyse a CSV (one row per print, in production order). Provide `file` or `dataset`."""
    try:
        if file is not None:
            raw = await file.read()
            if len(raw) > MAX_BYTES:
                raise HTTPException(413, 'File too large (limit 5 MB).')
            df = read_table(raw)
        elif dataset in DATASETS:
            df = pd.read_csv(SAMPLES / f'{dataset}.csv')
        else:
            raise HTTPException(422, 'Provide a CSV file or the name of a bundled dataset.')
        sel = tuple(int(t) for t in tests.split(',') if t.strip())
        lim = parse_limits(limits)
        d = qc.validate(df)
        r = qc.analyze(d, lsl, target_cpk, baseline or None, subgroup_size, sel, lim)
        table = qc.flag_prints(d, r, lim)
    except HTTPException:
        raise
    except (ValueError, pd.errors.ParserError, pd.errors.EmptyDataError, UnicodeDecodeError) as e:
        raise HTTPException(422, str(e))
    out = dict(r)
    out['tests'] = {str(k): v for k, v in r['tests'].items()}
    out['tests_by_print'] = {str(k): v for k, v in r['tests_by_print'].items()}
    out['table'] = table
    return clean(out)


if DIST.is_dir():  # must come last so it never shadows the API routes
    app.mount('/', StaticFiles(directory=DIST, html=True), name='frontend')
