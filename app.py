import streamlit as st
import pandas as pd
import numpy as np
import plotly.graph_objects as go
from pathlib import Path
from qc import analyze, validate

st.set_page_config(page_title='AeroPrint QC', page_icon='✈️',layout='wide')
st.title('✈️ AeroPrint QC')
st.caption('Titanium bracket strength | SPC • capability • parameter screening | Educational prototype')
st.warning('Synthetic demonstration data. Not a flight-part certification or process release system.')
files = {'Stable / capable':'stable_capable.csv','Oxygen drift':'oxygen_drift.csv','High variation':'high_variation.csv'}
with st.sidebar:
    st.header('Input settings')
    choice = st.selectbox('Demonstration dataset',list(files))
    upload = st.file_uploader('Or upload your own CSV',type='csv')
    lsl = st.number_input('Minimum strength (MPa) — example only',min_value=1.0,value=900.0,step=10.0)
    target = st.number_input('Minimum one-sided Cpk / Ppk target',min_value=0.1,value=1.33,step=0.01)
    st.caption('Replace example limits with approved customer specifications.')
try:
    df = pd.read_csv(upload) if upload is not None else pd.read_csv(Path(__file__).parent/'data'/files[choice])
    df = validate(df)
    r = analyze(df,lsl,target)
except Exception as e:
    st.error(f'Cannot analyze input: {e}')
    st.stop()

c1,c2,c3,c4,c5 = st.columns(5)
c1.metric('Mean strength',f"{r['mean']:.1f} MPa")
c2.metric('One-sided Cpk',f"{r['cpk']:.2f}")
c3.metric('One-sided Ppk',f"{r['ppk']:.2f}")
c4.metric('Below minimum',f"{r['failure_count']} / {r['n']}")
c5.metric('Out-of-control builds',int(r['ooc'].sum()))
if r['ooc'].any():
    st.error('SPC ALERT: build means outside I-chart limits. Investigate special causes before interpreting capability as predictive.')
elif not r['capable']:
    st.warning('CAPABILITY ALERT: one-sided capability is below the selected threshold. Investigate and validate corrective actions.')
else:
    st.success('Screening passed: no build-mean I-chart points outside limits and both one-sided capability estimates meet the selected target.')
st.caption('Passing this screen is not proof of control: additional run rules, measurement-system analysis and qualification are required.')

left,right = st.columns(2)
with left:
    st.subheader('Build-average individuals chart')
    fig = go.Figure()
    idx = list(range(1,r['builds']+1))
    fig.add_trace(go.Scatter(x=idx,y=r['build_means'],mode='lines+markers',name='Build mean'))
    for val,name,color in [(r['center'],'Center','gray'),(r['ucl'],'UCL','red'),(r['lcl'],'LCL','red')]:
        fig.add_hline(y=val,line_dash='dash',line_color=color,annotation_text=name)
    fig.update_layout(xaxis_title='Build order (CSV first occurrence)',yaxis_title='Mean strength (MPa)')
    st.plotly_chart(fig,use_container_width=True)
with right:
    st.subheader('Strength distribution')
    fig2 = go.Figure(go.Histogram(x=df['strength_mpa'],nbinsx=20,name='Specimens'))
    fig2.add_vline(x=lsl,line_color='red',line_dash='dash',annotation_text='Minimum')
    fig2.update_layout(xaxis_title='Strength (MPa)',yaxis_title='Specimen count')
    st.plotly_chart(fig2,use_container_width=True)

st.subheader('Parameter association screening')
st.write('Pearson correlations are descriptive, not causal. Specimens within a build share conditions; p-values below ignore clustering and should not be used for confirmatory inference.')
a = pd.DataFrame(r['associations'])
st.dataframe(a.rename(columns={'parameter':'Measured parameter','r':'Pearson r','p_value':'Naive p-value (exploratory)'}).round(3),use_container_width=True,hide_index=True)
st.subheader('Investigation checklist')
if r['ooc'].any():
    st.write('**Priority 1:** Quarantine/trace affected builds per local procedure; review calibration, oxygen trends, powder lot, maintenance, and operator logs.')
if not r['capable']:
    st.write('**Priority 2:** Verify strength measurement method and approved specification; reduce within-build variability and re-evaluate on independent production runs.')
if r['associations']:
    key = r['associations'][0]['parameter']
    st.write(f'**Screening lead:** {key} has the largest absolute observed correlation. Investigate with controlled experiments and build-level replication; do not change qualified settings based only on correlation.')
st.write('**Always:** Confirm material/process qualification, tensile coupon orientation, heat treatment, porosity/defect inspections, and documented engineering signoff.')
st.subheader('Inspect and export')
st.dataframe(df.head(20),use_container_width=True)
st.download_button('Download analyzed data',df.to_csv(index=False),'aeroprint_analyzed.csv','text/csv')
