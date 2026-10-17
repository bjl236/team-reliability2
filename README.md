###
AEROPRINT QC
Six Sigma Hackathon Project - Team 3 "Five Sigma" (DL)
Members: Brendan, Sharon, Connor, Phillip, Edwin
Date: 10/17/2026
###

###
SELECTED PROMPT
Industrial Systems - 3D Printing for Aerospace
###

###
PROBLEM
An aerospace contractor 3D-printing titanium brackets is failing client strength tests. They don't currently track enough environmental and stress parameters against final part strength. Design a tool to monitor and flag when and whether the printing process is capable of meeting strict aerospace tolerances, and help contractors resolve these issues.
###

###
SUMMARY OF TOOL
"AeroPrint QC" is a custom dashboard that evaluates process capability of 3D-printed titanium brackets. The tool is intended for use in a production setting where engineers can monitor process capability and make appropriate changes to setup to maximize production efficiency, mitigate losses, and adhere to strict reliabiity requirements.
###

###
INPUTS
- CSV file with the following columns in the order specified: | Laser Power (W) | Scan Speed (mm/s) | Oxygen (ppm) | Porosity (%) | Build Orientation | Tensile Strength |
  - Laser Power (W): Source from machine logs or a thermopile laser power meter
  - Scan Speed (mm/s): Source from machine logs, slicer file, or physical accelerometer
  - Oxygen (ppm): Source from oxygen data logger as the median during the printing operation
  - Porosity (%): Shall be determined as a ratio of densities relative to typical steel of the same end-use applicability
  - Build Orientation: 0 degrees represents a build direction parallel to the longitudinal axis of the bracket
  - Tensile Strength (MPa): Shall be measured with a machine tensile tester per ASTM A370
- Minimum required strength (MPa)
  - Required strength as sourced from the customer, product engineers, or a consulting group
- Minimum required process capability (CpK)
  - Required process capability as sourced from process engineers or a consulting group
###

###
OUTPUTS
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
