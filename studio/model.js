// Financial calculations. j counts down moves. Rates and yields are decimals.
export const intrinsic = (S, K, kind) => Math.max(kind === 'call' ? S-K : K-S, 0);
export function terms(c, n=c.n, basis='S') {
  for (const key of ['S','K','T','q']) if (!Number.isFinite(c[key])) throw Error('Enter a finite number for '+key+'.');
  if (!(c.S>0 && c.K>=0 && c.T>0 && Number.isInteger(n) && n>=1 && n<=2048)) throw Error('Use a positive stock price and maturity, a nonnegative strike, and 1–2048 periods.');
  const dt=c.T/n;
  let u,d,R,r;
  if(c.manual){
    ({u,d,R}=c); r=Math.log(R)/dt;
    if(![u,d,R].every(Number.isFinite) || !(u>d && d>0 && R>0)) throw Error('Use positive u, d and R, with u greater than d.');
  } else {
    if(!Number.isFinite(c.r)||!Number.isFinite(c.sigma)||c.sigma<=0) throw Error('Enter a finite rate and positive volatility.');
    r=c.r;u=Math.exp(c.sigma*Math.sqrt(dt));d=1/u;R=Math.exp(r*dt);
  }
  const growth=R*Math.exp((basis==='G'?0:-c.q)*dt), p=(growth-d)/(u-d);
  if(![u,d,R,p].every(Number.isFinite)) throw Error('These inputs are too large to calculate. Reduce the rates, time, or moves.');
  if(!(p>0 && p<1)) throw Error('The one-step pricing weight must lie between 0 and 1. Use d < exp((r − q)Δt) < u for an S tree; increase the number of periods or adjust the inputs.');
  return {dt,u,d,R,r,p,basis,n};
}
export function lattice(c, kind='call', style='European', basis='S') {
  if(!['call','put'].includes(kind)||!['European','American'].includes(style)) throw Error('Choose a call or put and European or American exercise.');
  if(style==='American' && basis!=='S') throw Error('Use the S tree for American exercise.');
  const t=terms(c,c.n,basis), nodes=[];
  const root=basis==='G'?c.S*Math.exp(-c.q*c.T):c.S;
  for(let i=c.n;i>=0;i--){
    nodes[i]=[];
    for(let j=0;j<=i;j++){
      const x=root*t.u**(i-j)*t.d**j;
      const S=basis==='G'?x*Math.exp(c.q*(c.T-i*t.dt)):x;
      if(!Number.isFinite(S)||!Number.isFinite(x))throw Error('The stock lattice exceeds the numerical range. Reduce the volatility, maturity, or stock price.');
      const exercise=intrinsic(S,c.K,kind);
      const continuation=i===c.n?null:(t.p*nodes[i+1][j].value+(1-t.p)*nodes[i+1][j+1].value)/t.R;
      const eps=1e-9*Math.max(1,S,c.K);
      const early=i<c.n && style==='American' && exercise>eps && exercise>continuation+eps;
      const tie=i<c.n && style==='American' && exercise>eps && Math.abs(exercise-continuation)<=eps;
      const value=i===c.n?exercise:style==='American'?Math.max(continuation,exercise):continuation;
      nodes[i][j]={i,j,x,S,exercise,continuation,value,early,tie,final:i===c.n&&exercise>eps};
    }
  }
  return {c:{...c},kind,style,basis,t,nodes,root:nodes[0][0].value};
}
export function parityPut(call) {
  if(call.style!=='European') throw Error('Put–call parity equality is for European claims.');
  const {c,t}=call;
  const nodes=call.nodes.map((col,i)=>col.map(n=>{
    const tau=Math.max(0,c.T-i*t.dt);
    const value=n.value-n.S*Math.exp(-c.q*tau)+c.K*Math.exp(-t.r*tau);
    return {...n,value:Math.abs(value)<1e-11?0:value,exercise:intrinsic(n.S,c.K,'put'),early:false,tie:false,final:i===c.n&&intrinsic(n.S,c.K,'put')>1e-9};
  }));
  for(let i=c.n-1;i>=0;i--)for(let j=0;j<=i;j++)nodes[i][j].continuation=(t.p*nodes[i+1][j].value+(1-t.p)*nodes[i+1][j+1].value)/t.R;
  return {...call,kind:'put',nodes,root:nodes[0][0].value,fromParity:true};
}
export function hedge(tree,i,j) {
  const node=tree.nodes[i]?.[j];
  if(!node||i===tree.c.n)return null;
  if(node.early)return {liquidate:true,value:node.value};
  const up=tree.nodes[i+1][j],down=tree.nodes[i+1][j+1],{dt,R}=tree.t;
  // H is today's shares. Reinvested yield increases the shares to H exp(q dt).
  const terminalShares=(up.value-down.value)/(up.S-down.S);
  const H=Math.exp(-tree.c.q*dt)*terminalShares;
  const B=(terminalShares*up.S-up.value)/R;
  const stock=H*node.S,net=stock-B;
  return {H,B,stock,net,terminalShares,liquidate:false,
    up:{stock:terminalShares*up.S,debt:B*R,net:terminalShares*up.S-B*R},
    down:{stock:terminalShares*down.S,debt:B*R,net:terminalShares*down.S-B*R}};
}
export function probabilities(tree){
  let P=[1];
  for(let i=0;i<tree.c.n;i++){
    const next=Array(i+2).fill(0);
    for(let j=0;j<P.length;j++){next[j]+=P[j]*tree.t.p;next[j+1]+=P[j]*(1-tree.t.p);}
    P=next;
  }
  return P.map((prob,j)=>({S:tree.nodes[tree.c.n][j].S,prob,j})).reverse();
}
const N=x=>{
  const a=Math.abs(x),t=1/(1+.2316419*a),density=Math.exp(-a*a/2)/Math.sqrt(2*Math.PI);
  const tail=density*t*(.319381530+t*(-.356563782+t*(1.781477937+t*(-1.821255978+t*1.330274429))));
  return x>=0?1-tail:tail;
};
export function blackScholes(c,kind='call'){
  const {S,K,T,r,q,sigma}=c;
  if(!(S>0&&K>=0&&T>0&&sigma>0))throw Error('Black–Scholes needs positive S, T and volatility, and a nonnegative strike.');
  if(K===0)return kind==='call'?S*Math.exp(-q*T):0;
  const d1=(Math.log(S/K)+(r-q+.5*sigma*sigma)*T)/(sigma*Math.sqrt(T)),d2=d1-sigma*Math.sqrt(T);
  const call=S*Math.exp(-q*T)*N(d1)-K*Math.exp(-r*T)*N(d2);
  return kind==='call'?call:call-S*Math.exp(-q*T)+K*Math.exp(-r*T);
}
export function fastPrice(c,n,style='European',basis=style==='European'?'G':'S'){
  if(style==='American'&&basis!=='S')throw Error('American exercise uses the S tree.');
  const t=terms({...c,manual:false},n,basis),root=basis==='G'?c.S*Math.exp(-c.q*c.T):c.S;
  let v=Array.from({length:n+1},(_,j)=>Math.max(root*t.u**(n-j)*t.d**j-c.K,0));
  if(!v.every(Number.isFinite))throw Error('The lattice exceeds the numerical range. Reduce volatility or maturity.');
  for(let i=n-1;i>=0;i--)for(let j=0;j<=i;j++){
    const cont=(t.p*v[j]+(1-t.p)*v[j+1])/t.R;
    v[j]=style==='American'?Math.max(cont,c.S*t.u**(i-j)*t.d**j-c.K):cont;
  }
  return v[0];
}
export function convergence(c,maxN,style){
  const points=[];
  const ns=new Set(Array.from({length:Math.min(32,maxN)},(_,i)=>i+1));
  for(let n=40;n<=maxN;n+=maxN>512?32:8)ns.add(n);
  ns.add(maxN);
  for(const n of [...ns].sort((a,b)=>a-b)){
    try{points.push({n,value:fastPrice(c,n,style),valid:true});}
    catch(e){points.push({n,value:null,valid:false,message:e.message});}
  }
  return {points,benchmark:blackScholes(c),basis:style==='European'?'G':'S'};
}

