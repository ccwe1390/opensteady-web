// What does measuring shake buy, and does the choice of selector matter? Analysis on the build's own
// synthetic benchmark. No browser. Nothing here ships. Written by Claude (AI assistant), 2026-10-02.
const R=require('../benchmark/replay.js'),P=require('../extension/core/policy.js'),J=require('../extension/core/jitter.js'),protocol=require('../benchmark/protocol.json');
function replay(trial,mode,scaled){
  const selector=R.selectorFor(mode,protocol.selectorOptions),policy=new P.ClickPolicy({doubleGuard:false}),meter=new J.JitterMeter();
  let selected=null,previewSince=0,previous=null,downHit=null,final=null;
  for(const e of trial.samples){
    const physical=R.hit(trial.targets,e.x,e.y);
    if(e.type!=='up'&&!policy.press){selected=mode==='off'?physical:selector.update(e.t,e.x,e.y,trial.targets);if(selected!==previous){previewSince=e.t;previous=selected;}}
    if(e.type==='down'){downHit=physical;
      // scaled: the shipped rule. Not scaled: the press limit stays at 12 px however much the pointer shook.
      policy.down({...e,button:0,pointerType:'mouse',pointerId:1,hitId:physical,selectedId:selected,canRedirect:mode!=='off',previewAge:e.t-previewSince,
        slipLimit:scaled?J.limitFor(meter.estimate(e.t)):undefined});}
    else if(e.type==='move'){if(!policy.press)meter.add(e.t,e.x,e.y);policy.move(e);}
    else{policy.up({...e,pointerId:1,hitId:physical});const native=downHit!==null&&downHit===physical?downHit:null;
      if(mode==='off')final=native;else{const c=policy.click({...e,t:e.t+0.001,button:0,detail:1,pointerType:'mouse',hitId:native,bypass:false,canRedirect:true,safe:true});final=c.action==='redirect'?c.id:native;}}
  }
  return final===null?'miss':final===trial.intendedId?'correct':'wrong';
}
const variants=[['extension off','off',false],
  ['press limit fixed at 12 px, steady selector','stable',false],
  ['shipped rule (limit scales with shake), steady selector','stable',true],
  ['press limit fixed at 12 px, nearest selector','nearest',false],
  ['shipped rule (limit scales with shake), nearest selector','nearest',true]];
for(const rms of protocol.rmsPx){
  const trials=[];for(const seed of protocol.seeds)trials.push(...R.generate(seed,protocol.trialsPerSeed,rms).trials);
  console.log(`\nRMS ${rms} px, ${trials.length} trials`);
  for(const [name,mode,scaled] of variants){const t={correct:0,wrong:0,miss:0};for(const tr of trials)t[replay(tr,mode,scaled)]++;
    const pc=k=>String(t[k]).padStart(5)+' ('+(100*t[k]/trials.length).toFixed(1).padStart(5)+'%)';
    console.log('  '+name.padEnd(58)+'correct '+pc('correct')+'  wrong '+pc('wrong')+'  miss '+pc('miss'));}
}
console.log('\nSynthetic paths only. The replay cannot model the browser turning a moving press into a drag, or text selection.');
