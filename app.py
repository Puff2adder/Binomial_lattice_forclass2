"""Streamlit launcher for the self-contained Binomial Lattice Studio."""
from pathlib import Path
import streamlit as st
import streamlit.components.v1 as components

st.set_page_config(page_title="Binomial Lattice Studio", page_icon="🌳", layout="wide")
st.caption("Peter Ritchken · Executive MBA · Binomial Lattice Studio")

# Serve our own local HTML/CSS/JS as a Streamlit custom component.
# No external website, JavaScript build step, API key, or workbook is required.
studio = components.declare_component(
    "binomial_lattice_studio", path=str(Path(__file__).resolve().parent / "studio")
)
studio(key="binomial-lattice-studio", default=None)
