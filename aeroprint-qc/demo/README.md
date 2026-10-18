# Demo walkthrough

Start the app (`cd app && python -m uvicorn app:app --port 8000`, open http://localhost:8000), click each dataset in the sidebar, and compare with the numbers below. Defaults: minimum strength 1000 MPa, target Cpk 1.33, baseline = first 30 prints, tests 1 and 2, subgroups of 5.

| Dataset | Mean (MPa) | SD (MPa) | Cpk (95% CI) | Ppk | Below 1000 | OOC prints | First signal | Capable? |
|---|---|---|---|---|---|---|---|---|
| `dataSet1.csv` | 1060.1 | 8.5 | 2.36 (1.93 to 2.79) | 2.36 | 0 / 60 | 0 | none | yes |
| `dataSet2.csv` | 1034.0 | 26.5 | 1.30 (1.05 to 1.55) | 0.43 | 4 / 60 | 30 | 31 | no |
| `dataSet3.csv` | 1038.4 | 23.5 | 0.50 (0.38 to 0.62) | 0.54 | 2 / 60 | 0 | none | no |

## How to read each one
1. **dataSet1 (green banner).** All prints in control, Cpk and Ppk about 2.4 (well above 1.33), no print below 1000, every parameter "ok" (orientation is "ok (constant)"). A healthy process.
2. **dataSet2 (red banner).** Oxygen jumps by about 45 ppm at print 31 and strength falls from about 1059 to 1009 MPa (first 30 prints: mean 1059, SD 8.4; last 30: mean 1009, SD 7.9). Look for:
   - the I chart's red crosses start exactly at print 31 (baseline shaded green, prints 1-30, is clean);
   - the X-bar chart shifts at subgroup 7 (prints 31-35);
   - **Cpk (1.30) is far above Ppk (0.43).** Cpk uses short-term moving-range sigma and ignores the shift; Ppk sees it. A big Cpk/Ppk gap means the process is moving;
   - the parameter table marks `oxygen_ppm` "too much spread", 50% of prints outside its limit, with its own first signal at print 31, and it is also the strongest correlation (r about -0.96);
   - the corrective list names print 31 and oxygen; the X̄ chart flags the subgroups after the change, and Ppk (0.43) is far below Cpk (1.30), showing the drift.
3. **dataSet3 (amber banner).** No control signals (the process is stable) but Cpk is 0.50: it is consistently too variable for the minimum. A common-cause problem, so the advice is to reduce variation, not to hunt one bad print. Laser power, scan speed, oxygen and porosity all show "too much spread".

## Try this
- Lower the minimum to 900 MPa on dataSet2: capability improves a lot but the red crosses at print 31 do not go away. Control and capability are different questions.
- Turn on all eight tests. With these fixed seeds dataSet1 and dataSet3 stay clean, but that is luck of the seeds: the README's false-alarm table says a real in-control series of 60 prints triggers at least one flag about 59% of the time with all eight on.
- Edit the oxygen upper tolerance from 50 to 40: the status and "% outside" change.
- Set the baseline to 50 on dataSet2: the baseline now contains the shift, so the centre line lands between the two regimes and the tool flags 50 of the 60 prints, including 23 of the 30 good early ones. It can no longer tell you when things went wrong. This is why limits must come from an in-control baseline.
- Upload a file with only `tensile_strength_mpa`: SPC and strength capability still work and the parameter section says no parameter columns were found.
- Upload a file with a different column name: you get a clear error message.
- Download the results CSV: each print has `flag`, `tests_triggered` and an `<parameter>_in_spec` column.

## API demo
```bash
curl -F dataset=dataSet2 http://localhost:8000/api/analyze | python -m json.tool | head -40
curl -F file=@data/dataSet1.csv -F lsl=1000 -F tests=1,2,3,4,5,6,7,8 http://localhost:8000/api/analyze
```
