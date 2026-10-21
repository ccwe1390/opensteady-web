// How well does the shake meter read a hovering hand that shakes at different speeds? No browser.
// A pointer hovers and shakes as a sine wave of known size. The meter is asked at 200 different moments.
// Written by Claude (AI assistant), 2026-10-02.
const J=require('../extension/core/jitter.js');
const HZ=60;                                   // pointer events arrive about once a frame
console.log('Shake as a sine wave on both axes, sampled '+HZ+' times a second, whole pixels, no travel.');
console.log('"unknown" is how often the meter declined to answer. "reads" is its answer as a share of the true size.\n');
for(const rms of [8,16]){
  console.log(`True shake ${rms} px RMS`);
  for(const f of [3,4,5,6,8,10,12]){
    let unknown=0;const ratios=[];
    for(let k=0;k<200;k++){
      const phase=2*Math.PI*k/200,meter=new J.JitterMeter(),end=1+k/200;
      // Each axis is a sine of amplitude a, so each has RMS a / sqrt(2), and the two together have RMS a.
      const a=rms;
      for(let i=0;i/HZ<=end;i++){const t=i/HZ;meter.add(t,Math.round(500+a*Math.sin(2*Math.PI*f*t+phase)),Math.round(300+a*Math.sin(2*Math.PI*f*t+phase+1.3)));}
      const v=meter.estimate(end);if(v===0)unknown++;else ratios.push(v/rms);
    }
    ratios.sort((x,y)=>x-y);const q=p=>ratios.length?ratios[Math.min(ratios.length-1,Math.floor(p*ratios.length))].toFixed(2):' n/a';
    console.log(`  ${String(f).padStart(2)} Hz   unknown ${String(Math.round(100*unknown/200)).padStart(3)}%   reads ${q(.1)} to ${q(.9)} of the true size (middle ${q(.5)})`);
  }
  console.log('');
}
