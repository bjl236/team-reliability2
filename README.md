###
AEROPRINT QC
Six Sigma Hackathon Project - Team 3 "Five Sigma" (DL)
Members: Brendan, Sharon, Connor, Phillip, Edwin
Date: 10/17/2026
###

###
SELECTED PROMPT
Industrial Systems - 3D Printing for Aerospace

An aerospace contractor 3D-printing titanium brackets is failing client strength tests. They don't currently track enough environmental and stress parameters against final part strength. Design a tool to monitor and flag when and whether the printing process is capable of meeting strict aerospace tolerances, and help contractors resolve these issues.
###

###
INTENDED USERS
The 
###

###
SUMMARY OF TOOL
"AeroPrint QC" is a custom dashboard that evaluates process capability of 3D-printed titanium brackets.
###

###
INPUTS
- CSV column of tensile strengths (MPa)
- Minimum required tensile strength (MPa)
- Minimum required process capability (CpK)
###

###
OUTPUTS
- Mean strength
- CpK
- PpK
- Number of prints below requirements
- Number of Out-of-Control (OOC) prints
###
