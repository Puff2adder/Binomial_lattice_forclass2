# Validation and release record

Version 02 · 2026-11-02

## Numerical and expression checks

`node --test tests/model.test.mjs`: 13 tests passed, zero failed.

Coverage includes the exact one-period workbook preset and corrected lecture preset; independent put recursion versus European parity at every node; dividend-adjusted hedge values in both successor states; American/European comparisons; early exercise for dividend calls and puts; avoidance of false exercise at zero payoff; nine terminal masses totaling one; expected stock-value reconciliation; G- and S-tree European convergence against dividend-adjusted Black–Scholes; American convergence; strike-zero cases; invalid inputs; coarse invalid pricing weights; calculator precedence, fractions, functions, division/domain errors, missing symbols, and restricted parsing; 20 complete practice items.

The yield-adjusted hedge is checked for both calls and puts under both exercise styles and several q values. At exercise, the hedge is explicitly liquidated. The payout equality is checked on continuing nodes. The calculator never uses eval or Function. Symbol lookup excludes inherited properties.

## Visible workflows

`tests/browser.cjs`: 43 browser checks passed with zero uncaught page errors. Chromium/Chrome headless testing ran against a separate local static server after the Windows sandbox prevented the initial loopback connection. No browser-extension or external-service dependency is required by the app.

Checked all seven routes, direct hash navigation, six analysis links, desktop and mobile page width, one-period call/put and four portfolio lattices, calculated values, expression-to-answer transfer and value checking, rejected nonfinite arithmetic, changed dividend inputs, node selection, resets, visible invalid-weight errors, immediate American/European and call/put updates, early-exercise highlighting, 45 eight-step nodes and nine probability bars, European G/American S convergence labels, all 20 quiz cards, wrong-answer feedback, retry, unrestricted explanation reveal, browser persistence, topic filtering, and practice reset.

Screenshots of every desktop and mobile route were inspected. Lattices, parity formulas, portfolio signs, root values, exercise labels, chart legends, and worked calculations were reviewed. A mobile grid overflow was corrected and the full workflow suite rerun successfully. The eight-step tree fits the desktop analysis width and scrolls inside its container on smaller screens. Formula displays distinguish American continuation from the final option value. The histogram is directly below the eight-step lattice.

## Packaging and scope

`node tests/package.cjs`: exactly five public files match public_manifest.json. Their SHA-256 hashes are recorded in the ignored QA folder. No original workbook, VBA binary, textbook sources, instructor solutions, assessment answers, or QA files are in dist. No instructor-only material is copied into the public question bank. Browser-local practice answers are intentionally public ungraded solutions.

The workbook was statically inspected without executing macros. Its convergence VBA source limitations are documented in MODEL_NOTES.md and were not copied. Previous studio versions, lecture materials, the user workbook, and the homework packages are unchanged.

This is a newly versioned static studio rather than an in-place replacement of the earlier Streamlit app. It has no server-side student records, identity collection, grading, submission, or telemetry. The Site remains owner-private; sharing has not been broadened. Deployment success is reported separately from these local checks.

## Numerical limits

Constant continuous yield, constant rates and volatility, and CRR moves are the intended model. The one-period worked example also permits instructor-supplied u, d and R. Strictly positive pricing weights are required. Finite-step European G and S constructions need not agree exactly but approach the same European limit. Small oscillations in refinement are expected. Black–Scholes uses a standard approximate normal CDF. The histogram is an unconditional stock distribution, not the distribution of American exercise receipts.
