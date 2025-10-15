const fs = require('fs');
const path = require('path');

const IN_PATH = path.join(__dirname, '..', 'har-entries.json');

function load() {
  if (!fs.existsSync(IN_PATH)) {
    console.error('har-entries.json not found. Run scripts/extract_har_entries.js first.');
    process.exit(2);
  }
  return JSON.parse(fs.readFileSync(IN_PATH, 'utf8'));
}

function summarize(entries) {
  const statusCounts = entries.reduce((acc, e) => {
    const s = (e.response && e.response.status) || 'unknown';
    acc[s] = (acc[s] || 0) + 1;
    return acc;
  }, {});

  console.log('Status counts:');
  Object.keys(statusCounts).forEach(k => console.log(`  ${k}: ${statusCounts[k]}`));

  const has200 = statusCounts['200'] > 0;

  if (!has200) {
    console.log('\nNo status 200 entries found. Will summarize 400 (failed) entries structure.');

    const failed = entries.filter(e => e.response && e.response.status === 400);

    // collect key frequencies in request.postData
    const keyFreq = {}; // key -> count
    const playlistIdFormats = {}; // prefix -> count
    const actionsShapes = {};

    failed.forEach(e => {
      const pd = e.request && e.request.postData;
      if (!pd) return;
      if (typeof pd === 'object') {
        Object.keys(pd).forEach(k => { keyFreq[k] = (keyFreq[k] || 0) + 1; });

        if (typeof pd.playlistId === 'string') {
          const p = pd.playlistId;
          const prefix = p.slice(0, 2);
          playlistIdFormats[prefix] = (playlistIdFormats[prefix] || 0) + 1;
        }

        if (Array.isArray(pd.actions)) {
          pd.actions.forEach(action => {
            const k = Object.keys(action).sort().join(',');
            actionsShapes[k] = (actionsShapes[k] || 0) + 1;
          });
        }
      }
    });

    console.log('\nTop request.postData keys frequency (key:count):');
    Object.entries(keyFreq).sort((a,b)=>b[1]-a[1]).slice(0,50).forEach(([k,v])=>console.log(`  ${k}: ${v}`));

    console.log('\nplaylistId prefixes distribution (first 2 chars):');
    Object.entries(playlistIdFormats).sort((a,b)=>b[1]-a[1]).forEach(([k,v])=>console.log(`  ${k}: ${v}`));

    console.log('\nActions shapes frequency (comma-separated keys):');
    Object.entries(actionsShapes).sort((a,b)=>b[1]-a[1]).forEach(([k,v])=>console.log(`  ${k}: ${v}`));

    // show an example failed payload (first)
    console.log('\nExample failed request.postData (first 2 entries):');
    for (let i=0;i<Math.min(2, failed.length); i++) {
      console.log(JSON.stringify(failed[i].request.postData, null, 2).slice(0, 2000));
      console.log('---');
    }

    return;
  }

  // If we have 200s, perform diffs
  const success = entries.find(e => e.response && e.response.status === 200);
  const succeedPd = success.request && success.request.postData;
  if (!succeedPd) {
    console.log('Found status 200 but no postData in success entry. Aborting diff.');
    return;
  }

  console.log('\nFound a success entry. Comparing failed entries against the first success entry...');

  const failed = entries.filter(e => e.response && e.response.status === 400);

  function diff(a, b, path = '') {
    const diffs = [];
    if (typeof a !== typeof b) {
      diffs.push({path, aType: typeof a, bType: typeof b});
      return diffs;
    }
    if (a && b && typeof a === 'object' && !Array.isArray(a)) {
      const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
      keys.forEach(k => {
        const sub = diff(a[k], b[k], path ? `${path}.${k}` : k);
        diffs.push(...sub);
      });
      return diffs;
    }
    if (Array.isArray(a) && Array.isArray(b)) {
      if (a.length !== b.length) {
        diffs.push({path, aLen: a.length, bLen: b.length});
      }
      // shallow compare elements types
      const len = Math.max(a.length, b.length);
      for (let i=0;i<len;i++) {
        diffs.push(...diff(a[i], b[i], `${path}[${i}]`));
      }
      return diffs;
    }
    if (a !== b) {
      diffs.push({path, a, b});
    }
    return diffs;
  }

  const summary = {};
  failed.forEach((f, idx) => {
    const pd = f.request && f.request.postData;
    const d = diff(succeedPd, pd);
    d.forEach(dd => {
      const key = dd.path || '<root>';
      summary[key] = (summary[key] || 0) + 1;
    });
  });

  const sorted = Object.entries(summary).sort((a,b)=>b[1]-a[1]);
  console.log('\nDifferences frequency (path:count) between success.postData and failed.postData:');
  sorted.slice(0,50).forEach(([k,v]) => console.log(`  ${k}: ${v}`));

  // show sample diffs for first few failures
  console.log('\nSample diffs for first 3 failures:');
  failed.slice(0,3).forEach((f, i) => {
    const pd = f.request && f.request.postData;
    const d = diff(succeedPd, pd);
    console.log(`\nFailure #${i+1} diff entries: ${d.length}`);
    console.log(JSON.stringify(d.slice(0,20), null, 2));
  });
}

const entries = load();
console.log(`Loaded ${entries.length} entries from har-entries.json`);
summarize(entries);
