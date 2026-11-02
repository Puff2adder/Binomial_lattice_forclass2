# Binomial Lattice Studio — GitHub and Streamlit

A complete, self-contained Executive MBA teaching studio by Peter Ritchken.
This is the code for the studio, with a Python launcher for Streamlit Community
Cloud. The financial engine and interactive interface run in the browser; Streamlit
serves the included files. There is no dependency on the previously hosted Site.

## Quick deployment: upload to GitHub, then connect Streamlit

### 1. Extract the download

Extract `Binomial_Lattice_Studio_Streamlit.zip` on your computer. Open the extracted
`Binomial_Lattice_Studio_Streamlit` folder. You should see `app.py`,
`requirements.txt`, and a `studio` folder together. Do not upload the ZIP itself.

### 2. Create your GitHub repository

1. Sign in to https://github.com and use **+ → New repository**.
2. Name the repository `binomial-lattice-studio` (or choose another name).
3. Choose public or private visibility, then create the repository.
   A private repository requires granting Streamlit access to it.
4. On the empty repository page, choose **uploading an existing file**.
   If the repository already has a README, use **Add file → Upload files**.
5. Drag the **contents** of the extracted folder into the upload area. Include
   the entire `studio` and `tests` folders, keeping their contents in those folders.
   Upload from your computer using GitHub's website; do not upload to this chat.
6. Commit the upload to `main`.
7. Check the repository's top level: `app.py` and `requirements.txt` must be visible
   immediately, alongside `studio/`. Click `studio/` and confirm its six files
   are present. If your browser omits the hidden `.gitignore`, the app still runs;
   you can add that file separately later.

Expected repository layout:

```text
binomial-lattice-studio/
  app.py
  requirements.txt
  README.md
  MODEL_NOTES.md
  VALIDATION.md
  STREAMLIT_VALIDATION.md
  .gitignore
  package.json
  studio/
    index.html
    style.css
    app.js
    model.js
    questions.js
    streamlit-bridge.js
  tests/
    model.test.mjs
```

There are **six** files in `studio/`. Upload this package only; your textbook
workspace, Excel/VBA workbook, instructor manuals, and Sites credentials are not
needed. The answers in `questions.js` are deliberately revealable ungraded practice.

### 3. Deploy on Streamlit Community Cloud

1. Go to https://share.streamlit.io and sign in/connect your GitHub account.
2. Choose **Create app** and deploy from your GitHub repository.
3. Select your repository and branch **main**.
4. Set **Main file path / Entrypoint file path** to **`app.py`**.
5. In advanced settings choose **Python 3.12**. No secrets are required.
6. Choose an available app URL/subdomain and click **Deploy**.
7. Wait for installation to finish. Open the resulting `*.streamlit.app` address.
   If prompted, configure app sharing/visibility for your intended students.
   Repository visibility and app sharing are separate settings.

If you uploaded the outer folder instead of its contents, either move its contents
to the repository root (recommended) or set the main file path to
`Binomial_Lattice_Studio_Streamlit/app.py`. Keep `requirements.txt` and `studio/`
beside that entry point. Do not select `index.html` as the Streamlit entry point.

### 4. Check the deployed app

- Open all six analyses from the studio navigation.
- In the one-period original example, call = 7.2727 and put = 13.6364.
- Change dividend yield and click **Update analysis**.
- Toggle European/American on the two-period page.
- On the eight-period page, confirm one lattice and the histogram beneath it.
- On convergence, European shows **G tree**; American shows **S tree**.
- Reveal an answer in the 20-question practice bank.

The studio appears inside a scrollable Streamlit component. Scroll within it for
long pages. On small screens the call/put columns stack and wide trees scroll
horizontally. Practice progress is stored in the browser on that app's address;
it does not transfer from the earlier Site or another device.

## Updating the app later

Edit or replace the relevant file on GitHub and commit to `main`. Community Cloud
normally updates the connected app automatically. Use its app management menu to
reboot if needed. Keep the same names and directory structure. Replace the files
inside `studio/` when updating the interface or calculations.

## Troubleshooting

- **Cannot find app.py:** verify the branch and entry point path; avoid a doubled
  outer folder when uploading.
- **ModuleNotFoundError: streamlit:** confirm `requirements.txt` is beside `app.py`
  and is named exactly that, not `requirements.txt.txt`.
- **Blank component or missing JavaScript/CSS:** ensure all six `studio/` files were
  uploaded, including `streamlit-bridge.js`; preserve exact filename capitalization.
- **App cannot access repository:** authorize the correct GitHub owner/repository
  in Streamlit, particularly for a private repository.
- **App asleep:** open it and use the wake-up control if offered by Community Cloud.
- **Build fails:** inspect the Community Cloud logs. This package is checked with
  Streamlit 1.56.0 and Python 3.12; keep the supplied version pin initially.

## Optional: run on your own computer

Install Python 3.12. Open a terminal in this extracted folder and run:

```text
python -m venv .venv
```

Activate the environment on Windows with `.venv\Scripts\activate`, or on macOS/Linux
with `source .venv/bin/activate`. Then:

```text
python -m pip install -r requirements.txt
python -m streamlit run app.py
```

Open the localhost URL Streamlit prints. Stop with Ctrl+C. Node.js is not needed
to run or deploy the app. Developers who have Node.js can optionally run the
financial regression tests with `node --test tests/model.test.mjs`.

## Where to edit

| File | Purpose |
| --- | --- |
| `app.py` | Streamlit launcher |
| `studio/index.html` | HTML shell and navigation containers |
| `studio/style.css` | Layout, colours, responsive presentation |
| `studio/app.js` | Six analyses and interactive workflows |
| `studio/model.js` | Financial calculations and symbolic calculator |
| `studio/questions.js` | 20 ungraded questions, hints and explanations |
| `studio/streamlit-bridge.js` | Component readiness and frame height |
| `requirements.txt` | Python dependency pin |

The European convergence analysis uses G0 = S0 exp(-qT) and pG = (exp(rΔt)-d)/(u-d).
The American convergence analysis uses the S tree and
pS = (exp((r-q)Δt)-d)/(u-d), with early exercise compared to the actual stock price.
Both discount at exp(rΔt). See MODEL_NOTES.md for details.

Official references:
- Deployment: https://docs.streamlit.io/deploy/streamlit-community-cloud/deploy-your-app/deploy
- Dependencies: https://docs.streamlit.io/deploy/streamlit-community-cloud/deploy-your-app/app-dependencies
- File organization: https://docs.streamlit.io/deploy/streamlit-community-cloud/deploy-your-app/file-organization
- Custom components: https://docs.streamlit.io/develop/concepts/custom-components/components-v1/intro

The included VALIDATION.md describes the original studio checks.
STREAMLIT_VALIDATION.md records the additional checks for this distribution.
