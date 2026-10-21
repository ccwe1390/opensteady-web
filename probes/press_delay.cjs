// How much does the result depend on hovering before the press? The shake measurement needs a moment
// of hovering near the target. The benchmark's scripted hand always hovers 0.3 to 0.6 seconds. This
// replays the same hand pressing sooner. No browser. Written by Claude (AI assistant), 2026-10-02.
const R=require('../benchmark/replay.js'),Robot=require('../benchmark/robot.js'),J=require('../extension/core/jitter.js'),protocol=require('../benchmark/protocol.json');
function generate(seed,count,rms,hover){
  const targets=R.layout(),rand=Robot.rng(seed),trials=[];
  for(let i=0;i<count;i++){
    const intended=targets[Math.floor(rand()*targets.length)],trial=Robot.makeTrial(intended,rms,rand,{w:800,h:500},{hover});
    trials.push({id:i,intendedId:intended.id,targets,samples:trial.samples.slice(0,trial.up+1).map((s,j)=>({...s,type:j===trial.down?'down':j===trial.up?'up':'move'}))});
  }
  return trials;
}
const pc=(n,d)=>(100*n/d).toFixed(1).padStart(5)+'%';
console.log('Hover is the time between the end of the reach and the press. "Limit widened" is the share of presses');
console.log('where the meter gave a figure of more than 4 px, so the press limit was more than 12 px.\n');
for(const rms of [8,16]){
  console.log(`RMS ${rms} px, ${protocol.seeds.length*protocol.trialsPerSeed} trials per row`);
  for(const hover of [0,0.05,0.1,0.15,0.2,0.3,0.45,0.6]){
    let n=0,widened=0;const correct={off:0,stable:0},wrong={off:0,stable:0};
    for(const seed of protocol.seeds){
      const trials=generate(seed,protocol.trialsPerSeed,rms,hover);
      for(const trial of trials){const meter=new J.JitterMeter();for(const s of trial.samples){if(s.type==='move')meter.add(s.t,s.x,s.y);else if(s.type==='down'){if(J.limitFor(meter.estimate(s.t))>12)widened++;break;}}n++;}
      for(const mode of ['off','stable']){const row=R.summarize(trials,mode,protocol.selectorOptions);correct[mode]+=row.policy.correct;wrong[mode]+=row.policy.wrong;}
    }
    console.log(`  hover ${hover.toFixed(2)} s   limit widened ${pc(widened,n)}   correct: off ${pc(correct.off,n)}  on ${pc(correct.stable,n)}   wrong: off ${pc(wrong.off,n)}  on ${pc(wrong.stable,n)}`);
  }
  console.log('');
}
console.log('Synthetic paths only. A real hand that presses the instant it arrives gets little or no help from the wider limit.');
