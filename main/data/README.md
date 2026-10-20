# Data codebook

Three **simulated** CSVs, made by `python generate_data.py` with fixed seeds, shaped like what a titanium laser-powder-bed-fusion shop would log. They are generated with the normal distribution (Python equivalent of R's `rnorm`) around the team's nominal values for a simulated LPBF process: laser 280 W, scan speed 1200 mm/s, oxygen 30 ppm, porosity 0.10 %, orientation 0 degrees, tensile strength about 1060 MPa. They are **not** observed aerospace data and **not** certified limits. A copy of each file also sits in `app/sample_data/` (the folder that gets deployed); a test checks the two copies are identical.

**One row = one print, in production order** (row 1 is the oldest print). 60 rows per file.

## Columns
| Column | Required | Meaning | Unit | Real-world source | Default tolerance (lower / upper) |
|---|---|---|---|---|---|
| `laser_power_w` | no | Laser power during the print | W | machine log or thermopile laser power meter | 266 / 294 |
| `scan_speed_mm_s` | no | Laser scan speed | mm/s | machine log, slicer file or accelerometer | 1140 / 1260 |
| `oxygen_ppm` | no | Chamber oxygen, median over the print | ppm | oxygen data logger | 0 / 50 |
| `porosity_pct` | no | Porosity of the part | % | void fraction = 100 × (1 − measured density ÷ theoretical density of Ti-6Al-4V, about 4.43 g/cm³), from CT or density measurement. Not relative to steel (about 7.8 g/cm³) | 0 / 0.20 |
| `build_orientation_deg` | no | Build orientation; 0 = parallel to the bracket's longitudinal axis | degrees | build plan | fixed at 0 (0 / 0) |
| `tensile_strength_mpa` | **yes** | Ultimate tensile strength of the print | MPa | machine tensile tester per ASTM E8/E8M (ASTM F2924 is the AM Ti-6Al-4V specification, minimum UTS 895 MPa) | minimum 1000 (the client's requirement, stricter than the standard), no upper limit |

Columns are matched by name, loosely (case, spaces, units and common synonyms such as `UTS` or `Tensile Strength (MPa)` are accepted, and the tool says what it matched); extra columns are ignored. Oxygen and porosity have a lower limit of 0 only because they cannot be negative; it is not a real engineering specification. The orientation column is constant (0) in all three files, so it can be inspected for pass/fail but has no variation to compute capability from (shown as "ok (constant)").

## Files
| File | Seed | Story |
|---|---|---|
| `dataSet1.csv` | 3 | Stable and capable. Strength mean 1060.1, SD 8.5 MPa; all parameters inside their tolerances. |
| `dataSet2.csv` | 6 | Oxygen drift. Prints 1-30 as dataSet1 (strength mean 1059.0, SD 8.4); from print 31 oxygen rises by about 45 ppm and strength falls (prints 31-60: mean 1008.9, SD 7.9). Whole file: mean 1034.0, SD 26.5. |
| `dataSet3.csv` | 4 | High variation. Stable but too variable: spread of all parameters doubled, strength mean 1038.4, SD 23.5 MPa. |

Strength is built as a nominal value plus small linear effects of laser power, scan speed, oxygen and porosity plus normal noise, so the correlation screen has something real to find. These relationships are invented for the demo.

## What it would take to collect this for real
- **Strength** needs a destructive tensile test of each print (or a witness coupon printed with it) per ASTM E8/E8M, with calibrated equipment, a stated orientation and heat-treatment condition. It is the slow, expensive column.
- **Porosity** needs a density measurement or CT scan, so it is the hardest optional column to get; the tool works without it.
- **Machine and sensor columns** need time-stamped machine logs and an oxygen logger, joined to each print by print ID.
- **Order matters.** Every print needs a reliable date and time, because the control charts assume row order is production order. Sort your file before uploading.
- **Sample size.** At least 20 in-control prints are needed to set limits; 30 or more is better.
- **Specifications.** The minimum strength and the tolerances must come from the customer's approved specification, not from the data.

## Where the starting values come from

- **Backed by a source:** minimum UTS 895 MPa for AM Ti-6Al-4V (ASTM F2924, via Total Materia); oxygen of 100 ppm or less recommended for titanium LPBF (Chalmers thesis); laser power and scan speed of the same order as studied Ti-6Al-4V builds (du Plessis 2019). Full links are in the app sidebar.
- **Demonstration values, no source:** plus or minus 5% on laser power and scan speed, the 0.20% porosity limit, the 50 ppm oxygen limit, the fixed 0° orientation, and the 1.33 target Cpk. Replace them with the client's real values.
- **Oxygen sensor type matters.** A lambda probe read about 700 ppm lower than the true level over a 7-hour print in the Chalmers study, so record the sensor type when collecting real data.
- **Laser power and scan speed** are machine settings in most logs. They hardly vary, so Cpk is meaningless for them (the tool shows "ok (constant)"). Use a thermopile power meter or in-process monitoring if you want measured values.
