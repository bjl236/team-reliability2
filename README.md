# AeroPrint QC

**Six Sigma Hackathon 2026 | Team 3 — Five Sigma (DL)**

**Team Members:** Brendan, Sharon, Connor, Phillip, Edwin  
**Date:** October 17, 2026

---

## 1. Project Overview

**Challenge Category:** Industrial Systems  
**Selected Prompt:** 3D Printing for Aerospace

### Problem Statement

An aerospace contractor manufacturing 3D-printed titanium brackets is experiencing failures during customer tensile strength testing. The contractor currently lacks sufficient monitoring of manufacturing parameters and their relationship to final part strength.

The challenge is to develop a tool that:

- Monitors manufacturing parameters and resulting tensile strength.
- Evaluates whether the manufacturing process is capable of consistently meeting customer strength requirements.
- Identifies parts that fail to meet specifications.
- Flags potential process instability and out-of-control observations.
- Supports engineers in identifying opportunities for process improvement.

### Proposed Solution

**AeroPrint QC** is a process quality monitoring dashboard designed to evaluate the manufacturing capability of 3D-printed titanium aerospace brackets.

The dashboard provides engineers with statistical process metrics and quality indicators to support data-driven decisions.

The intended benefits include:

- **Quality Assurance:** Identify products that fail to meet minimum strength requirements.
- **Process Monitoring:** Evaluate process stability and capability using statistical methods.
- **Production Efficiency:** Reduce scrap, rework, and unnecessary production losses.
- **Engineering Decision Support:** Provide actionable information for process optimization.
- **Reliability:** Support consistent manufacturing performance against customer specifications.

---

## 2. Required Inputs

### 2.1 Manufacturing Dataset

The dashboard accepts a CSV file containing manufacturing parameters and measured tensile strength.

**Required CSV columns (in order):**

| Column | Unit | Description / Data Source |
|---|---|---|
| Laser Power | W | Machine logs or thermopile laser power meter |
| Scan Speed | mm/s | Machine logs, slicer files, or physical accelerometer |
| Oxygen | ppm | Median oxygen concentration recorded during the printing operation |
| Porosity | % | Porosity determined using an appropriate density measurement method and reference density for the titanium material |
| Build Orientation | Degrees | Angular orientation of the printed bracket; 0° represents a build direction parallel to its longitudinal axis |
| Tensile Strength | MPa | Measured tensile strength from mechanical testing using an applicable standardized testing procedure |

**Important:** Each row represents one manufactured specimen or print observation. All six columns must be present and in the specified order.

### 2.2 User-Defined Specifications

In addition to the CSV file, users must provide the following:

| Input | Unit | Description |
|---|---|---|
| Minimum Required Strength | MPa | Customer- or engineering-defined lower specification limit (LSL) |
| Minimum Required Process Capability | Cpk | Minimum acceptable process capability index established by engineering or quality personnel |

These specifications establish the criteria used to evaluate manufacturing performance.

---

## 3. Dashboard Outputs

AeroPrint QC calculates and displays the following quality metrics.

| Metric | Description |
|---|---|
| Mean Tensile Strength | Average measured tensile strength across the dataset |
| Cpk | Process capability index based on within-process variation |
| Ppk | Process performance index based on overall observed variation |
| Prints Below Specification | Number of observations with tensile strength below the required minimum |
| Out-of-Control (OOC) Observations | Number of observations flagged by the implemented statistical process control rules |

### Interpretation

**Cpk — Process Capability Index**

Measures process capability relative to the specified strength limit using an estimate of within-process variation.

**Ppk — Process Performance Index**

Measures observed process performance relative to the strength limit using overall process variation.

**Below-Specification Observations**

Identifies manufactured specimens that fail to achieve the minimum required tensile strength.

**Out-of-Control Observations**

Identifies potential process instability based on statistical control limits and the selected control-chart rules.

**Note:** Capability indices should be interpreted alongside process stability and distributional assumptions. A process may have a favorable capability estimate while still exhibiting instability.

---

## 4. Test Datasets

Synthetic datasets were generated in R using the `rnorm()` function to simulate tensile strength observations under different manufacturing conditions.

These datasets are intended to demonstrate and validate dashboard functionality rather than represent experimentally verified aerospace production data.

| Dataset | Scenario | Intended Testing Purpose |
|---|---|---|
| `testDataSet1.CSV` | Fully within specification | Evaluate dashboard behavior for a process meeting strength requirements |
| `testDataSet2.CSV` | Fully outside specification | Verify identification of widespread strength failures |
| `testDataSet3.CSV` | Partially within specification | Evaluate mixed passing and failing observations |

### Dataset Descriptions

**Dataset 1 — Within Specification**

Simulates a manufacturing process in which all observed tensile strengths meet the required minimum.

**Dataset 2 — Outside Specification**

Simulates a manufacturing process in which all observed tensile strengths fail the required minimum.

**Dataset 3 — Mixed Performance**

Simulates a manufacturing process containing both conforming and nonconforming observations.

These scenarios are useful for verifying calculations, specification checks, and dashboard reporting.

---

## 5. Intended Applications

AeroPrint QC is designed as a prototype decision-support tool for:

- Additive manufacturing process engineers
- Aerospace manufacturing quality engineers
- Six Sigma and continuous improvement teams
- Manufacturing research and development personnel

The tool demonstrates how statistical process monitoring can support quality improvement in metal additive manufacturing.

---

## 6. Project Scope and Limitations

AeroPrint QC is a hackathon prototype developed for educational and demonstration purposes.

- Synthetic datasets do not replace experimental manufacturing data.
- Tensile strength is the primary measured quality characteristic.
- Cpk and Ppk are calculated relative to the supplied lower specification limit.
- Out-of-control classifications depend on the implemented control-chart methodology.
- Process capability does not independently establish aerospace certification or component safety.

Further development may incorporate additional manufacturing parameters, predictive modeling, real-time monitoring, and expanded quality requirements.

---

## 7. Project Team

**Team 3 — Five Sigma (DL)**

Brendan | Sharon | Connor | Phillip | Edwin

**Six Sigma Hackathon — October 17, 2026**
