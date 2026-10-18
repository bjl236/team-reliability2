# AeroPrint QC

Statistical process control and capability screening for **3D-printed titanium aerospace brackets**.

- **What it does:** tells a contractor *whether* its print process can meet the required tensile strength, *when* it stopped being able to, and which process parameter to investigate first.
- **Who it is for:** the process engineer who reviews tensile results after each print and decides whether to stop and investigate before printing client parts.
- **Prompt:** 1. Industrial Systems - *3D Printing for Aerospace* (Virtual DL Challenge).
- **Team:** Brendan, Sharon, Connor, Phillip, Edwin.
- **Live URL:** _add the Posit Connect URL here after deploying_
- **Walk-through of every dataset:** [`demo/README.md`](demo/README.md). **Data codebook:** [`data/README.md`](data/README.md).

> Educational prototype on **synthetic** data. All tolerances are demonstration thresholds, not aerospace qualification limits.

## What you ship (as the hackathon requires)
| Piece | Where |
|---|---|
| Python statistics library | `app/qc.py` (installable: `pip install -e .`) |
| Public REST API (FastAPI) | `app/app.py` (`app:app`), docs at `/docs` |
| Dashboard / web app (React + Vite) | `app/frontend/` (built output in `app/frontend/dist`, served by the API at `/`) |
| 3 test datasets + codebook | `data/` |
| Tests | `tests/` (63 tests) |

%%%
PROBLEM

An aerospace contractor 3D-printing titanium brackets is failing client strength tests. They don't currently track enough environmental and stress parameters against final part strength. Design a tool to monitor and flag when and whether the printing process is capable of meeting strict aerospace tolerances, and help contractors resolve these issues.
%%%

%%%
TOOL

"AeroPrint QC" is a custom dashboard that monitors process capability of 3D-printed titanium brackets at all steps in the production process. The tool is intended for use in a production setting where engineers can monitor process capability and make appropriate changes to maximize production efficiency, mitigate losses, and adhere to capability requirements.
%%%

## RUN INSTRUCTIONS
```bash
python -m pip install -r requirements.txt
python -m pytest -q                              # all tests should pass
cd app && python -m uvicorn app:app --port 8000   # open http://localhost:8000  (React app + API)
```
`./app/testme` does the install, the tests and the server in one command.

Change the front end: `cd app/frontend && npm install && npm run build` (commit the new `dist/`). Live-reload dev: run the API as above, then `npm run dev` (proxies `/api` to port 8000).
Rebuild the demo data: `python generate_data.py` (fixed seeds, identical output).

## Inputs
A CSV, **one row per print, in production order**.
| Column | Required | Unit | Where to get it |
|---|---|---|---|
| `tensile_strength_mpa` | **yes** | MPa | tensile test per ASTM E8/E8M (ASTM F2924 is the AM Ti-6Al-4V specification) |
| `laser_power_w` | no | W | machine log or thermopile laser power meter |
| `scan_speed_mm_s` | no | mm/s | machine log or slicer file |
| `oxygen_ppm` | no | ppm | oxygen data logger, median over the print |
| `porosity_pct` | no | % | void fraction relative to the theoretical density of Ti-6Al-4V (about 4.43 g/cm³), not to steel |
| `build_orientation_deg` | no | degrees | build plan (0 = parallel to the bracket's long axis) |

Columns are matched by **name**, not position. The user also sets: **minimum required strength** (MPa), **minimum required Cpk**, and optionally the tolerances (lower/upper) for each parameter. Only strength is needed for SPC and strength capability; each optional column adds a parameter check.

%%%
INPUTS

- Inputs are variables and processes that affect the tensile strength output.
- Inputs are tested sequentially based on the process order: 
  - Build Orientation -> (Laser Power / Scan Speed / Oxygen) -> Porosity -> Tensile Strength
- Defined lower and upper bounds of process characteristics:
  - Laser Power (W): Source from machine logs or a thermopile laser power meter
  - Scan Speed (mm/s): Source from machine logs, slicer file, or physical accelerometer
  - Oxygen (ppm): Source from oxygen data logger as the median during the printing operation
  - Porosity (%): Shall be determined as a ratio of densities relative to typical steel of the same end-use applicability
  - Build Orientation: 0 degrees represents a build direction parallel to the longitudinal axis of the bracket
  - Tensile Strength (MPa): Shall be measured with a machine tensile tester per ASTM A370
- CSV file of process data
  -  Columns shall be arranged in the following order: | Laser Power (W) | Scan Speed (mm/s) | Oxygen (ppm) | Porosity (%) | Build Orientation | Tensile Strength |
- Checklist of special cause tests
  -  Optional conditions to identify process failure
%%%

%%%
OUTPUTS

Key Statistics

- Mean Strength (MPa)
- CpK (Within Sigma)
- PpK (Overall Sigma)
- Number of Prints Below Requirements
- Number of Out-of-Control Prints

Control Charts

- X-bar Chart
- S Chart
- Strength Distribution
- I Chart (Each Print)
- MR Chart (Change from Previous Print)

Process-Parameter Inspection

- Key statistics for process-parameters are reported individually

Which Parameters Move with Stength?

- Pearson correlation values that assess the impacts of process-parameters on strength. These should be used as indicators, not proof of cause

Process Flow (Reference)

The overall process is to be understood in five steps [Figure 1].
<img width="821" height="772" alt="WhatsApp Image 2026-10-17 at 2 57 23 PM" src="https://github.com/user-attachments/assets/5e68a506-2d07-4275-9b2e-68c73b57a083" />
Figure 1. Process chart of 3D-printed titanium brackets.

Suggested Corrective Investigations

Recommends corrective action based on identified failures. identifies specific process-parameters that failed and recommended instructions to mitigate future failures
%%%

%%%
TEST DATA SETS

Test data sets were generated using the normal distribution function rnorm(). Characteristics of these data sets are described below:

testDataSet1.CSV - Fully within spec. $$$

testDataSet2.CSV - Full out of spec. $$$

testDataSet3.CSV - Somewhat in spec. $$$
%%%
