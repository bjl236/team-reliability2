# Synthetic dataset codebook
All three CSVs contain **simulated, invented** measurements, not observed aerospace production data. Each includes 24 builds with 5 tensile specimens per build (120 rows). One row is one specimen. Builds are ordered by first appearance in the CSV. The generator uses fixed random seeds.

| Column | Meaning | Unit / source |
|---|---|---|
| build_id | Unique print build identifier | text; build log |
| sample_id | Unique tensile coupon identifier | text; lab record |
| strength_mpa | Measured ultimate tensile strength of specimen | MPa; destructive tensile test |
| oxygen_ppm | Chamber oxygen concentration proxy | parts per million; sensor |
| humidity_pct | Ambient relative humidity proxy | percent; sensor |
| chamber_temp_c | Chamber temperature proxy | degrees Celsius; sensor |
| laser_power_w | Nominal laser power | W; machine log |
| scan_speed_mm_s | Nominal scan speed | mm/s; machine log |
| stress_mpa | Applied proof/service stress proxy | MPa; engineering/test record |

**Collection guidance:** Log the actual test method, specimen geometry, orientation, heat-treatment condition, machine, material lot, calibration, timestamp, and build traceability in production deployments. Real strength observations require destructively tested coupons; environmental proxies alone cannot establish part strength.

**Dataset stories:** `stable_capable.csv` represents relatively consistent high strength; `oxygen_drift.csv` introduces an oxygen increase and strength step after build 13; `high_variation.csv` has greater environmental and strength variation. The relationships and 900 MPa example minimum are illustrative and are not qualified aerospace material limits.
