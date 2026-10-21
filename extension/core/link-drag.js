/*
 * Quick drag guard. A browser turns a press on a link, or on selected text, into a drag as soon
 * as the pointer moves a few pixels, and then no click happens. This remembers one press so the
 * controller can cancel a drag that starts quickly, and later judge the click that follows.
 * `near` marks a press that landed beside the outlined target, not on it.
 *
 * It does not infer whether motion is tremor. The only test is time: a drag that begins within
 * `quickSeconds` of the press is treated as a slip. Press, wait, then drag still drags.
 */
(function(root) {
  'use strict';
  class LinkDragPolicy {
    constructor(opts={}) { this.quickSeconds=opts.quickSeconds??0.5;this.reset(); }
    reset() { this.press=null; }
    begin(e) {
      this.reset();
      if(e.id===null||e.id===undefined||![e.t,e.x,e.y].every(Number.isFinite))return;
      this.press={t:e.t,id:e.id,pointerId:e.pointerId,near:e.near===true,x:e.x,y:e.y,maxDistance:0,upT:null,cancelled:false,bypassed:false};
    }
    // The record keeps its own account of how far the press went and when it ended, so the click
    // that follows a cancelled drag can still be judged if the gesture policy was reset in between.
    move(x,y) {
      const p=this.press;
      if(p&&Number.isFinite(x)&&Number.isFinite(y))p.maxDistance=Math.max(p.maxDistance,Math.hypot(x-p.x,y-p.y));
    }
    release(t,x,y) { this.move(x,y);if(this.press&&Number.isFinite(t))this.press.upT=t; }
    // A modifier key went down during the press: leave this drag to the browser.
    bypass() { if(this.press)this.press.bypassed=true; }
    canCancel(t,id) {
      const p=this.press;
      return !!p&&!p.bypassed&&!p.cancelled&&id===p.id&&Number.isFinite(t)&&t>=p.t&&t-p.t<=this.quickSeconds;
    }
    markCancelled() { if(this.press)this.press.cancelled=true; }
    // Forget an ordinary press. Keep a press whose drag we cancelled, so its click can still be judged.
    abort() { if(!this.press?.cancelled)this.reset(); }
    // The click handler takes the record exactly once.
    take() { const p=this.press;this.reset();return p; }
  }
  const api={LinkDragPolicy};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  else root.OpenSteadyLinkDrag=api;
})(typeof globalThis!=='undefined'?globalThis:this);
