AeroPrint QC
Statistical process control and capability screening for 3D-printed titanium aerospace brackets.

What it does: tells a contractor whether its print process can meet the required tensile strength, when it stopped being able to, and which process parameter to investigate first.
Who it is for: the process engineer who reviews tensile results after each print and decides whether to stop and investigate before printing client parts.
Prompt: 1. Industrial Systems - 3D Printing for Aerospace (Virtual DL Challenge).
Team: Brendan, Sharon, Connor, Phillip, Edwin.
Live URL: add the Posit Connect URL here after deploying
Walk-through of every dataset: demo/README.md. Data codebook: data/README.md.
Educational prototype on synthetic data. All tolerances are demonstration thresholds, not aerospace qualification limits.

What you ship (as the hackathon requires)
Piece	Where
Python statistics library	app/qc.py (installable: pip install -e .)
Public REST API (FastAPI)	app/app.py (app:app), docs at /docs
Dashboard / web app (React + Vite)	app/frontend/ (built output in app/frontend/dist, served by the API at /)
3 test datasets + codebook	data/
Tests	tests/ (63 tests)
Run it
python -m pip install -r requirements.txt
python -m pytest -q                              # all tests should pass
cd app && python -m uvicorn app:app --port 8000   # open http://localhost:8000  (React app + API)
./app/testme does the install, the tests and the server in one command.

Change the front end: cd app/frontend && npm install && npm run build (commit the new dist/). Live-reload dev: run the API as above, then npm run dev (proxies /api to port 8000). Rebuild the demo data: python generate_data.py (fixed seeds, identical output).

Inputs
A CSV, one row per print, in production order.

