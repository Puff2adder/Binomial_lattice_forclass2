# Financial and teaching conventions

## Rates and stock values

S is the ex-dividend stock price; q is a constant continuously compounded annual dividend yield, r is a continuously compounded risk-free rate, and sigma is annual volatility. All values are per share and times are years. UI rates are percentages; engines use decimals. One-period R is an explicitly supplied gross growth factor; r = log(R)/dt.

The worked S-tree pages use p = [exp((r-q)dt)-d]/(u-d), or [R exp(-q dt)-d]/(u-d) with manual moves. One-period moves and R retain the Excel layout. Other worked pages use CRR u = exp(sigma sqrt(dt)), d = 1/u, R = exp(r dt). Pricing requires 0 < p < 1. Inputs are hypothetical, not current market data.

Backward continuation is [p Vu + (1-p) Vd]/R. European exercise occurs only at maturity; American values are max(continuation, intrinsic). A strictly positive intrinsic value greater than continuation is marked early exercise. Positive ties are identified separately. Zero ties are not flagged as positive exercise; positive maturity payoffs have a distinct final-exercise style.

## Parity and replication

On the one-period and European two-period pages, put values are actually calculated from P = C - S exp(-q tau) + K exp(-r tau) at every node. They are checked against independent put recursion. American puts are priced by their own backward recursion; European parity equality is not applied.

H denotes shares purchased at the current node, with dividend receipts reinvested over the step. H = exp(-q dt)(Vu-Vd)/(Su-Sd). The shares grow to H exp(q dt) at the next node. B = [H exp(q dt) Su - Vu]/R is signed borrowing. The current portfolio value is HS-B. Negative B means lending, and negative H means a short stock position. Up/down incoming portfolio values include the reinvested yield and debt repayment BR.

At continuing nodes the hedge replicates the successor option values. At chosen early exercise it is closed and the exercise payoff is received. Rebalancing changes H and B while preserving the net value at that node. The dollar lattices display current post-rebalancing allocations and incoming terminal stock/debt amounts. Two terminal figures separated by a slash correspond to distinct incoming paths; the net payoff is the same. The full edge table labels both incoming allocations explicitly.

## Convergence

For European convergence, G0 = S0 exp(-q T), pG = [exp(r dt)-d]/(u-d), and maturity G equals S. Dividends are not subtracted again from the G pricing weight. For American convergence, use S0, pS with r-q, and exercise on the actual S at each node. Both discount at r.

Both models converge. American calls can converge to a value above the European Black–Scholes benchmark when exercise is valuable. With q = 0 and nonnegative r, call exercise does not improve on continuation and the American/European limits coincide. The reference line is always explicitly labeled European. Errors can oscillate. Invalid coarse n values are shown as invalid rather than clamping their probabilities.

The Black–Scholes normal CDF uses the standard five-coefficient approximation, with CDF error below about 8e-8. Numerical comparison tolerances account for this approximation. The convergence plot samples every n through 32 and wider intervals after that; all plotted values are listed in a table.

## Distribution

The histogram is the unconditional terminal risk-neutral stock distribution. It is calculated by forward propagation of one-step probability mass; learners are not asked to expand multi-period probability formulas. It is not a forecast of actual outcomes, or an American exercise-time/cash-flow distribution. Node pricing always uses backward recursion.

## Source review

The instructor's supplied `D:/Peter/CLASSES/BAFI430_all/Lec8_Binomial/PR_Binomial_Models.xlsm` was inspected as an OOXML archive. Its embedded VBA modules were read by static compound-stream extraction and decompression; no macros were executed.

The one-period worksheet supplies S0=30, K=40, R=1.10, u=2 and d=0.5 and gives p=0.4. Its call and put portfolio arrangement informed the new layout. The two-period preset uses S0=100, K=90, T=1, sigma=40%, r=10%, q=0. The three- and eight-period examples use S0=100, K=100, T=1, sigma=30%, r=8%, q=0. The convergence page uses an explicitly hypothetical dividend-paying example rather than importing the workbook's manually linked G-value cells.

The workbook VBA convergence function populates only the terminal S row, while its early-exercise comparison reads unpopulated intermediate S cells; it also skips assigning the first terminal call payoff. These source limitations were not copied. The new engines calculate every stock node and all maturity payoffs, and check American exercise independently. Original workbook code was not edited.

The previous studio's interface conventions and explicit q handling were reviewed. No instructor homework or held-out data was copied into the Site. The new JS engine, public practice bank, and interface are separated. The new six-analysis scope supersedes the earlier four-period limit for this version.
