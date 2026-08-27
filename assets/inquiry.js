/* Shared by index.html and freelance.html: posts to /api/inquiry. */
(function initInquiry() {
  const form = document.getElementById('inquiry');
  const note = document.getElementById('inquiry-note');
  if (!form) return;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(form));
    if (!data.name?.trim() || !data.email?.trim() || !data.message?.trim()) {
      note.className = 'f-note err';
      note.textContent = 'All three fields are needed.';
      return;
    }
    const btn = form.querySelector('.f-send');
    btn.disabled = true;
    note.className = 'f-note';
    note.textContent = 'Sending…';
    try {
      const r = await fetch('/api/inquiry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!r.ok) throw new Error('send failed');
      note.className = 'f-note ok';
      note.textContent = "Sent. I'll get back to you soon.";
      form.reset();
    } catch (err) {
      btn.disabled = false;
      note.className = 'f-note err';
      note.innerHTML = 'Couldn\'t send just now. Email me directly: <a href="mailto:lakshgoyal06@gmail.com">lakshgoyal06@gmail.com</a>';
    }
  });
})();