Column	Required	Unit	Where to get it
tensile_strength_mpa	yes	MPa	tensile test per ASTM E8/E8M (ASTM F2924 is the AM Ti-6Al-4V specification)
laser_power_w	no	W	machine log or thermopile laser power meter
scan_speed_mm_s	no	mm/s	machine log or slicer file
oxygen_ppm	no	ppm	oxygen data logger, median over the print
porosity_pct	no	%	void fraction relative to the theoretical density of Ti-6Al-4V (about 4.43 g/cm³), not to steel
build_orientation_deg	no	degrees	build plan (0 = parallel to the bracket's long axis)
Columns are matched by name, not position. The user also sets: minimum required strength (MPa), minimum required Cpk, and optionally the tolerances (lower/upper) for each parameter. Only strength is needed for SPC and strength capability; each optional column adds a parameter check.

Outputs
Mean strength - Cpk - Ppk - number of prints below the requirement - number of out-of-control (OOC) prints - first out-of-control print - Cp/Cpk/Pp/Ppk and pass/fail for every parameter - correlation screen - suggested corrective investigations - a per-print results CSV.

Method (in words)
Individuals (I) chart. Each print is one measurement, so strength is plotted print by print. Sigma = mean moving range / 1.128. Centre line and limits come from a baseline (first N prints assumed in control, default half the prints and at least 20), never from the whole series, so an excursion cannot widen its own limits.
X̄ and S chart. Consecutive prints are grouped into subgroups of n (2 to 10, default 5). Limits from the baseline subgroups: X̄-bar ± A3 × S-bar; S chart B3 and B4 × S-bar, with c4, A3, B3, B4 computed from the standard formulas. Also an MR chart (moving range, UCL = 3.267 × MR-bar) next to the I chart.
Eight Nelson special-cause tests on the I chart, individually selectable: 1 one point beyond 3 sigma; 2 nine in a row on one side; 3 six in a row trending; 4 fourteen alternating; 5 two of three beyond 2 sigma; 6 four of five beyond 1 sigma; 7 fifteen within 1 sigma; 8 eight beyond 1 sigma. Default: tests 1 and 2. OOC prints = prints flagged by the selected tests.
Strength capability is one-sided (only a minimum): Cpk = (mean - minimum) / (3 x within sigma); Ppk uses the overall SD. Cp and Pp are undefined with one limit. Within sigma = moving-range sigma over all prints; a gap between Cpk and Ppk means the process is moving over time. The 95% interval is the approximation index +/- z sqrt(1/(9n) + index^2/(2(n-1))).
Capability is only trusted on a process in control; the tool warns when it is not.
Parameter inspection. Each print is pass/fail against every tolerance. Per parameter: % outside, Cp, Cpk, Pp, Ppk (two-sided when both limits exist), the first print where its own I chart signals, and a status judged on Ppk: ok, off-center, too much spread, too close to limit, or ok (constant) for a parameter that never varies (such as the fixed 0 degree orientation).
Correlation screen and corrective actions. Pearson correlation of each parameter with strength (a lead, not proof of cause), and rule-based text built from the results above.
False alarms: read this before turning on more tests
Every extra test catches smaller shifts but also fires on pure noise. Measured by simulation (600 series of 60 in-control prints, limits from a 30-print baseline):

Tests on	Series with at least one false alarm
1 only	22%
1 and 2 (default)	30%
1, 2, 5, 6	45%
all eight	59%
So on a short series a flag is a lead to investigate, not proof of a special cause. The default is deliberately conservative.

Library functions (app/qc.py)
Function	Inputs	Returns
validate(df)	DataFrame; needs tensile_strength_mpa, at least 20 rows	cleaned copy; ValueError for missing column, non-numeric, non-positive, or too few prints
mr_sigma(x)	values in order	moving-range sigma (MRbar / 1.128)
capability(mean, sigma, lo, hi)	mean, sigma, limits (None = none)	(Cp, Cpk); Cp is nan unless both limits; nan if sigma is 0
index_ci(index, n, conf=0.95)	index, observations	(low, high)
i_chart_limits(x, baseline_n)	values, baseline size (>= 5)	center, sigma, ucl, lcl
nelson_tests(x, center, sigma, tests=(1,2))	values, centre, sigma, test numbers	{test: [0-based indices]}
xbar_s(x, n=5, baseline_k=None)	values, subgroup size 2-10	subgroup means/SDs, X̄ and S limits, flagged subgroups
mr_chart(x, baseline_n)	values, baseline prints	moving ranges, centre, UCL, LCL, flagged
xbar_r(x, n=5, baseline_k=None)	values, subgroup size 2-10	X-bar/R alternative (kept for reference, not used by analyze)
parameter_inspection(df, limits=None, target=1.33, baseline_n=None)	data, {param: (lower, upper)}	DataFrame with lsl, usl, mean, cp, cpk, pp, ppk, pct_out_of_spec, status, first_signal_print
analyze(df, lsl=1000, target_cpk=1.33, baseline=None, subgroup_size=5, tests=(1,2), limits=None)	as above	dict: mean, cpk, ppk, cpk_ci, ppk_ci, below_count, ooc_count, center, ucl, lcl, flagged, tests, first_signal_print, mr, xbar, parameters, associations, stable, capable, warnings, actions
corrective_actions(result)	an analyze result	list of plain-text suggestions
flag_prints(df, result, limits=None)	validated data, result	per-print DataFrame with below_min_strength, out_of_control, tests_triggered, <param>_in_spec, flag
REST API (app/app.py)
Endpoint	Purpose
GET /health	{"status": "ok"}
GET /api/defaults	default tolerances, tests, settings
GET /api/datasets and GET /api/datasets/{name}	bundled demo datasets (list, CSV)
POST /api/analyze	multipart form: file (CSV) or dataset (name); lsl (1000), target_cpk (1.33), baseline (optional), subgroup_size (5), tests ("1,2"), limits (JSON like {"oxygen_ppm": {"lower": null, "upper": 50}}). Returns the analyze result as JSON (undefined values are null) plus a table of per-print flags. Bad input returns HTTP 422 with a message.
curl -F file=@data/dataSet2.csv -F lsl=1000 http://localhost:8000/api/analyze
Test datasets (defaults: minimum 1000 MPa, target Cpk 1.33)
60 prints each, generated with the normal distribution (the Python equivalent of R's rnorm), fixed seeds.

Dataset	Mean (MPa)	SD (MPa)	Cpk (95% CI)	Ppk	Below 1000	OOC prints	First signal	Capable?
dataSet1.csv	1060.1	8.5	2.36 (1.93 to 2.79)	2.36	0 / 60	0	none	yes
dataSet2.csv	1034.0	26.5	1.30 (1.05 to 1.55)	0.43	4 / 60	30	31	no
dataSet3.csv	1038.4	23.5	0.50 (0.38 to 0.62)	0.54	2 / 60	0	none	no
Parameter inspection (default tolerances):

Dataset	Parameter	Cpk	Ppk	Outside	Status
dataSet1	laser_power_w	1.81	1.63	0%	ok
dataSet1	scan_speed_mm_s	1.45	1.48	0%	ok
dataSet1	oxygen_ppm	1.90	1.81	0%	ok
dataSet1	porosity_pct	2.21	2.08	0%	ok
dataSet1	build_orientation_deg	undefined	undefined	0%	ok (constant)
dataSet2	laser_power_w	1.30	1.41	0%	ok
dataSet2	scan_speed_mm_s	1.48	1.59	0%	ok
dataSet2	oxygen_ppm	-0.26	-0.05	50%	too much spread
dataSet2	porosity_pct	1.89	2.02	0%	ok
dataSet2	build_orientation_deg	undefined	undefined	0%	ok (constant)
dataSet3	laser_power_w	0.83	0.78	0%	too much spread
dataSet3	scan_speed_mm_s	0.75	0.79	3%	too much spread
dataSet3	oxygen_ppm	0.54	0.54	3%	too much spread
dataSet3	porosity_pct	0.80	0.84	0%	too much spread
dataSet3	build_orientation_deg	undefined	undefined	0%	ok (constant)
Tests
python -m pytest -q runs 63 tests: hand-computed known answers (moving-range limits, Cpk, Cp/Cpk, textbook X-bar/R and X-bar/S constants, moving-range limits), degenerate cases (constant data, too few prints, constant parameter, one-sided limits), a planted shift flagged where it was planted, one planted pattern for each of the eight Nelson tests, the documented false-alarm rate, the three datasets' documented behaviour, and every API endpoint including bad input.

Deploy to Posit Connect
Deploy the app/ folder (entry point app:app, health check /health). The course template supplies the workflow; this repo does not include it.

rm -rf app/frontend/node_modules, then ./app/manifestme (needs pip install rsconnect-python) on your own machine, and commit app/manifest.json. app/.python-version pins the Python version: check it against what the course server offers.
Copy the FastAPI workflow from .claude/skills/connect-publish/workflows/ (course template repo) to .github/workflows/, set APP_DIR: app, and add the repo secrets CONNECT_SERVER and CONNECT_API_KEY. Never commit the key.
The React build is already in app/frontend/dist and uses relative URLs, so it works under Connect's URL prefix.
testme, manifestme and deployme in app/ are team-written stand-ins for the course's four-script contract; manifestme and deployme have not been run against a real server.

Limits
Educational prototype: normality assumed, no autocorrelation check, no measurement-system analysis, the Cpk interval is an approximation, the baseline must be confirmed in control by an engineer, and every specification is a placeholder. Build orientation is fixed at 0 in the demo data, so it is inspected but cannot be analysed for capability. Real use needs approved specifications, traceability and independent validation.
