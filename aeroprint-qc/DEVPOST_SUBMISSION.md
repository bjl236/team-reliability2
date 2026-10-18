# AeroPrint QC: SPC and Capability Monitoring for 3D-Printed Aerospace Brackets

**Inspiration:** A contractor printing titanium brackets keeps failing client strength tests because it does not track build conditions against final strength. It finds out about drift only after parts are rejected.

**What it does:** Upload print-by-print results (only tensile strength is required; laser power, scan speed, oxygen, porosity and orientation are optional). The tool draws X̄ and S charts, a histogram and an I-MR view with limits from an in-control baseline, applies the eight Nelson special-cause tests (user-selectable), reports Cpk and Ppk against the required strength with a 95% interval, counts prints below requirement and out-of-control prints, checks every print and every parameter against editable tolerances (Cp, Cpk, Pp, Ppk), points to the first print that went wrong and the parameter that moved with it, suggests corrective investigations, and exports a per-print flag file.

**How we built it:** A plain, tested Python statistics library (`qc.py`), a FastAPI service, and a React + Vite dashboard served by the same app for Posit Connect. 63 automated tests cover hand-computed known answers, each Nelson test, degenerate cases and every endpoint. Three fixed-seed synthetic datasets with a codebook. Built with AI assistance, steered with a stats-first workflow.

**Challenges:** Keeping control limits from absorbing the excursion (baseline period); separating control from capability; one-sided specs where Cp is undefined; and discovering that stacking Nelson tests makes short series cry wolf (about 22% false alarms with one test and about 59% with all eight over 60 in-control prints), so we default to two tests and publish the rates.

**Accomplishments:** On the drift dataset the tool flags exactly print 31, where oxygen was shifted, and names oxygen as the parameter that signalled at the same print; the stable dataset raises no alarms; the high-variation dataset is correctly "stable but not capable".

**What's next:** Measurement-system analysis, build-aware (mixed) models, machine-log integration, validation on approved production data.

**Demo script (2-3 min):** dataSet1 (green) -> dataSet2 (red at print 31; point at the Cpk vs Ppk gap, oxygen row, corrective list) -> dataSet3 (amber: stable but not capable) -> edit a tolerance -> turn on more tests and discuss false alarms -> download the flag CSV -> show the API call.

**Before submitting:** add team names as registered on Devpost, repo URL, live Posit Connect URL, and a screenshot or video. Do not claim aerospace qualification.
