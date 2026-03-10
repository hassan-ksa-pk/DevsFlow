const fs = require('fs');

function parseEnvFile(path) {
  const out = {};
  const lines = fs.readFileSync(path, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    if (!line || line.trim().startsWith('#')) continue;
    const idx = line.indexOf('=');
    if (idx === -1) continue;
    const k = line.slice(0, idx).trim();
    let v = line.slice(idx + 1).trim();
    if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1);
    out[k] = v;
  }
  return out;
}

(async () => {
  const env = parseEnvFile('.env');
  const url = env.VITE_SUPABASE_URL + '/functions/v1/bot-chat';
  const key = env.VITE_SUPABASE_PUBLISHABLE_KEY;
  console.log('url', url);
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      apikey: key,
      authorization: 'Bearer ' + key,
    },
    body: JSON.stringify({
      message: 'ping',
      assistant_mode: true,
      assistant_provider: 'groq',
      assistant_model: 'llama-3.3-70b-versatile',
    }),
  });
  console.log('status', res.status);
  const text = await res.text();
  console.log(text.slice(0, 800));
})();
