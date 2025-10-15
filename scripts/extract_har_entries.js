const fs = require('fs');
const path = require('path');

// 入力 HAR ファイルと出力 JSON
const HAR_PATH = path.join(__dirname, '..', 'music.youtube.com.har');
const OUT_PATH = path.join(__dirname, '..', 'har-entries.json');

function safeParseJSON(str) {
  try {
    return JSON.parse(str);
  } catch (e) {
    return null;
  }
}

function extract() {
  if (!fs.existsSync(HAR_PATH)) {
    console.error(`HAR file not found: ${HAR_PATH}`);
    process.exit(2);
  }

  const raw = fs.readFileSync(HAR_PATH, 'utf8');
  let har;
  try {
    har = JSON.parse(raw);
  } catch (e) {
    console.error('Failed to parse HAR as JSON:', e.message);
    process.exit(2);
  }

  if (!har.log || !Array.isArray(har.log.entries)) {
    console.error('Invalid HAR structure: missing log.entries');
    process.exit(2);
  }

  const entries = har.log.entries.map((entry) => {
    const req = entry.request || {};
    const res = entry.response || {};

    // postData.text may be missing; attempt to extract body from req.postData.text
    let requestBody = null;
    if (req.postData && typeof req.postData.text === 'string') {
      requestBody = safeParseJSON(req.postData.text) || req.postData.text;
    }

    // response content
    let responseBody = null;
    if (res.content && typeof res.content.text === 'string') {
      responseBody = safeParseJSON(res.content.text) || res.content.text;
    }

    return {
      startedDateTime: entry.startedDateTime,
      time: entry.time,
      request: {
        method: req.method,
        url: req.url,
        headers: req.headers,
        mimeType: req.headers ? (req.headers.find(h => h.name.toLowerCase() === 'content-type') || {}).value : undefined,
        postData: requestBody,
      },
      response: {
        status: res.status,
        statusText: res.statusText,
        headers: res.headers,
        mimeType: res.content ? res.content.mimeType : undefined,
        content: responseBody,
      },
    };
  });

  // Filter to only browse/edit_playlist entries for easier analysis
  const filtered = entries.filter(e => typeof e.request.url === 'string' && e.request.url.includes('/youtubei/v1/browse/edit_playlist'));

  fs.writeFileSync(OUT_PATH, JSON.stringify(filtered, null, 2), 'utf8');
  console.log(`Wrote ${filtered.length} entries to ${OUT_PATH}`);
}

extract();
