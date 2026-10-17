###
AEROPRINT QC
Six Sigma Hackathon Project - Team 3 "Five Sigma" (DL)
Prompt: Industrial Systems - 3D Printing for Aerospace
Members: Brendan, Sharon, Connor, Phillip, Edwin
Date: 10/17/2026
###

###
PROBLEM
An aerospace contractor 3D-printing titanium brackets is failing client strength tests. They don't currently track enough environmental and stress parameters against final part strength. Design a tool to monitor and flag when and whether the printing process is capable of meeting strict aerospace tolerances, and help contractors resolve these issues.
###

###
TOOL
"AeroPrint QC" is a custom dashboard that monitors process capability of 3D-printed titanium brackets at all steps in the production process. The tool is intended for use in a production setting where engineers can monitor process capability and make appropriate changes to maximize production efficiency, mitigate losses, and adhere to capability requirements.
###

###
INPUTS
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
###

###
OUTPUTS
The tool reports with the process in five steps [Figure 1]. Failure at one or more steps is reported to the user.

<img width="821" height="772" alt="WhatsApp Image 2026-10-17 at 2 57 23 PM" src="https://github.com/user-attachments/assets/5e68a506-2d07-4275-9b2e-68c73b57a083" />
Figure 1.

- Mean strength
- CpK
- PpK
- Number of prints below requirements
- Number of Out-of-Control (OOC) prints
###

###
TEST DATA SETS
Test data sets were generated using the normal distribution function rnorm(). Characteristics of these data sets are described below:
testDataSet1.CSV - Fully within spec. $$$
testDataSet2.CSV - Full out of spec. $$$
testDataSet3.CSV - Somewhat in spec. $$$
###
