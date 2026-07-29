const TO_ADDRESS = 'lakshgoyal06@gmail.com';

function clean(value, max) {
  if (typeof value !== 'string') return null;
  const s = value.trim();
  if (!s || s.length > max) return null;
  return s;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'method not allowed' });
    return;
  }

  const body = req.body || {};

  // Honeypot: real visitors never fill this field.
  if (body.company) {
    res.status(200).json({ ok: true });
    return;
  }

  const name = clean(body.name, 100);
  const email = clean(body.email, 200);
  const message = clean(body.message, 5000);
  if (!name || !email || !message || !email.includes('@')) {
    res.status(400).json({ error: 'invalid input' });
    return;
  }

  if (!process.env.RESEND_API_KEY) {
    res.status(503).json({ error: 'email not configured' });
    return;
  }

  const send = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Portfolio Inquiry <onboarding@resend.dev>',
      to: [TO_ADDRESS],
      reply_to: email,
      subject: `Portfolio inquiry from ${name.replace(/[\r\n]/g, ' ')}`,
      text: `${message}\n\n— ${name} <${email}>\nSent from the portfolio contact form.`,
    }),
  });

  if (!send.ok) {
    res.status(502).json({ error: 'send failed' });
    return;
  }

  res.status(200).json({ ok: true });
}
