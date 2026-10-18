# AeroPrint QC

**Statistical Process Control and Capability Analysis for 3D-Printed Titanium Aerospace Brackets**

AeroPrint QC is a process monitoring and quality control dashboard designed to evaluate the manufacturing capability of additively manufactured titanium aerospace brackets.

The tool helps aerospace contractors determine whether their printing processes meet tensile strength requirements, identify when processes become unstable, and prioritize process parameters for corrective investigation.

- **Project:** Six Sigma Hackathon — Industrial Systems: *3D Printing for Aerospace* (Virtual DL Challenge)
- **Team:** Five Sigma — Brendan Lee, Sharon Chen, Connor Carrasquilla, Phillip Gorni, Edwin Munoz
- **Date:** October 17, 2026
- **Target Users:** Manufacturing and process engineers responsible for monitoring production quality and investigating process failures
- **Run Instructions:** See Section 8.0
- **Dataset Documentation:** [`demo/README.md`](demo/README.md)
- **Data Codebook:** [`data/README.md`](data/README.md)

> **Disclaimer:** AeroPrint QC is an educational prototype developed using synthetic data. All process tolerances and capability thresholds are intended for demonstration purposes and do not represent certified aerospace qualification limits.

---

## 1. Problem Statement

An aerospace contractor manufacturing 3D-printed titanium brackets is experiencing failures during client tensile strength testing. Existing process monitoring does not adequately track the environmental conditions, manufacturing parameters, and material characteristics that influence final part strength.

Without sufficient process monitoring, engineers cannot reliably determine whether their manufacturing process is capable of meeting strength requirements or identify the conditions contributing to defective parts.

**Project Objective:**

Develop a statistical quality control tool that:

- Evaluates whether the manufacturing process is capable of meeting specified tensile strength requirements.
- Monitors process stability and identifies potential special-cause variation.
- Detects prints that fall outside defined engineering specifications or statistical control limits.
- Investigates relationships between manufacturing parameters and final tensile strength.
- Recommends corrective investigations to improve process capability, reduce production losses, and support consistent product quality.

## 2. Proposed Solution

**AeroPrint QC** is a custom dashboard that applies Statistical Process Control (SPC), process capability analysis, and exploratory statistical methods to titanium additive manufacturing data.

The application is intended to support production engineers who review manufacturing and tensile testing results after each print and determine whether additional investigation or process adjustments are necessary.

### Core Capabilities

- **Process Capability:** Calculate capability indices to evaluate compliance with engineering specifications.
- **Statistical Process Control:** Monitor process variation and identify potential out-of-control conditions.
- **Parameter Monitoring:** Evaluate individual manufacturing parameters against defined operating limits.
- **Correlation Analysis:** Identify manufacturing parameters associated with changes in tensile strength.
- **Corrective Investigations:** Suggest areas for further investigation based on detected process failures.

The dashboard supports engineering decision-making but does not replace formal aerospace material qualification or validated process controls.

## 3. Project Deliverables

| Component | Location / Description |
|---|---|
| Python Statistics Library | `app/qc.py` — installable using `pip install -e .` |
| Public REST API | `app/app.py` — FastAPI application with documentation at `/docs` |
| Web Dashboard | `app/frontend/` — React + Vite application |
| Frontend Build | `app/frontend/dist/` — served by the API at `/` |
| Test Datasets | `data/` — three synthetic manufacturing datasets |
| Data Documentation | `data/README.md` |
| Automated Tests | `tests/` — 63 tests |

## 4. Process Overview

The additive manufacturing process is represented by a sequence of manufacturing parameters, intermediate material characteristics, and final mechanical properties.

**Manufacturing Process Sequence:**

1. **Build Orientation:** Determines the orientation of the bracket relative to the build direction.
2. **Printing Parameters:** Laser power, scan speed, and oxygen concentration influence the manufacturing environment and material consolidation.
3. **Porosity:** Internal void formation is evaluated as an indicator of material quality.
4. **Tensile Strength:** Final mechanical testing determines whether the printed bracket meets the specified strength requirement.