// Restricted arithmetic parser; no eval or Function. Powers bind before unary minus.
export function calculate(expression,vars={}){
  let s=expression.trim().replace(/^=/,'').replaceAll('−','-').replaceAll('×','*').replaceAll('÷','/');
  if(!s||s.length>500)throw Error('Enter an expression of 1–500 characters.');
  const tokens=[];let p=0;
  while(p<s.length){
    if(/\s/.test(s[p])){p++;continue;}
    const m=s.slice(p).match(/^(?:(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?|[A-Za-z][A-Za-z0-9_]*|[+\-*/^(),])/i);
    if(!m)throw Error('Use numbers, symbols, + − * / ^ and the listed functions. Enter 5% as 0.05.');
    tokens.push(m[0]);p+=m[0].length;if(tokens.length>200)throw Error('Simplify this expression.');
  }
  let k=0;const funcs={exp:Math.exp,log:Math.log,sqrt:Math.sqrt,abs:Math.abs,min:Math.min,max:Math.max};
  const finite=x=>{if(!Number.isFinite(x))throw Error('The result is not finite. Check division by zero and function domains.');return x;};
  function atom(){
    const token=tokens[k++];if(!token)throw Error('Complete the expression.');
    if(token==='('){const x=add();if(tokens[k++]!==')')throw Error('Close each parenthesis.');return x;}
    if(/^(?:\d|\.)/.test(token))return finite(Number(token));
    if(/^[A-Za-z]/.test(token)){
      if(tokens[k]==='('){
        if(!Object.hasOwn(funcs,token))throw Error('Unknown function '+token+'.');
        k++;const args=[add()];while(tokens[k]===','){k++;args.push(add());if(args.length>8)throw Error('Use at most eight function arguments.');}
        if(tokens[k++]!==')')throw Error('Close each function parenthesis.');
        if(!['min','max'].includes(token)&&args.length!==1)throw Error(token+' needs one argument.');
        return finite(funcs[token](...args));
      }
      if(!Object.hasOwn(vars,token))throw Error('Unknown symbol '+token+'. Use a listed symbol.');
      return finite(vars[token]);
    }
    throw Error('Check the expression near '+token+'.');
  }
  function power(){let x=atom();if(tokens[k]==='^'){k++;x=finite(x**unary());}return x;}
  function unary(){if(tokens[k]==='+'){k++;return unary();}if(tokens[k]==='-'){k++;return -unary();}return power();}
  function mul(){let x=unary();while(tokens[k]==='*'||tokens[k]==='/'){const op=tokens[k++],y=unary();x=finite(op==='*'?x*y:x/y);}return x;}
  function add(){let x=mul();while(tokens[k]==='+'||tokens[k]==='-'){const op=tokens[k++],y=mul();x=finite(op==='+'?x+y:x-y);}return x;}
  const result=finite(add());if(k!==tokens.length)throw Error('Check missing operators or unmatched parentheses.');return result;
}
