'use strict';
const{test}=require('node:test'),assert=require('node:assert/strict');
const{JitterMeter,limitFor}=require('../extension/core/jitter.js');
function fill(fn,seconds=.6,hz=100){const m=new JitterMeter();for(let i=0;i<=seconds*hz;i++){const t=i/hz,[x,y]=fn(t);m.add(t,x,y);}return m.estimate(seconds);}
test('a still or steadily moving hand measures close to zero',()=>{
  assert.ok(fill(()=>[100,200])<1e-6);
  assert.ok(fill(t=>[100+40*t,200-25*t])<1e-6);
  assert.ok(fill(t=>[100+.4*Math.sin(130*t),200+.4*Math.cos(70*t)])<1);
});
test('a shaking hand measures roughly the size of the shake',()=>{
  for(const amplitude of [4,8,16])for(const hz of [4,5.5,7]){
    const rms=Math.sqrt(amplitude*amplitude/2+amplitude*amplitude/2);
    const value=fill(t=>[300+amplitude*Math.sin(2*Math.PI*hz*t),300+amplitude*Math.sin(2*Math.PI*hz*t+1)]);
    assert.ok(value>.5*rms&&value<1.3*rms,`${amplitude}px at ${hz}Hz gave ${value}`);
  }
});
test('while the pointer is still travelling the answer is unknown, not shake',()=>{
  const reach=t=>{const u=Math.min(1,t/.4),s=10*u**3-15*u**4+6*u**5;return[300*s,0];};
  assert.equal(fill(reach,.4),0);
  assert.equal(fill(t=>{const[x]=reach(t);return[x+8*Math.sin(2*Math.PI*5.5*t),6*Math.sin(2*Math.PI*5.5*t+1)];},.4),0);
});
test('too little history, a short span, bad numbers and time running backwards give no estimate',()=>{
  const m=new JitterMeter();assert.equal(m.estimate(1),0);
  for(let i=0;i<5;i++)m.add(i/100,i%2*20,0);assert.equal(m.estimate(.05),0);
  const n=new JitterMeter();for(let i=0;i<30;i++)n.add(i/1000,i%2*20,0);assert.equal(n.estimate(.03),0);
  const k=new JitterMeter();for(let i=0;i<40;i++)k.add(i/100,i%2*20,0);assert.ok(k.estimate(.39)>5);
  k.add(NaN,1,1);k.add(.1,0,0);assert.equal(k.samples.length,1);assert.equal(k.estimate(.1),0);
  assert.equal(k.estimate(5),0);
});
test('history is bounded',()=>{
  const m=new JitterMeter();for(let i=0;i<5000;i++)m.add(i/1000,i%3,i%5);assert.ok(m.samples.length<=512);assert.ok(m.samples[m.samples.length-1].t-m.samples[0].t<=0.6+1e-9,'nothing older than twice the window is kept');
  const dense=new JitterMeter();for(let i=0;i<5000;i++)dense.add(i/100000,i%3,i%5);assert.ok(dense.samples.length<=512);
});
test('the limit never drops below the base and never exceeds the cap',()=>{
  assert.equal(limitFor(0),12);assert.equal(limitFor(NaN),12);assert.equal(limitFor(-3),12);assert.equal(limitFor(2),12);
  assert.equal(limitFor(8),24);assert.equal(limitFor(100),48);assert.equal(limitFor(8,{gain:2,base:10,max:20}),16);
});
test('the residual variance matches an independent least squares fit, with n minus 3 in the divisor',()=>{
  const {residualVariance}=require('../extension/core/jitter.js');
  // Independent fit: orthogonalise 1, u, u^2 by Gram-Schmidt and subtract the projections.
  function independent(us,ys){
    const n=us.length,basis=[us.map(()=>1),us.slice(),us.map(u=>u*u)],dot=(a,b)=>a.reduce((sum,v,i)=>sum+v*b[i],0),q=[];
    for(const v of basis){let w=v.slice();for(const o of q){const k=dot(w,o)/dot(o,o);w=w.map((x,i)=>x-k*o[i]);}q.push(w);}
    let r=ys.slice();for(const o of q){const k=dot(r,o)/dot(o,o);r=r.map((x,i)=>x-k*o[i]);}
    return dot(r,r)/(n-3);
  }
  let seed=7;const rand=()=>(seed=(seed*1103515245+12345)%2147483648)/2147483648;
  for(let round=0;round<50;round++){
    const n=8+Math.floor(rand()*30),us=Array.from({length:n},(_,i)=>(i+rand()*.5)/n),ys=us.map(u=>300+40*u-25*u*u+6*Math.sin(40*u)+rand());
    const got=residualVariance(us,ys),want=independent(us,ys);assert.ok(Math.abs(got-want)<=1e-6*Math.max(1,want),`${got} vs ${want}`);
  }
  // An exact quadratic leaves nothing over, even far from the origin.
  const us=Array.from({length:20},(_,i)=>i/19);assert.ok(residualVariance(us,us.map(u=>3800+90*u-45*u*u))<1e-9);
});
test('the limit is continuous: no jump where it starts to grow',()=>{
  const {limitFor}=require('../extension/core/jitter.js');
  for(let j=0;j<=20;j+=0.01){const a=limitFor(j),b=limitFor(j+0.01);assert.ok(b-a<=0.031,`jump at ${j.toFixed(2)}: ${a} to ${b}`);}
  assert.equal(limitFor(3.99),12);assert.equal(limitFor(4.5),13.5);assert.equal(limitFor(16),48);assert.equal(limitFor(17),48);
});
test('for the rules about selected text a hand is steady under 2 px, or when its shake is unknown',()=>{
  const {isSteady}=require('../extension/core/jitter.js');
  assert.equal(isSteady(0),true,'unknown');assert.equal(isSteady(0.1),true);assert.equal(isSteady(1.99),true);
  assert.equal(isSteady(2),false);assert.equal(isSteady(3.3),false,'mild tremor is not steady');assert.equal(isSteady(NaN),true);
  assert.equal(isSteady(2.5,{below:3}),true);assert.equal(isSteady(3,{below:3}),false);
});
