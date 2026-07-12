// PayFast ITN relay — receives PayFast's payment notifications on tafxportal.com
// and forwards them (raw, untouched) to the Supabase pm-payfast function, which
// verifies the signature and applies the payment. Runs as a Vercel serverless function.

const UPSTREAM = 'https://sicegpbjpulqbomkrrtn.supabase.co/functions/v1/pm-payfast';
const ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNpY2VncGJqcHVscWJvbWtycnRuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMxNjAzNzcsImV4cCI6MjA5ODczNjM3N30.gVcFzYWcBq_C8INPC7u7VIszFFuSR4dOZYbinrrLt5s';

export const config = { api: { bodyParser: false } };

function readRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') { res.status(405).send('Method not allowed'); return; }
  try {
    const raw = await readRawBody(req);
    const upstream = await fetch(UPSTREAM, {
      method: 'POST',
      headers: {
        'Content-Type': req.headers['content-type'] || 'application/x-www-form-urlencoded',
        Authorization: `Bearer ${ANON_KEY}`,
        apikey: ANON_KEY,
      },
      body: raw,
    });
    const text = await upstream.text();
    res.status(upstream.status).send(text || 'OK');
  } catch (e) {
    console.error('ITN relay error', e);
    res.status(500).send('relay error');
  }
}
