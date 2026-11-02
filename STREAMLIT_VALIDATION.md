# Streamlit distribution validation

Validated locally on 2 November 2026 with Python 3.12 and Streamlit 1.56.0.

- All 13 financial regression tests passed using this distribution's model.js.
- All 20 additional browser checks passed in a running Streamlit server.
- All six analysis routes loaded inside the custom component.
- The original one-period call, dividend update, and symbolic calculator worked.
- The eight-period analysis contained 45 nodes and nine histogram bars.
- Put/call and European/American convergence controls worked; G/S labels agreed.
- All 20 theory questions were present and solutions could be revealed.
- Desktop and mobile screenshots were inspected; neither host nor component had
  full-page horizontal overflow on mobile. Wide lattices scroll internally.
- No uncaught JavaScript errors occurred during those checks.

The Streamlit launcher serves the included assets as a custom component rather
than embedding the earlier private Site. Only the files listed in the README
are included in this delivery. No credentials, workbook, instructor documents,
installed Python packages, or machine-specific test launcher are included.

This distribution has not been uploaded to your GitHub account or deployed to
your Streamlit Community Cloud account. Those steps require your account access;
the README provides the instructions. Existing Sites hosting is unchanged.
