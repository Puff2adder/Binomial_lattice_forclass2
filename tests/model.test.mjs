import test from 'node:test';
import assert from 'node:assert/strict';
import {lattice,parityPut,hedge,probabilities,blackScholes,fastPrice,calculate,terms,convergence} from '../studio/model.js';
import {QUESTIONS} from '../studio/questions.js';
const base={S:100,K:100,T:1,r:.05,q:0,sigma:.3,n:8};
const near=(a,b,t=1e-9)=>assert.ok(Math.abs(a-b)<=t,`${a} differs from ${b}`);
test('exact supplied one-period spreadsheet preset',()=>{
  const c={S:30,K:40,T:1,q:0,n:1,manual:true,u:2,d:.5,R:1.1};
  const call=lattice(c),put=parityPut(call);
  near(call.t.p,.4);near(call.root,8/1.1);near(put.root,15/1.1);
  near(hedge(call,0,0).H,20/45);near(hedge(call,0,0).B,20/3/1.1);
  near(hedge(put,0,0).H,-25/45);assert.ok(hedge(put,0,0).B<0);
});
test('corrected lecture R=1.10 preset',()=>{
  const c={S:100,K:100,T:1,q:0,n:1,manual:true,u:1.2,d:.8,R:1.1};
  near(lattice(c).t.p,.75);near(lattice(c).root,15/1.1);near(hedge(lattice(c),0,0).H,.5);
});
test('European parity matches independent put recursion at every node',()=>{
  for(const n of [1,2,3,8])for(const q of [0,.04,.18]){
    const c={...base,n,q},p=parityPut(lattice(c)),direct=lattice(c,'put');
    p.nodes.forEach((col,i)=>col.forEach((node,j)=>near(node.value,direct.nodes[i][j].value)));
  }
});
test('dividend-adjusted hedge reproduces every continuing up/down claim',()=>{
  for(const kind of ['call','put'])for(const style of ['European','American'])for(const q of [0,.08,.18]){
    const t=lattice({...base,n:3,q,K:90},kind,style);
    for(let i=0;i<t.c.n;i++)for(let j=0;j<=i;j++){
      const h=hedge(t,i,j);if(h.liquidate){assert.ok(t.nodes[i][j].early);continue;}
      near(h.net,t.nodes[i][j].continuation);near(h.up.net,t.nodes[i+1][j].value);near(h.down.net,t.nodes[i+1][j+1].value);
      near(h.terminalShares,h.H*Math.exp(q*t.t.dt));
    }
  }
});
test('nondividend American call equals European; positive yields can favor early exercise',()=>{
  near(lattice(base,'call','American').root,lattice(base).root);
  const c={...base,K:80,q:.18,r:.04,sigma:.25};
  const a=lattice(c,'call','American'),e=lattice(c);
  assert.ok(a.root>e.root);assert.ok(a.nodes.flat().some(n=>n.early));
  const p=lattice({...base,S:70,K:100},'put','American');
  assert.ok(p.nodes.flat().some(n=>n.early));assert.ok(p.root>=lattice({...base,S:70,K:100},'put').root);
  assert.throws(()=>parityPut(a),/European/);
});
test('zero payoff is not flagged as positive exercise',()=>{
  const t=lattice({...base,S:1,K:1000},'call','American');
  assert.equal(t.nodes.flat().filter(n=>n.early||n.final||n.tie).length,0);
});
test('nine terminal risk-neutral masses add to one and recover expected stock',()=>{
  for(const q of [0,.04,.18]){
    const t=lattice({...base,q}),P=probabilities(t);
    assert.equal(P.length,9);near(P.reduce((x,v)=>x+v.prob,0),1);
    near(P.reduce((x,v)=>x+v.prob*v.S,0),base.S*Math.exp((base.r-q)*base.T));
    assert.ok(P.every(x=>x.prob>=0));assert.ok(P.every((x,i)=>i===0||x.S>P[i-1].S));
  }
});
test('European G and S trees approach dividend-adjusted Black–Scholes',()=>{
  const c={...base,q:.03};const bs=blackScholes(c);
  near(fastPrice(c,1024,'European','G'),bs,.012);
  near(fastPrice(c,1024,'European','S'),bs,.012);
  const G=lattice({...c,n:3},'call','European','G');
  near(G.nodes[0][0].x,c.S*Math.exp(-c.q*c.T));near(G.nodes[0][0].S,c.S);
  near(G.t.p,(G.t.R-G.t.d)/(G.t.u-G.t.d));
  G.nodes[3].forEach(x=>near(x.x,x.S));
});
test('American S tree converges to American value, not necessarily European reference',()=>{
  const c={...base,q:.15,K:80,r:.04};
  const a=fastPrice(c,512,'American'),b=fastPrice(c,1024,'American');
  near(a,b,.03);assert.ok(b>blackScholes(c)+.25);
  assert.throws(()=>lattice(c,'call','American','G'),/S tree/);
});
test('Black–Scholes put parity and zero strike',()=>{
  const c={...base,q:.03};near(blackScholes(c)-blackScholes(c,'put'),c.S*Math.exp(-c.q*c.T)-c.K*Math.exp(-c.r*c.T));
  near(blackScholes({...c,K:0}),c.S*Math.exp(-c.q*c.T));near(blackScholes({...c,K:0},'put'),0);
});
test('pricing validations and coarse invalid convergence points are explicit',()=>{
  assert.throws(()=>terms({...base,sigma:0}),/positive volatility/);
  assert.throws(()=>terms({...base,manual:true,u:1.1,d:.9,R:2}),/pricing weight/);
  assert.throws(()=>terms({...base,S:NaN}),/finite/);
  const a=convergence({...base,q:1,r:.01,sigma:.2},64,'American');assert.ok(a.points.some(p=>!p.valid));
});
test('restricted symbolic calculator covers required arithmetic and failures',()=>{
  near(calculate('= (p*Vu+(1-p)*Vd)/R',{p:.6,Vu:12,Vd:4,R:1.04}),8.8/1.04);
  near(calculate('-2^2'),-4);near(calculate('(-2)^2'),4);near(calculate('2^-2'),.25);near(calculate('2^3^2'),512);
  near(calculate('max(3/2, sqrt(4))+abs(-3)'),5);near(calculate('log(exp(.05))'),.05);
  near(calculate('1e-3 + 1/8'),.126);
  for(const expr of ['1/0','sqrt(-1)','window.alert(1)','unknown+2','5%','1+(2','min()','Math.exp(1)','2(3)'])assert.throws(()=>calculate(expr));
});
test('20 complete practice items with explanations and distractors',()=>{
  assert.equal(QUESTIONS.length,20);assert.equal(new Set(QUESTIONS.map(q=>q.id)).size,20);
  for(const q of QUESTIONS){assert.equal(q.options.length,4);assert.equal(q.wrong.length,4);assert.ok(q.answer>=0&&q.answer<4);assert.ok(q.why&&q.hint);q.wrong.forEach((x,i)=>{if(i!==q.answer)assert.ok(x);});}
});
