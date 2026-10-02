#!/usr/bin/env node
'use strict';
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const R = require('./replay.js'), protocol = require('./protocol.json');
const args = process.argv.slice(2);
function arg(name, fallback) { const i = args.indexOf(name); return i < 0 ? fallback : args[i+1]; }
const out = path.resolve(arg('--out',path.join(__dirname,'../results/benchmark.json')));
const input = arg('--trace',null);
const count = Number(arg('--trials',protocol.trialsPerSeed));
if (!Number.isInteger(count) || count < 1 || count > 10000) throw new Error('--trials must be 1..10000');
const hashes = {};
for (const file of ['extension/core/selector.js','extension/core/policy.js','benchmark/protocol.json','benchmark/replay.js','benchmark/robot.js']) {
  hashes[file] = crypto.createHash('sha256').update(fs.readFileSync(path.join(__dirname,'..',file))).digest('hex');
}
const report = { schemaVersion:1,generatedAt:new Date().toISOString(),runtime:process.version,platform:process.platform,
  source:input?'trace-replay':'synthetic',protocol,hashes,browser:null,rows:[],limits:protocol.limits };
if (input) {
  if (fs.statSync(input).size > 25*1024*1024) throw new Error('Trace exceeds 25 MiB');
  const data = R.validateTrace(JSON.parse(fs.readFileSync(input,'utf8')));
  report.traceSource = data.source; report.inputSHA256 = crypto.createHash('sha256').update(fs.readFileSync(input)).digest('hex');
  for(const mode of protocol.modes) report.rows.push(R.summarize(data.trials,mode,protocol.selectorOptions));
} else for(const rms of protocol.rmsPx) for(const seed of protocol.seeds) {
  const data = R.validateTrace(R.generate(seed,count,rms));
  for(const mode of protocol.modes) report.rows.push({rms,seed,...R.summarize(data.trials,mode,protocol.selectorOptions)});
}
fs.mkdirSync(path.dirname(out),{recursive:true}); fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n');
const pct = (n,d) => (100*n/d).toFixed(1);
const lines = ['# Development replay results','',`Generated: ${report.generatedAt}. Runtime: ${report.runtime} (${report.platform}).`,`Source: ${report.source}. Browser: not used.`,
  '', 'Synthetic replay is not evidence of benefit for people with tremor. No competing extension was tested.', '',
  '| RMS | Seed | Mode | Trials | Policy correct % | Policy wrong % | Policy miss % | Selector correct % | Selector wrong % | p99 ms |',
  '|---:|---:|---|---:|---:|---:|---:|---:|---:|---:|'];
for(const row of report.rows) {
  lines.push(`| ${row.rms??'trace'} | ${row.seed??'—'} | ${row.mode} | ${row.n} | ${pct(row.policy.correct,row.n)} | ${pct(row.policy.wrong,row.n)} | ${pct(row.policy.miss,row.n)} | ${pct(row.selector.correct,row.n)} | ${pct(row.selector.wrong,row.n)} | ${row.timingMs.p99.toFixed(4)} |`);
  console.log(`${row.rms??'trace'} ${row.seed??''} ${row.mode}: correct=${pct(row.policy.correct,row.n)} wrong=${pct(row.policy.wrong,row.n)} miss=${pct(row.policy.miss,row.n)}`);
}
lines.push('', 'Policy columns model the conservative gesture rules: a native click on another control is never reassigned. Selector columns are a separate algorithm experiment. The model does not execute browser events.', '', 'Complete counts, per-trial paired outcomes, confidence intervals, and source hashes are in the adjacent JSON file. Timing is local runtime timing, not a browser latency measurement.');
fs.writeFileSync(out.replace(/\.json$/,'')+'.md',lines.join('\n')+'\n');
console.log('Saved '+out);
