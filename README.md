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
PROBLEM
An aerospace contractor 3D-printing titanium brackets is failing client strength tests. They don't currently track enough environmental and stress parameters against final part strength. Design a tool to monitor and flag when and whether the printing process is capable of meeting strict aerospace tolerances, and help contractors resolve these issues.
###

###
SUMMARY OF TOOL
"AeroPrint QC" is a custom dashboard that evaluates process capability of 3D-printed titanium brackets. The tool is intended for use in a production setting where engineers can monitor process capability and make appropriate changes to setup to maximize production efficiency, mitigate losses, and adhere to strict reliabiity requirements.
###

###
INPUTS
- CSV column of sample strengths (MPa)
  - Different forms of strength are appropriate and can include tensile strength, compressive strength and shear strength
- Minimum required strength (MPa)
  - Required strength can be sourced from the customer, product engineers, or a consulting group
- Minimum required process capability (CpK)
  - Required process capability can be sourced from process engineers or a consulting group
###

###
OUTPUTS
- Mean strength
- CpK
- PpK
- Number of prints below requirements
- Number of Out-of-Control (OOC) prints
###
