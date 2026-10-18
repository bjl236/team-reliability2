# SPEC: Six Sigma Hackathon team project

What your tool IS. Your agent reads this before every task. Where the code and this file
disagree, the code is the bug: change this file first, then the code.

Most of this page is already decided by the event and the [rubric](docs/criteria.md).
**Only the `FILL IN` lines change, and you do not have to write them by hand:** describe your app and ask your agent to update them. They depend on the prompt your team picks at kickoff
(prompts are secret until then, see [`docs/prompts.md`](docs/prompts.md)) and on your team.
The examples after each `FILL IN` show the shape of an answer. They are not hints about the prompts.

## 1. Team and prompt
- **Team name:** TEAM NAME TBD (members: Brendan, Sharon, Connor, Phillip, Edwin)
- **Track:** Virtual DL Challenge (7 days); due Fri Oct 23, 3 PM ET.
- **Prompt we chose:** 1. Industrial Systems - 3D Printing for Aerospace (confirm the number against the Devpost page).
- **Our public repo:** REPO URL TBD (create the public GitHub repo, then paste the link)

## 2. User and use case (rubric: scope 5, user and use case 5)
- **User:** the process engineer at a titanium 3D-printing contractor who reviews tensile results after each print.
- **Decision the tool helps them make, and when:** after each print (or batch of prints), whether to stop and investigate before printing client parts, and which process parameter to look at first.
- **Why this matches the prompt:** it flags when and whether the print process can meet a strict strength requirement and ties strength problems to the environmental and process parameters that moved with them.

## 3. Inputs (rubric: minimal inputs 5)
Only what this user can actually measure or already knows. Fewer is better; every input a user
cannot measure costs points.

| Input | Type and units | Where the user gets it |
|---|---|---|
| `tensile_strength_mpa`, one row per print in production order | MPa | tensile tester per ASTM E8/E8M (ASTM F2924 is the AM Ti-6Al-4V specification) |
| minimum required strength; minimum required Cpk | MPa; unitless | customer or process engineers |
| optional: laser power, scan speed, oxygen, porosity, build orientation (with editable tolerances) | W, mm/s, ppm, %, deg | machine logs, oxygen logger, density measurement (relative to Ti-6Al-4V theoretical density, about 4.43 g/cm³), build plan |

## 4. The statistics, and why (rubric: valid QC analysis 25)
Say the method in words before any code exists. Load the `stats-first-steering` skill first.
- **Method:** I chart of individual prints (sigma = mean moving range / 1.128) and MR chart, plus X̄ and S charts of subgroups of 5, both with limits from an in-control baseline; eight Nelson special-cause tests (default 1 and 2); one-sided Cpk and Ppk against the minimum strength with an approximate 95% interval; Cp/Cpk/Pp/Ppk and pass/fail for each process parameter against editable tolerances.
- **Why it fits the use case:** it answers "is the process capable, and when did it stop being so?" from one strength measurement per print, and every parameter column is optional.
- **Assumptions and how the tool checks them:** baseline in control (user-chosen, shaded on the charts); approximate normality (histogram shown); capability trusted only if the process is stable (the tool warns); rows are in production order (stated in the UI and codebook).
- **Known-answer check:** prints 10,12,11,13,12 give centre 11.6 and sigma 1.5/1.128; Cpk (1060-1000)/(3 x 20) = 1.0; X̄/S with c4 = 0.9400, A3 = 1.427 and B4 = 2.089 for n = 5 (`tests/test_qc.py`).

Fixed for every team:
- The statistic lives in **one plain, tested function** (`app/qc.py` or `app/qc.R`). The API, app or
  package only calls it and displays the result. No statistics inside UI code.
- Every statistic has a test against a known answer and a degenerate case (constant data, n = 1, missing values).
- You can explain every number the tool prints. If you cannot, it is not done.

## 5. Delivery (rubric: working tool 25)
- **Stack:** Python library (`app/qc.py`) + REST API (FastAPI, `app/app.py`) + React/Vite dashboard (`app/frontend`) served by the same FastAPI app.
- **Starting demo:** `demos/fastapi/` plus `demos/reactfront/` structure, rebuilt by hand because the template files could not be read (check the stand-in `testme`/`manifestme`/`deployme` against the originals).

Fixed for every team:
- Start from **one** demo in `demos/`, copied to `app/`. Keep its four-script contract
  (`testme`, `manifestme`, `deployme`, `README.md`); `testme` starts the tool with one command.
- Deployed on the course **Posit Connect** server with a public URL (publisher key handed out at the
  event). Deploy early: copy one workflow from
  [`.claude/skills/connect-publish/workflows/`](.claude/skills/connect-publish/workflows/).
- A small tool that runs beats a large tool that does not.

## 6. Outputs
- **What the user sees:** mean strength (MPa), Cpk and Ppk (unitless, with 95% interval), prints below the requirement, out-of-control prints and the first one, X̄ and S charts and a histogram, with an I-MR view on request, out-of-control prints in red, a pass/fail parameter table with Cp/Cpk/Pp/Ppk, suggested corrective investigations, a per-print flag CSV, and a banner: out of control / stable but not capable / passed.

## 7. Test datasets and codebook (rubric: demo 10, datasets 5, codebook 5)
2-3 small CSVs in `data/`, invented but shaped like real field data, each showing one behavior.
`data/README.md` is the codebook: every file, every column with units, and what it would take to
collect this data for real.
- **Datasets:** `dataSet1.csv` (stable and capable), `dataSet2.csv` (oxygen rises from print 31, strength falls), `dataSet3.csv` (stable but too variable). 60 prints each.

## 8. Documentation and reproducibility (rubric: docs 10, public repo 5)
- `README.md` says what the tool does, for whom, every input and parameter, how to run it in one
  command, and walks through the demo on each test dataset.
- Public GitHub repo; a fresh clone runs `testme` and the tests pass with no extra steps.
- Submit on Devpost: the repo link plus a demo.

## 9. Out of scope
What we will NOT build, so nobody (human or agent) builds it by accident.
- Default: logins, databases, real customer data, a second statistic before the first one is tested.
- No fatigue or fracture analysis, no qualification claims, no forecasting, no causal inference from correlation.