### Process Flow Diagram

![Process flow diagram for 3D-printed titanium brackets](https://github.com/user-attachments/assets/5e68a506-2d07-4275-9b2e-68c73b57a083)

*Figure 1. Reference process flow for additive manufacturing of titanium aerospace brackets.*

## 5. Process Inputs

The application accepts a CSV file containing manufacturing parameters and tensile strength measurements.

Each row represents an individual print, arranged in chronological production order.

### 5.1 Required and Optional Variables

| Parameter | CSV Column | Unit | Data Source |
|---|---|---|---|
| Tensile Strength | `tensile_strength_mpa` | MPa | Tensile testing per ASTM E8/E8M |
| Laser Power | `laser_power_w` | W | Machine logs or thermopile laser power meter |
| Scan Speed | `scan_speed_mm_s` | mm/s | Machine logs or slicer files |
| Oxygen Concentration | `oxygen_ppm` | ppm | Oxygen data logger; median concentration during printing |
| Porosity | `porosity_pct` | % | Void fraction relative to theoretical Ti-6Al-4V density |
| Build Orientation | `build_orientation_deg` | degrees | Build plan; 0° represents alignment with the bracket's longitudinal axis |

**Input Requirements:**

- Tensile strength is the only required measurement for strength capability and SPC analysis.
- Additional manufacturing parameters are optional and enable further process monitoring.
- CSV columns are identified by their names, not their positions.
- Prints must be arranged in production order to preserve the validity of sequential control chart analysis.
- Porosity is referenced to the theoretical density of Ti-6Al-4V, approximately 4.43 g/cm³, rather than steel.

### 5.2 User-Defined Specifications

Users can configure the following requirements:

- **Minimum Tensile Strength (MPa):** Lower specification limit for acceptable mechanical performance.
- **Minimum Cpk:** Required process capability threshold.
- **Process Parameter Tolerances:** Optional lower and upper specification limits for individual manufacturing parameters.
- **Special-Cause Tests:** Optional statistical detection rules used to identify potential process instability.

Specification limits are engineering requirements defined by the user and are distinct from statistical control limits calculated from process data.

## 6. Dashboard Outputs

AeroPrint QC provides statistical summaries, process control charts, parameter evaluations, and recommendations for further investigation.

### 6.1 Key Process Statistics

| Statistic | Description |
|---|---|
| Mean Strength (MPa) | Average tensile strength across the selected prints |
| Cpk | Process capability index calculated using within-process variation |
| Ppk | Process performance index calculated using overall variation |
| Prints Below Requirements | Number of prints failing the minimum tensile strength specification |
| Out-of-Control Prints | Number of prints flagged by the selected statistical control rules |

Cpk and Ppk help distinguish short-term process capability from overall process performance. These indices should be interpreted alongside process stability and the assumptions used to estimate variation.

### 6.2 Statistical Process Control Charts

The dashboard supports the following statistical visualizations:

| Chart | Purpose |
|---|---|
| X-bar Chart | Monitors subgroup mean tensile strength |
| S Chart | Monitors within-subgroup standard deviation |
| Strength Distribution | Visualizes tensile strength variation relative to specification limits |
| Individuals (I) Chart | Monitors tensile strength for each individual print |
| Moving Range (MR) Chart | Monitors variation between consecutive tensile strength measurements |

Individuals and moving range charts are appropriate for sequential single-print observations. X-bar and S charts require appropriately defined subgroups.

### 6.3 Process Parameter Inspection

Individual manufacturing parameters are evaluated to identify potential deviations from specified operating conditions.

Parameters include:

- Laser Power (W)
- Scan Speed (mm/s)
- Oxygen Concentration (ppm)
- Porosity (%)
- Build Orientation (degrees)

Available parameter measurements are summarized and compared with user-defined tolerances to support targeted process investigations.

### 6.4 Parameter Correlation Analysis

The dashboard uses **Pearson correlation coefficients** to examine relationships between manufacturing parameters and tensile strength.

This analysis helps engineers identify parameters that may warrant further investigation.

**Interpretation:**

- Positive correlation indicates that two variables tend to increase together.
- Negative correlation indicates that one variable tends to decrease as the other increases.
- Correlation near zero indicates a weak linear relationship.

> **Important:** Correlation does not establish causation. Observed relationships should be investigated through engineering analysis, controlled experimentation, or additional process validation.

### 6.5 Suggested Corrective Investigations

Based on identified process failures and parameter deviations, AeroPrint QC recommends areas for corrective investigation.

Recommendations are intended to help engineers:

- Identify manufacturing parameters associated with failed prints.
- Investigate potential sources of special-cause variation.
- Review process settings that exceed specified operating tolerances.
- Prioritize follow-up inspections, testing, or process adjustments.
- Reduce recurring defects and improve manufacturing consistency.

Recommendations are diagnostic guidance and must be validated before implementation in a production environment.

## 7. Test Datasets

Three synthetic datasets are provided to demonstrate different manufacturing conditions and verify the tool's statistical functionality.

The datasets are generated using reproducible random sampling with fixed seeds. The statistical generation process uses normal-distribution sampling, analogous to R's `rnorm()` function.

| Dataset | Scenario | Expected Evaluation |
|---|---|---|
| `testDataSet1.CSV` | Process measurements fully within specification | Demonstrates a process meeting the defined specification limits |
| `testDataSet2.CSV` | Process measurements outside specification | Demonstrates a process failing the defined specification limits |
| `testDataSet3.CSV` | Mixed in-specification and out-of-specification measurements | Demonstrates partial compliance and the need for further process investigation |

These scenarios are intended to exercise the dashboard's capability analysis, statistical control charts, and parameter inspection features.

> Being within specification does not necessarily mean a process is statistically stable or capable. Capability and control must be evaluated separately.

For additional information, see the [dataset walkthrough](demo/README.md) and [data codebook](data/README.md).

## 8. Installation and Run Instructions

### 8.1 Install Dependencies

From the project root directory:

```bash
python -m pip install -r requirements.txt
```

### 8.2 Run Automated Tests

```bash
python -m pytest -q
```

All 63 tests should pass.

### 8.3 Launch the Application

```bash
cd app
python -m uvicorn app:app --port 8000
```

Open the following addresses:

- **Dashboard:** http://localhost:8000
- **API Documentation:** http://localhost:8000/docs

### 8.4 Run the Automated Setup Script

Alternatively, use the provided script to install dependencies, execute tests, and launch the application:

```bash
./app/testme
```

### 8.5 Rebuild the Frontend

After modifying the React application:

```bash
cd app/frontend
npm install
npm run build
```

Commit the updated `app/frontend/dist/` build output.

### 8.6 Frontend Development Mode

Run the API server, then start the Vite development server:

```bash
cd app/frontend
npm run dev
```

The development server proxies `/api` requests to port 8000.

### 8.7 Regenerate Synthetic Data

From the project root:

```bash
python generate_data.py
```

Fixed random seeds ensure reproducible output.

---

## 9. Project Limitations

AeroPrint QC is designed as a hackathon prototype for demonstrating statistical quality control principles in metal additive manufacturing.

The following limitations apply:

- All demonstration datasets are synthetic and do not represent validated production measurements.
- Engineering tolerances are illustrative and are not certified aerospace acceptance criteria.
- Correlation analysis identifies statistical associations but cannot independently determine causal relationships.
- Process capability indices depend on appropriate estimates of variation and valid statistical assumptions.
- Statistical process control does not replace physical inspection, mechanical testing, or formal qualification procedures.
- Corrective investigation recommendations require engineering review and validation.

## 10. Project Goal

AeroPrint QC demonstrates how statistical process control and capability analysis can transform additive manufacturing data into actionable engineering insights.

By combining tensile strength monitoring, manufacturing parameter analysis, and structured corrective investigations, the project aims to help aerospace manufacturers identify process instability earlier, reduce defective production, and improve confidence in the consistency of 3D-printed titanium components.
