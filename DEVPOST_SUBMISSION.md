# AeroPrint QC: Statistical Monitoring for 3D-Printed Aerospace Brackets

**Inspiration:** Titanium additive manufacturing can produce strong parts but build conditions and inconsistent testing make it hard to recognize strength drift before downstream customer rejection.

**What it does:** A dashboard accepts straightforward build and coupon measurements, estimates one-sided process capability, charts build-average statistical control, counts below-spec tensile coupons, screens relationships between measured printing conditions and strength, and offers a conservative investigation checklist.

**How we built it:** Python, Streamlit, pandas, NumPy, SciPy, and Plotly, with AI-assisted coding and fixed-seed synthetic datasets. The statistical methods are described in the README.

**Challenges:** Distinguishing statistical control from specification capability, avoiding misleading two-sided indices when only a minimum is given, and explaining why correlation does not establish root cause.

**Accomplishments:** A locally runnable dashboard, three reproducible demonstration datasets, data codebook, automated tests, and explicit qualification safeguards.

**What's next:** Build-aware regression, uncertainty intervals, measurement-system analysis, additional SPC rules, machine log integration, and validation using approved production datasets.

**Demo script (2–3 minutes):** Start with Stable / capable and explain the specification. Show the histogram and Cpk/Ppk. Select Oxygen drift and point to build-average chart and alert. Select High variation to show degraded consistency. Review correlations as investigation leads, not proven causes. Demonstrate the CSV upload and explain how a contractor could collect data.

**Before submitting:** Add actual team member names, repository URL, live deployed app URL, screenshots or video, and verify the app and tests on your deployment host. Do not claim actual aerospace qualification.
