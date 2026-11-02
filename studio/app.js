import {lattice,parityPut,hedge,probabilities,blackScholes,convergence,calculate,intrinsic} from './model.js';
import {QUESTIONS} from './questions.js';

const $=s=>document.querySelector(s), KEY='pr-binomial-lattice-v2';
const E=s=>String(s).replace(/[&<>"']/g,x=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]));
const f=(x,d=4)=>Number.isFinite(x)?(Math.abs(x)<.5*10**(-d)?0:x).toLocaleString('en-US',{minimumFractionDigits:d,maximumFractionDigits:d}):'—';
const frac=(a,b)=>`<span class="frac"><span>${a}</span><span>${b}</span></span>`;
const base={S:100,K:100,T:1,r:.08,q:0,sigma:.30,style:'European',kind:'call'};
const defaults={one:{...base,S:30,K:40,T:1,n:1,manual:true,R:1.1,u:2,d:.5},two:{...base,K:90,r:.1,sigma:.4,n:2},three:{...base,n:3},eight:{...base,n:8,style:'American'},convergence:{...base,r:.05,q:.03,maxN:256,n:8}};
const routes=[['home','Start here','00'],['one','One-period replication','01'],['two','Two-period replication','02'],['three','Three-period exercise','03'],['eight','Eight-period lattice','04'],['convergence','Convergence','05'],['practice','Theory practice','06']];
let saved={};try{saved=JSON.parse(localStorage.getItem(KEY)||'{}');}catch{}
const state={configs:{...structuredClone(defaults),...saved.configs},quiz:saved.quiz||{},hide:false,selected:null,route:'home',filter:'All topics'};
let trees=[],calcVars={},calcTarget=0,calcUnit='option value per share';
function persist(){try{localStorage.setItem(KEY,JSON.stringify({configs:state.configs,quiz:state.quiz}));}catch{}}
function config(){return state.configs[state.route];}
function title(num,t,description,extra=''){return `<div class="page-heading"><div><div class="eyebrow">${num} / Binomial option model</div><h1>${t}</h1><p class="lede">${description}</p></div>${extra}</div>`;}
function nodeName(i,j){return i===0?'Root':`Year fraction t = ${f(i*config().T/config().n,3)} · ${i-j} up / ${j} down`;}
function learned(text){return `<section class="learned"><h2>What we learned</h2><p>${text}</p></section>`;}
function legend(){return `<div class="legend"><span><i class="swatch"></i>Continue / European valuation</span><span><i class="swatch early"></i>Early exercise</span><span><i class="swatch final"></i>Exercise at maturity</span><span><i class="swatch tie"></i>Positive exercise tie</span></div>`;}
function presets(){
  const route=state.route;
  if(route==='convergence')return [['default','Dividend-paying call'],['zero','No dividend yield'],['high','High dividend yield']];
  return [['default',route==='one'?'Workbook inputs':'Workbook inputs'],['lecture',route==='one'?'Lecture: 100 → 120 / 80':'No dividends · at the money'],['dividend','Dividend-paying call'],['put','Early-exercise put']];
}
function inputForm(){
  const c=config(),one=state.route==='one',conv=state.route==='convergence';
  const fields=one?[['S','Stock price S₀','price',.01],['K','Strike K','price',0],['T','Period length Δt','years',.01],['R','Risk-free factor R','gross factor',.0001],['u','Up factor u','multiplier',.001],['d','Down factor d','multiplier',.001],['q','Dividend yield q','% per year',-100]]:[['S','Stock price S₀','price',.01],['K','Strike K','price',0],['T','Maturity T','years',.01],['r','Risk-free rate r','% continuous / year',-100],['q','Dividend yield q','% continuous / year',-100],['sigma','Volatility σ','% annual',.001]];
  let html=fields.map(([key,label,unit,min])=>`<div class="field"><label for="input-${key}">${label}</label><input id="input-${key}" name="${key}" type="number" required min="${min}" step="any" value="${E(['r','q','sigma'].includes(key)?+(c[key]*100).toPrecision(10):c[key])}"><span class="unit">${unit}</span></div>`).join('');
  if(['two','eight','convergence'].includes(state.route))html+=`<div class="field"><label for="input-style">Exercise style</label><select id="input-style" name="style">${['European','American'].map(v=>`<option ${c.style===v?'selected':''}>${v}</option>`).join('')}</select><span class="unit">${conv?'European: G tree · American: S tree':'Exercise before maturity?'}</span></div>`;
  if(state.route==='eight')html+=`<div class="field"><label for="input-kind">Claim</label><select id="input-kind" name="kind"><option value="call" ${c.kind==='call'?'selected':''}>Call</option><option value="put" ${c.kind==='put'?'selected':''}>Put</option></select><span class="unit">One lattice for the selected claim</span></div>`;
  if(conv)html+=`<div class="field"><label for="input-maxN">Refine through n</label><select id="input-maxN" name="maxN">${[64,128,256,512,1024].map(n=>`<option ${c.maxN===n?'selected':''}>${n}</option>`).join('')}</select><span class="unit">Number of time steps</span></div>`;
  return `<form id="inputs" class="input-panel"><div class="input-panel-top"><h2>Inputs <span class="subtle">${one?'One period':conv?'Calls · fixed economic inputs':c.n+' equal time steps'}</span></h2><div class="toolbar"><label class="subtle" for="preset">Example</label><select id="preset">${presets().map(([v,l])=>`<option value="${v}">${l}</option>`).join('')}</select></div></div><div class="inputs">${html}</div><div class="input-footer"><div class="actions"><button class="primary" type="submit">Update analysis</button><button type="button" id="reset">Reset page</button>${conv?'':`<button type="button" id="hide">${state.hide?'Show option values':'Practice: hide option values'}</button>`}</div><small>Yellow fields are editable. Rates are entered as percentages.${one?' r is implied by R and Δt.':''}</small></div><div id="input-status" class="note" aria-live="polite"></div></form>`;
}
function termsStrip(t,c){return `<div class="derived">${[['Δt',t.dt],['u',t.u],['d',t.d],['R',t.R],['p',t.p],['1 − p',1-t.p]].map(([k,v])=>`<div class="term"><span>${k}</span><strong>${f(v,5)}</strong></div>`).join('')}</div><details><summary>How the one-step inputs are calculated</summary><div class="details-body"><div class="math-line">Δt = T / n = ${f(c.T,3)} / ${t.n} = ${f(t.dt,5)} years</div>${c.manual?`<div class="math-line">r = log(R) / Δt = ${f(t.r*100,4)}% per year</div>`:`<div class="math-line">u = exp(σ√Δt) = ${f(t.u,6)} &emsp; d = 1/u = ${f(t.d,6)}<br>R = exp(rΔt) = ${f(t.R,6)}</div>`}<div class="math-line">${t.basis==='G'?'p = [R − d] / [u − d]':'p = [R exp(−qΔt) − d] / [u − d]'} = ${f(t.p,6)}</div><p class="note">${t.basis==='G'?'The G transformation already incorporates the dividend yield.':'The dividend yield changes the pricing weight. Discount continuation at r, not r − q.'} Both weights are strictly between zero and one.</p></div></details>`;}
function treeSVG(tree,mode='option',id='tree'){
  const n=tree.c.n,portfolio=mode==='dollars',holdings=mode==='holdings';
  const step=n===8?170:n===3?155:portfolio||holdings?190:160;
  const boxW=n===8?126:portfolio||holdings?164:114, boxH=portfolio?88:holdings?73:65;
  const margin=boxW/2+14, W=n*step+2*margin, pitch=portfolio?55:holdings?49:n===8?37:43;
  const H=2*n*pitch+boxH+48, center=H/2+10;
  const x=i=>margin+i*step,y=(i,j)=>center+(2*j-i)*pitch;
  let svg=`<svg ${n===1?'class="small-tree"':n===8?'class="wide-tree"':''} width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="group" aria-label="${tree.style} ${tree.kind} ${mode} lattice"><title>${tree.style} ${tree.kind} ${mode} lattice</title>`;
  for(let i=0;i<n;i++)for(let j=0;j<=i;j++)for(const cj of [j,j+1])svg+=`<line class="tree-edge" x1="${x(i)+boxW/2}" y1="${y(i,j)}" x2="${x(i+1)-boxW/2}" y2="${y(i+1,cj)}"/>`;
  for(let i=0;i<=n;i++)svg+=`<text class="node-label" x="${x(i)}" y="16" text-anchor="middle">${i===0?'Today':`t = ${f(i*tree.t.dt,2)}`}</text>`;
  for(let i=0;i<=n;i++)for(let j=0;j<=i;j++){
    const nd=tree.nodes[i][j],selected=state.selected?.kind===tree.kind&&state.selected?.style===tree.style&&state.selected?.i===i&&state.selected?.j===j;
    const cls=nd.early?'early':nd.final?'final':nd.tie?'tie':'';
    const h=mode==='option'?null:hedge(tree,i,j);
    const xx=x(i),yy=y(i,j),color=tree.kind==='call'?'#ae2838':'#0756a3';
    const attrs=`class="tree-node ${cls} ${selected?'selected':''}" tabindex="0" role="button" data-kind="${tree.kind}" data-style="${tree.style}" data-i="${i}" data-j="${j}" aria-label="${tree.style} ${tree.kind}, time step ${i}, ${j} down moves, stock ${f(nd.S,2)}${state.hide?'':', option '+f(nd.value,2)}"`;
    svg+=`<g ${attrs}><title>${i===0?'Root':`${i-j} up, ${j} down`} · select to see the calculation</title><rect class="node-box" x="${xx-boxW/2}" y="${yy-boxH/2}" width="${boxW}" height="${boxH}" rx="5"/>`;
    const txt=(s,dy,cl='node-s',fill='')=>`<text x="${xx}" y="${yy+dy}" text-anchor="middle" class="${cl}" ${fill?`style="fill:${fill}"`:''}>${E(s)}</text>`;
    if(mode==='option'){
      svg+=txt(`${tree.basis==='G'?'G':'S'} ${f(nd.x,2)}`,-9)+txt(`${tree.kind==='call'?'C':'P'} ${state.hide?'?':f(nd.value,2)}`,10,'node-v',color);
      if(nd.early||nd.final||nd.tie)svg+=txt(nd.early?'EARLY EXERCISE':nd.final?'FINAL EXERCISE':'INDIFFERENT',25,'node-status'+(nd.final?' expiry':''));
    }else if(h?.liquidate){svg+=txt('Exercise here',-10)+txt(`Receive ${state.hide?'?':f(nd.value,2)}`,9,'node-v',color)+txt('Close the portfolio',26,'node-label');}
    else if(i===n){
      if(portfolio){
        const arrivals=[];
        for(const [pj,branch] of [[j,'up'],[j-1,'down']])if(pj>=0&&pj<i){const ph=hedge(tree,i-1,pj);if(ph&&!ph.liquidate)arrivals.push(ph[branch]);}
        if(arrivals.length){svg+=txt('Stock '+arrivals.map(a=>state.hide?'?':f(a.stock,2)).join(' / '),-18)+txt('Debt '+arrivals.map(a=>state.hide?'?':f(a.debt,2)).join(' / '),1)+txt('Net '+(state.hide?'?':f(nd.value,2)),21,'node-v',color);}
        else svg+=txt('Settle payoff',-5)+txt(state.hide?'?':f(nd.value,2),17,'node-v',color);
      }else svg+=txt('Liquidate',-6)+txt('Payoff '+(state.hide?'?':f(nd.value,2)),16,'node-v',color);
    }else if(holdings){svg+=txt('H '+(state.hide?'?':f(h.H,4)),-9,'node-v',color)+txt('B '+(state.hide?'?':f(h.B,4)),12,'node-s');}
    else {svg+=txt('Stock '+(state.hide?'?':f(h.stock,2)),-20)+txt('Borrowing '+(state.hide?'?':f(h.B,2)),0)+txt('Net '+(state.hide?'?':f(h.net,2)),22,'node-v',color);}
    svg+='</g>';
  }
  return svg+'</svg>';
}
function optionPanel(t){return `<section class="analysis-panel"><div class="panel-heading"><h3 class="${t.kind}">${t.style} ${t.kind==='call'?'call':'put'}</h3><span><span class="root-label">Value today</span><strong class="root-price ${t.kind}">${state.hide?'?':f(t.root,4)}</strong></span></div><div class="tree-scroll">${treeSVG(t)}</div><div class="panel-body"><small class="muted">Select any node to inspect its backward calculation.${t.c.n>1?' On smaller screens, scroll inside the lattice to see later periods.':''}${t.fromParity?' Put values are obtained from European put–call parity.':''}</small></div></section>`;}
function pricingFormula(t){
  const {p,R,r}=t.t,c=t.c,symbol=t.kind==='call'?'C':'P',american=t.style==='American',root=t.nodes[0][0],up=t.nodes[1][0],down=t.nodes[1][1];
  const numeric=state.hide?'':`<br><small>At the root: [${f(p,6)} × ${f(up.value,4)} + ${f(1-p,6)} × ${f(down.value,4)}] / ${f(R,6)} = ${f(root.continuation,4)}</small>`;
  return `<div><h3 class="${t.kind}">${t.kind==='call'?'Call valuation':'Put valuation'}</h3><div class="formula">p = ${frac('R e<sup>−qΔt</sup> − d','u − d')} = ${f(p,6)}<br>${american?'Continuation':symbol} = ${frac(`p ${symbol}<sub>u</sub> + (1 − p) ${symbol}<sub>d</sub>`,'R')}${!american&&!state.hide?' = '+f(t.root,4):''}${numeric}${american?`<br>${symbol} = max(continuation, exercise payoff)${state.hide?'':' = '+f(t.root,4)}`:''}<br><small>R = ${f(R,6)}. This is a one-step backward calculation.</small></div>${t.kind==='put'&&!american?`<div class="formula">P = C − S e<sup>−qτ</sup> + K e<sup>−rτ</sup><br><small>At the root, τ = T: ${state.hide?'Open the node calculation to reveal values.':`${f(t.root,4)} = ${f(trees.find(x=>x.kind==='call'&&x.style==='European')?.root,4)} − ${f(c.S*Math.exp(-c.q*c.T),4)} + ${f(c.K*Math.exp(-r*c.T),4)}`}</small></div>`:american?'<p class="note">At each American node, take the greater of continuation and immediate exercise. European put–call parity equality is not used.</p>':''}</div>`;
}
function replicationSection(ts){
  return `<div class="section-top"><h2>Replicating portfolios</h2><span class="label">Holdings and financing</span></div><p class="note">H is the number of shares held at the current date. Dividend receipts are reinvested, giving H e<sup>qΔt</sup> shares at the next date. B is signed borrowing: a negative B means lending.</p><div class="pair">${ts.map(t=>`<div><h3 class="${t.kind}">${t.kind==='call'?'Call':'Put'} hedge</h3><div class="formula">H = e<sup>−qΔt</sup> ${frac('V<sub>u</sub> − V<sub>d</sub>','S<sub>u</sub> − S<sub>d</sub>')}<br>B = ${frac('H e<sup>qΔt</sup> S<sub>u</sub> − V<sub>u</sub>','R')} &emsp; V = HS − B</div><div class="analysis-panel"><div class="panel-heading"><h3>Shares H and borrowing B</h3></div><div class="tree-scroll">${treeSVG(t,'holdings')}</div></div></div>`).join('')}</div><div class="section-top"><h2>Stock value, borrowing, and net value</h2></div><div class="pair wide-stack">${ts.map(t=>`<section class="analysis-panel"><div class="panel-heading"><h3 class="${t.kind}">${t.kind==='call'?'Call':'Put'} portfolio in dollars</h3></div><div class="tree-scroll">${treeSVG(t,'dollars')}</div></section>`).join('')}</div><p class="note">At earlier dates the dollar values show the portfolio after rebalancing. At maturity they show the incoming stock and debt values. Two amounts separated by “/” are the two incoming paths to the same terminal node; both have the same net payoff. At an early-exercise node, settle the claim and close the hedge.</p><details><summary>Check the incoming portfolios and rebalancing at every step</summary><div class="details-body table-wrap">${arrivalTable(ts)}</div></details>`;
}
function arrivalTable(ts){
  let rows='';
  for(const t of ts)for(let i=0;i<t.c.n;i++)for(let j=0;j<=i;j++){
    const h=hedge(t,i,j);if(!h||h.liquidate)continue;
    for(const [branch,cj] of [['up',j],['down',j+1]]){
      const a=h[branch],child=t.nodes[i+1][cj];
      rows+=`<tr><td>${t.kind} · (${i},${j}) → (${i+1},${cj})</td><td>${f(a.stock,4)}</td><td>${f(a.debt,4)}</td><td>${f(a.net,4)}</td><td>${f(child.value,4)}</td></tr>`;
    }
  }
  return `<table><thead><tr><th>Claim · parent → child (step, down moves)</th><th>Stock including yield</th><th>Debt repayment</th><th>Net before rebalancing</th><th>Child option value</th></tr></thead><tbody>${rows}</tbody></table>`;
}
function selectedTree(){return trees.find(t=>t.kind===state.selected?.kind&&t.style===state.selected?.style)||trees[0];}
function inspector(){
  const t=selectedTree();if(!t)return '';
  const i=Math.min(state.selected?.i??0,t.c.n),j=Math.min(state.selected?.j??0,i),nd=t.nodes[i][j],c=t.c;
  state.selected={kind:t.kind,style:t.style,i,j};
  const h=hedge(t,i,j),up=t.nodes[i+1]?.[j],down=t.nodes[i+1]?.[j+1];
  calcVars={S:nd.S,K:c.K,p:t.t.p,R:t.t.R,q:c.q,dt:t.t.dt,u:t.t.u,d:t.t.d,tau:Math.max(0,c.T-i*t.t.dt)};
  if(up)Object.assign(calcVars,{Vu:up.value,Vd:down.value,Cu:up.value,Cd:down.value,Su:up.S,Sd:down.S});
  if(h&&!h.liquidate)Object.assign(calcVars,{H:h.H,B:h.B});
  calcTarget=nd.value;
  const intrinsicFormula=t.kind==='call'?'max(S − K, 0)':'max(K − S, 0)';
  const lines=i===c.n?`${intrinsicFormula} = ${f(nd.value,6)}`:`Continuation = [${f(t.t.p,6)} × ${f(up.value,6)} + ${f(1-t.t.p,6)} × ${f(down.value,6)}] / ${f(t.t.R,6)} = ${f(nd.continuation,6)}<br>Immediate exercise = ${intrinsicFormula} = ${f(nd.exercise,6)}<br>${t.style==='American'?`Value = max(${f(nd.continuation,6)}, ${f(nd.exercise,6)}) = ${f(nd.value,6)}`:`European value = continuation = ${f(nd.value,6)}`}`;
  const hedgeWork=h&&!h.liquidate?`<br>H = exp(−${f(c.q,4)} × ${f(t.t.dt,4)}) × (${f(up.value,4)} − ${f(down.value,4)}) / (${f(up.S,4)} − ${f(down.S,4)}) = ${f(h.H,6)}<br>B = ${f(h.B,6)}<br>HS − B = ${f(h.stock,6)} − (${f(h.B,6)}) = ${f(h.net,6)}`:'';
  return `<section class="node-detail"><div class="detail-heading"><div><div class="eyebrow">Follow the calculation</div><h2>${t.style} ${t.kind} · ${E(nodeName(i,j))}</h2><p class="note">${nd.early?'Exercise is better here. The hedge is liquidated.':i===c.n?'At maturity, only the contractual payoff remains.':'Value the remaining claim from the two next-period nodes.'}</p></div><div class="label">Select another node above</div></div><div class="detail-layout"><div><h3>Local inputs</h3><div class="metric-line"><span>Stock S</span><strong>${f(nd.S,6)}</strong></div><div class="metric-line"><span>Strike K</span><strong>${f(c.K,6)}</strong></div>${up?`<div class="metric-line"><span>Up child Vᵤ / down child V_d</span><strong>${f(up.value,4)} / ${f(down.value,4)}</strong></div>`:''}<details ${state.hide?'':'open'}><summary>Worked calculation · reveal at any time</summary><div class="details-body math-line">${lines}${hedgeWork}</div></details>${t.fromParity?`<p class="note">The displayed put comes from parity. The same value is recovered by backward recursion.</p>`:''}</div><div class="calculator"><h3>Try a value or expression</h3><label for="expression" class="small">Use the symbols below. A leading = is optional.</label><input id="expression" autocomplete="off" spellcheck="false" placeholder="${up?'(p*Vu+(1-p)*Vd)/R':t.kind==='call'?'max(S-K,0)':'max(K-S,0)'}"><div class="symbol-buttons">${Object.keys(calcVars).map(v=>`<button type="button" data-symbol="${v}" title="${v} = ${f(calcVars[v],6)}">${v}</button>`).join('')}</div><p class="subtle">Functions: exp, log, sqrt, abs, min, max. Powers: ^. Use * for multiplication. −2^2 means −(2^2).</p><div class="actions"><button id="calculate" class="primary">Calculate</button><button id="calc-clear">Clear</button><button id="calc-transfer">Use result as my answer</button></div><div class="calc-feedback" id="calc-feedback" aria-live="polite"></div><div class="answer-row"><label class="small" for="my-answer">My option value</label><input id="my-answer" inputmode="decimal" placeholder="Per share"><button id="check-value">Check value</button></div><div id="answer-feedback" class="small" aria-live="polite"></div></div></div></section>`;
}
function analysisPage(route){
  const c=config();let content='',intro='';
  const headings={one:['01','One-period replication','See how stock and financing reproduce a call and a put, including a continuous dividend yield.'],two:['02','Two-period replication','Work back through two periods, then inspect how the replicating portfolio changes at the intermediate date.'],three:['03','Three-period exercise','Compare European and American calls and puts under exactly the same stock, rate, yield and volatility inputs.'],eight:['04','Eight-period lattice','Explore one selected claim, its exercise decisions, and the underlying stock’s terminal pricing distribution.']};
  const [num,h,desc]=headings[route];intro=title(num,h,desc)+inputForm();
  try{
    if(route==='one'){const call=lattice(c,'call','European');trees=[call,parityPut(call)];}
    if(route==='two'){const call=lattice(c,'call',c.style);trees=[call,c.style==='European'?parityPut(call):lattice(c,'put',c.style)];}
    if(route==='three')trees=[lattice(c,'call','European'),lattice(c,'put','European'),lattice(c,'call','American'),lattice(c,'put','American')];
    if(route==='eight')trees=[lattice(c,c.kind,c.style)];
    content+=termsStrip(trees[0].t,c);
    if(route==='one'||route==='two'){
      content+=`<div class="section-top"><h2>Stock and option values</h2><span class="label">Calls left · puts right</span></div>${legend()}<div class="pair ${route==='two'?'wide-stack':''}">${trees.map(optionPanel).join('')}</div><h2>Pricing weights and option values</h2><div class="pair">${trees.map(pricingFormula).join('')}</div>`;
      if(route==='two'&&c.style==='American')content+='<p class="notice">American calls and puts are each valued by recursion. At a node, compare immediate exercise with continuation. The hedge shown at a continuing node replicates its successor values.</p>';
      content+=replicationSection(trees)+inspector();
      content+=learned(route==='one'?'The same payoff can be reproduced by stock and financing. The dividend yield enters both the pricing weight and the number of shares held today. A put typically combines a negative stock position with lending.':'The hedge changes as the stock moves and maturity approaches. Rebalancing reallocates the same net value. American holders can exercise instead of continuing; the portfolio is closed when they do.');
    }
    if(route==='three'){
      content+=`<h2>European claims</h2>${legend()}<div class="pair wide-stack">${trees.slice(0,2).map(optionPanel).join('')}</div><h2>American claims</h2><div class="pair wide-stack">${trees.slice(2).map(optionPanel).join('')}</div>`;
      content+=`<details open><summary>The rules at each node</summary><div class="details-body"><div class="formula">Continuation = [pV<sub>u</sub> + (1 − p)V<sub>d</sub>] / R<br>European: V = continuation<br>American: V = max(continuation, immediate exercise)</div><p class="note">Maturity payoff is max(S − K, 0) for a call and max(K − S, 0) for a put. A zero exercise payoff is not marked as positive exercise. A positive tie is shown separately.</p></div></details>`+inspector()+workedTable(trees);
      content+=learned('The exercise right changes the decision rule, not the stock tree or discount factor. Raising q can make call exercise attractive. A put may favor early exercise even when q is zero. Compare the same node across the four lattices.');
    }
    if(route==='eight'){
      content+=legend()+optionPanel(trees[0])+histogram(trees[0])+inspector()+workedTable(trees);
      content+=learned('Every option value is obtained by one-step backward recursion. The histogram describes the underlying stock at maturity; it does not become an option exercise-time distribution when the American toggle is selected.');
    }
  }catch(e){trees=[];content=`<div class="notice error" role="alert">${E(e.message)}</div>`;}
  return intro+content;
}
function workedTable(ts){return `<details><summary>All intermediate calculations · accessible worked table</summary><div class="details-body table-wrap"><table><thead><tr><th>Claim</th><th>Step</th><th>Down moves</th><th>Stock S</th><th>Continuation</th><th>Exercise payoff</th><th>Option value</th><th>Decision</th></tr></thead><tbody>${ts.flatMap(t=>t.nodes.flat().map(nd=>`<tr><td>${t.style} ${t.kind}</td><td>${nd.i}</td><td>${nd.j}</td><td>${f(nd.S,4)}</td><td>${f(nd.continuation,6)}</td><td>${f(nd.exercise,6)}</td><td>${f(nd.value,6)}</td><td>${nd.early?'Early exercise':nd.final?'Final exercise':nd.tie?'Indifferent':nd.i===t.c.n?'Expires worthless':t.style==='European'?'Discount backward':'Continue'}</td></tr>`)).join('')}</tbody></table></div></details>`;}
function histogram(tree){
  const P=probabilities(tree),W=1050,H=325,L=70,R=25,top=28,bottom=65,ph=H-top-bottom,max=Math.max(...P.map(x=>x.prob))*1.13,bw=(W-L-R)/P.length;
  let s=`<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Nine terminal stock prices and their risk-neutral probabilities">`;
  for(let k=0;k<=4;k++){const v=max*k/4,y=H-bottom-v/max*ph;s+=`<line class="chart-axis" x1="${L}" y1="${y}" x2="${W-R}" y2="${y}"/><text class="chart-label" x="${L-9}" y="${y+4}" text-anchor="end">${f(v*100,1)}%</text>`;}
  P.forEach((v,i)=>{const h=v.prob/max*ph,x=L+(i+.17)*bw,y=H-bottom-h;s+=`<rect x="${x}" y="${y}" width="${bw*.66}" height="${h}" rx="3" fill="#3c789f"><title>Stock ${f(v.S,4)} · probability ${f(v.prob*100,4)}%</title></rect><text class="chart-label" text-anchor="middle" x="${L+(i+.5)*bw}" y="${H-bottom+22}">${f(v.S,2)}</text><text class="chart-label" text-anchor="middle" x="${L+(i+.5)*bw}" y="${Math.max(top+10,y-7)}">${f(v.prob*100,2)}%</text>`;});
  s+=`<text class="chart-title" x="${(W+L)/2}" y="${H-10}" text-anchor="middle">Terminal stock price S<tspan baseline-shift="sub">T</tspan></text></svg>`;
  return `<section class="chart-panel"><h2>Terminal risk-neutral stock distribution</h2><p class="note">Nine stock outcomes after eight steps. The probabilities are generated automatically by moving one-step probability mass forward through the tree.</p><div class="chart-scroll">${s}</div><div class="derived"><div class="term"><span>Probability total</span><strong>${f(P.reduce((a,b)=>a+b.prob,0),6)}</strong></div><div class="term"><span>Risk-neutral expected Sₜ</span><strong>${f(P.reduce((a,b)=>a+b.S*b.prob,0),4)}</strong></div><div class="term"><span>S₀ exp((r − q)T)</span><strong>${f(tree.c.S*Math.exp((tree.t.r-tree.c.q)*tree.c.T),4)}</strong></div></div><p class="note">This is the distribution of the underlying at T, not the actual forecast distribution or the timing of American option receipts.</p></section>`;
}
function convergencePage(){
  const c=config();let html=title('05','Convergence to a continuous-time value','Refine the time steps while holding the stock, strike, maturity, volatility, risk-free rate and dividend yield fixed.')+inputForm();
  try{
    const a=convergence(c,c.maxN,c.style),points=a.points.filter(p=>p.valid),last=points.at(-1);
    if(!last)throw Error('No valid step counts for these inputs. Change the inputs or increase the refinement limit.');
    const euro=c.style==='European';
    html+=`<div class="formula">${euro?`G<sub>0</sub> = S<sub>0</sub> e<sup>−qT</sup> = ${f(c.S*Math.exp(-c.q*c.T),6)} &emsp; p<sub>G</sub> = ${frac('e<sup>rΔt</sup> − d','u − d')}`:`S tree starts at S<sub>0</sub> = ${f(c.S,4)} &emsp; p<sub>S</sub> = ${frac('e<sup>(r−q)Δt</sup> − d','u − d')}`}<br><small>At each n: Δt = T/n, u = exp(σ√Δt), d = 1/u, R = exp(rΔt). Recalculate all four quantities and p.</small></div><div class="compare-metrics"><div class="compare-metric"><span class="label">${c.style} call · n = ${last.n}</span><strong>${f(last.value,6)}</strong><small>${euro?'G tree · maturity exercise':'S tree · exercise at every node'}</small></div><div class="compare-metric"><span class="label">European Black–Scholes</span><strong>${f(a.benchmark,6)}</strong><small>Includes the same dividend yield q</small></div><div class="compare-metric"><span class="label">${euro?'Pricing error':'Difference from European value'}</span><strong>${f(last.value-a.benchmark,6)}</strong><small>${euro?'Lattice minus Black–Scholes':'Includes any early-exercise premium'}</small></div></div>`;
    html+=convergenceChart(a,c.style);
    html+=`<p class="notice">${euro?'The G transformation incorporates the yield once. At maturity Gₜ = Sₜ, so the usual call payoff applies. The European lattice approaches dividend-adjusted Black–Scholes.':'The American S tree also converges, but it can approach a value above the European Black–Scholes line when early exercise is valuable. For q = 0 and nonnegative r, the call’s American and European values coincide.'}</p><p class="note">Small upward and downward oscillations are normal. The graph samples every n from 1–32 and wider intervals thereafter. ${a.points.filter(p=>!p.valid).length?'Some coarse step counts do not satisfy the pricing-weight condition; these are marked invalid in the table below.':''}</p><details><summary>Values and errors for every plotted refinement</summary><div class="details-body table-wrap"><table><thead><tr><th>Periods n</th><th>Δt</th><th>${c.style} call</th><th>European benchmark</th><th>${euro?'Error':'Difference'}</th></tr></thead><tbody>${a.points.map(p=>`<tr><td>${p.n}</td><td>${f(c.T/p.n,6)}</td><td>${p.valid?f(p.value,7):'Invalid p at this n'}</td><td>${f(a.benchmark,7)}</td><td>${p.valid?f(p.value-a.benchmark,7):'—'}</td></tr>`).join('')}</tbody></table></div></details>`;
    html+=learned('A finer lattice changes the time discretization, not the contract or economic inputs. Use the G tree for this European convergence experiment. Use the actual S tree and the yield-adjusted weight when deciding American exercise.');
  }catch(e){html+=`<div class="notice error" role="alert">${E(e.message)}</div>`;}
  return html;
}
function convergenceChart(a,style){
  const pts=a.points.filter(p=>p.valid),W=1050,H=400,L=73,R=28,T=28,B=58;
  const all=[...pts.map(p=>p.value),a.benchmark],lo=Math.min(...all),hi=Math.max(...all),pad=Math.max(.03,(hi-lo)*.12),min=lo-pad,max=hi+pad;
  const x=n=>L+(n-1)/Math.max(1,pts.at(-1).n-1)*(W-L-R),y=v=>H-B-(v-min)/(max-min)*(H-T-B);
  let s=`<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${style} binomial call values against number of periods with a European Black–Scholes reference">`;
  for(let k=0;k<=5;k++){const v=min+(max-min)*k/5;s+=`<line class="chart-axis" x1="${L}" x2="${W-R}" y1="${y(v)}" y2="${y(v)}"/><text class="chart-label" x="${L-12}" y="${y(v)+4}" text-anchor="end">${f(v,3)}</text>`;}
  for(const n of [...new Set([1,Math.round(pts.at(-1).n/4),Math.round(pts.at(-1).n/2),Math.round(3*pts.at(-1).n/4),pts.at(-1).n])])s+=`<text class="chart-label" x="${x(n)}" y="${H-B+23}" text-anchor="middle">${n}</text>`;
  s+=`<line x1="${L}" y1="${y(a.benchmark)}" x2="${W-R}" y2="${y(a.benchmark)}" stroke="#b14d55" stroke-width="2" stroke-dasharray="7 5"/><polyline points="${pts.map(p=>`${x(p.n)},${y(p.value)}`).join(' ')}" fill="none" stroke="#007a80" stroke-width="2"/>`;
  pts.forEach(p=>{s+=`<circle class="chart-dot" cx="${x(p.n)}" cy="${y(p.value)}" r="3" fill="#007a80"><title>n = ${p.n} · call ${f(p.value,7)} · difference ${f(p.value-a.benchmark,7)}</title></circle>`;});
  s+=`<text class="chart-title" x="${W/2}" y="${H-10}" text-anchor="middle">Number of periods n</text></svg>`;
  return `<section class="chart-panel"><h2>Call value as the tree is refined</h2><div class="legend"><span><i style="background:#007a80" class="swatch"></i>${style} lattice (${a.basis} tree)</span><span><i style="background:#b14d55" class="swatch"></i>European Black–Scholes reference</span></div><div class="chart-scroll">${s}</div></section>`;
}
function home(){return `<div class="home-intro"><div class="eyebrow">Peter Ritchken / Executive MBA</div><h1>Understand the price.<br>See the portfolio.</h1><p class="lede">Follow the option, the stock, and the financing through the same tree. Explore dividends, compare exercise decisions, and see how a finer lattice approaches its continuous-time value.</p><a class="primary button-link" href="#one">Begin with one period →</a></div><div class="route-grid">${[['one','01','One period','Calls and puts side by side, pricing weights, parity, and the replicating portfolio.'],['two','02','Two periods','Rebalance the stock and financing positions. Switch between European and American claims.'],['three','03','Three periods','Compare four claims together and see where exercise becomes optimal.'],['eight','04','Eight periods','Inspect one selected claim and the terminal risk-neutral stock distribution.'],['convergence','05','Convergence','Use the European G tree or American S tree and compare with Black–Scholes.'],['practice','06','Theory practice','Twenty questions on replication, pricing weights, dividends, and exercise.']].map(([id,num,t,d])=>`<a href="#${id}" class="route-card"><span class="step">${num}</span><h2>${t}</h2><p>${d}</p><span class="go">Open analysis →</span></a>`).join('')}</div><div class="orientation"><section><h2>A route through the studio</h2><div class="step-row"><b>1</b><span>Inspect the inputs and predict how a change will affect the claim.</span></div><div class="step-row"><b>2</b><span>Work backward one step at a time. Select a node to see its calculation.</span></div><div class="step-row"><b>3</b><span>Compare the option with its replicating stock and financing positions.</span></div></section><section><h2>Conventions</h2><p>Option and stock amounts are per share. r and q are continuously compounded annual rates; σ is annual volatility. T is in years. In the one-period example, R, u and d are supplied directly, as in the spreadsheet.</p><p>All six pages are available immediately. Practice progress and inputs are stored only in this browser. Hints and worked answers are always available.</p><p>Core route: one period → two periods → three periods → practice. Eight periods and convergence extend the same ideas.</p></section></div>`;}
function practicePage(){
  const done=Object.values(state.quiz).filter(v=>v.checked||v.revealed).length,correct=QUESTIONS.filter(q=>state.quiz[q.id]?.checked&&state.quiz[q.id]?.selected===q.answer).length;
  const shown=QUESTIONS.filter(q=>state.filter==='All topics'||q.topic===state.filter);
  return title('06','Theory practice','Twenty ungraded questions. Try an answer, use a hint, or reveal the full explanation at any time.')+`<div class="section-top"><label for="topic">Topic <select id="topic">${['All topics','Replication','Risk-neutral valuation','Dividends and exercise','Convergence'].map(t=>`<option ${state.filter===t?'selected':''}>${t}</option>`).join('')}</select></label><button id="reset-quiz">Reset all practice</button></div><div class="quiz-progress"><span><strong>${done} / 20</strong> reviewed</span><span><strong>${correct}</strong> currently correct</span><span>Retry freely · No grade is sent</span></div>${shown.map(q=>{
    const a=state.quiz[q.id]||{},idx=QUESTIONS.indexOf(q)+1,feedback=a.checked||a.revealed;
    return `<section class="quiz-card" id="${q.id}"><div class="tag">${idx.toString().padStart(2,'0')} / ${q.topic}</div><h2>${E(q.q)}</h2><div class="quiz-options">${q.options.map((opt,i)=>`<label class="quiz-option"><input type="radio" name="${q.id}" value="${i}" ${a.selected===i?'checked':''}><span>${String.fromCharCode(65+i)}. ${E(opt)}</span></label>`).join('')}</div><div class="actions"><button class="primary" data-check="${q.id}">Check answer</button><button data-hint="${q.id}">Hint</button><button data-reveal="${q.id}">Show explanation</button></div><div class="quiz-feedback" aria-live="polite">${a.needSelection?'<p>Select an option, or choose Show explanation.</p>':''}${a.hint?`<p><strong>Hint.</strong> ${E(q.hint)}</p>`:''}${feedback?`<p class="${a.checked&&a.selected===q.answer?'success':'muted'}"><strong>${a.revealed?'Worked answer':a.selected===q.answer?'Correct':'Try again'}.</strong> ${a.checked&&a.selected!==q.answer?E(q.wrong[a.selected]||'')+' ':''}${a.revealed||a.selected===q.answer?E(q.why):'You can retry or reveal the worked explanation.'}</p>${a.revealed?`<p><strong>Answer ${String.fromCharCode(65+q.answer)}.</strong> ${E(q.options[q.answer])}</p><details><summary>Why the other options do not work</summary><div class="details-body">${q.wrong.map((x,i)=>i===q.answer?'':`<p class="small"><strong>${String.fromCharCode(65+i)}.</strong> ${E(x)}</p>`).join('')}</div></details>`:''}`:''}</div></section>`;
  }).join('')}`;
}

function render(){
  state.route=routes.some(r=>r[0]===location.hash.slice(1))?location.hash.slice(1):'home';
  $('#nav').innerHTML=routes.map(([id,label,n])=>`<a href="#${id}" ${id===state.route?'class="active" aria-current="page"':''}><span class="num">${n}</span>${label}</a>`).join('');
  document.title=(routes.find(r=>r[0]===state.route)?.[1]||'Studio')+' · Binomial Lattice Studio';
  $('#main').innerHTML=state.route==='home'?home():state.route==='practice'?practicePage():state.route==='convergence'?convergencePage():analysisPage(state.route);
  bind();
}
function applyInputs(form){
  const data=new FormData(form),c={...config()};
  for(const [k,v]of data){c[k]=['style','kind'].includes(k)?v:Number(v);if(['r','q','sigma'].includes(k))c[k]/=100;}
  state.configs[state.route]=c;state.selected=null;persist();render();
}
function bind(){
  $('#inputs')?.addEventListener('submit',e=>{e.preventDefault();applyInputs(e.currentTarget);});
  $('#inputs')?.addEventListener('input',e=>{if(e.target.id!=='preset')$('#input-status').textContent='Inputs changed. Select Update analysis to recalculate the displayed results.';});
  for(const id of ['input-style','input-kind','input-maxN'])$('#'+id)?.addEventListener('change',()=>applyInputs($('#inputs')));
  $('#reset')?.addEventListener('click',()=>{state.configs[state.route]=structuredClone(defaults[state.route]);state.selected=null;state.hide=false;persist();render();});
  $('#hide')?.addEventListener('click',()=>{state.hide=!state.hide;render();});
  $('#preset')?.addEventListener('change',e=>{
    const choice=e.target.value,c=structuredClone(defaults[state.route]);
    if(choice==='lecture'){if(state.route==='one')Object.assign(c,{S:100,K:100,u:1.2,d:.8,R:1.1});else Object.assign(c,{S:100,K:100,q:0});}
    if(choice==='dividend'||choice==='high'){
      if(state.route==='one')c.q=.08;
      else Object.assign(c,{S:100,K:80,q:.18,r:.04,sigma:.25,style:state.route==='convergence'?'American':'American'});
    }
    if(choice==='zero')c.q=0;
    if(choice==='put'){
      if(state.route==='one')Object.assign(c,{S:30,K:50,q:0});else Object.assign(c,{S:70,K:100,q:0,r:.08,sigma:.25,style:'American',kind:'put'});
    }
    state.configs[state.route]=c;state.selected=null;persist();render();
  });
  document.querySelectorAll('.tree-node').forEach(node=>{
    const select=()=>{const d=node.dataset;state.selected={kind:d.kind,style:d.style,i:+d.i,j:+d.j};const old=$('.node-detail');if(old){old.outerHTML=inspector();bindCalculator();}document.querySelectorAll('.tree-node.selected').forEach(n=>n.classList.remove('selected'));document.querySelectorAll(`.tree-node[data-kind="${d.kind}"][data-style="${d.style}"][data-i="${d.i}"][data-j="${d.j}"]`).forEach(n=>n.classList.add('selected'));};
    node.addEventListener('click',select);node.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();select();}});
  });
  bindCalculator();
  $('#topic')?.addEventListener('change',e=>{state.filter=e.target.value;render();});
  $('#reset-quiz')?.addEventListener('click',()=>{state.quiz={};persist();render();});
  document.querySelectorAll('.quiz-option input').forEach(input=>input.addEventListener('change',e=>{const {name,value}=e.target;state.quiz[name]={...(state.quiz[name]||{}),selected:+value,checked:false,needSelection:false};e.target.closest('.quiz-card').querySelector('.quiz-feedback').textContent='Answer changed. Check it when you are ready.';persist();}));
  for(const [attr,field]of [['check','checked'],['hint','hint'],['reveal','revealed']])document.querySelectorAll(`[data-${attr}]`).forEach(btn=>btn.addEventListener('click',()=>{
    const id=btn.dataset[attr],a=state.quiz[id]||{};if(attr==='check'&&a.selected===undefined)a.needSelection=true;else a[field]=true;
    state.quiz[id]=a;persist();const y=window.scrollY;render();window.scrollTo(0,y);
  }));
}
function bindCalculator(){
  let result=null;const input=$('#expression');if(!input)return;
  const output=$('#calc-feedback');
  input.addEventListener('input',()=>{result=null;output.textContent='Expression changed. Calculate again before transferring a result.';});
  document.querySelectorAll('[data-symbol]').forEach(b=>b.addEventListener('click',()=>{
    const start=input.selectionStart,end=input.selectionEnd,s=b.dataset.symbol;input.setRangeText(s,start,end,'end');input.focus();result=null;output.textContent='';
  }));
  $('#calculate').addEventListener('click',()=>{
    try{result=calculate(input.value,calcVars);const substitutions=[...new Set(input.value.match(/[A-Za-z][A-Za-z0-9_]*/g)||[])].filter(v=>Object.hasOwn(calcVars,v)).map(v=>`${v} = ${f(calcVars[v],6)}`).join(' · ');output.innerHTML=`<div>${E(input.value)}</div><div class="subtle">${E(substitutions)}</div><output>${f(result,8)}</output> <span class="subtle">Arithmetic result; compare with the option value below.</span>`;}
    catch(e){result=null;output.textContent=e.message;}
  });
  $('#calc-clear').addEventListener('click',()=>{input.value='';output.textContent='';result=null;$('#my-answer').value='';$('#answer-feedback').textContent='';});
  $('#calc-transfer').addEventListener('click',()=>{if(result===null){output.textContent='Calculate the current expression first.';return;}$('#my-answer').value=String(result);$('#answer-feedback').textContent='Result transferred. Select Check value to compare it with this option node.';});
  $('#check-value').addEventListener('click',()=>{const s=$('#my-answer').value.trim(),v=Number(s),o=$('#answer-feedback');if(!s||!Number.isFinite(v)){o.textContent='Enter a finite numerical value or transfer a calculation result.';return;}o.textContent=Math.abs(v-calcTarget)<=Math.max(.02,Math.abs(calcTarget)*.00001)?'Correct within rounding. This is the option value at the selected node.':'Not quite. Check the payoff, discounting, and any American exercise decision. The worked calculation is available above.';});
}
window.addEventListener('hashchange',()=>{state.selected=null;state.hide=false;render();window.scrollTo(0,0);});
render();
