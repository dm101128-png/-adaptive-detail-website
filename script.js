(function () {
  const toggle = document.querySelector('.menu-toggle');
  const menu = document.getElementById('site-menu');
  if (toggle && menu) {
    toggle.addEventListener('click', function () {
      const open = toggle.getAttribute('aria-expanded') === 'true';
      toggle.setAttribute('aria-expanded', String(!open));
      menu.classList.toggle('is-open', !open);
    });
  }

  const grid = document.getElementById('calendar-grid');
  const dateInput = document.getElementById('mobile-date');
  if (grid && dateInput) {
    const label = document.getElementById('calendar-month-label');
    const selectedLabel = document.getElementById('calendar-selected-label');
    const prev = document.getElementById('calendar-prev');
    const next = document.getElementById('calendar-next');
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const bookingStart = new Date(2026, 8, 21);
    const min = today > bookingStart ? today : bookingStart;
    const max = new Date(min); max.setMonth(max.getMonth() + 6);
    const available = d => (d.getDay() === 1 || d.getDay() === 4) && d >= min && d <= max;
    const value = d => [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-');
    const dayName = new Intl.DateTimeFormat('en-US', { weekday:'long', month:'long', day:'numeric' });
    const monthName = new Intl.DateTimeFormat('en-US', { month:'long', year:'numeric' });
    let selected = new Date(min); while (!available(selected)) selected.setDate(selected.getDate() + 1);
    let year = selected.getFullYear(), month = selected.getMonth(); dateInput.value = value(selected);
    function render() {
      grid.innerHTML = ''; const first = new Date(year, month, 1); label.textContent = monthName.format(first);
      for (let i = 0; i < first.getDay(); i++) grid.appendChild(document.createElement('span'));
      const count = new Date(year, month + 1, 0).getDate();
      for (let n = 1; n <= count; n++) {
        const d = new Date(year, month, n), button = document.createElement('button'), ok = available(d), chosen = value(d) === value(selected);
        button.type = 'button'; button.textContent = n; button.disabled = !ok; button.className = 'calendar-day day-cell' + (ok ? ' available' : '') + (chosen ? ' selected' : '');
        button.setAttribute('aria-label', dayName.format(d) + (ok ? '' : ', unavailable'));
        if (ok) button.addEventListener('click', () => { selected = d; dateInput.value = value(d); render(); });
        grid.appendChild(button);
      }
      selectedLabel.textContent = 'Selected date: ' + dayName.format(selected);
      prev.disabled = new Date(year, month, 0) < new Date(min.getFullYear(), min.getMonth(), 1);
      next.disabled = new Date(year, month + 1, 1) > max;
    }
    prev.addEventListener('click', () => { month--; if (month < 0) { month = 11; year--; } render(); });
    next.addEventListener('click', () => { month++; if (month > 11) { month = 0; year++; } render(); });
    const mobileForm = dateInput.closest('form');
    if (mobileForm) mobileForm.addEventListener('reset', () => setTimeout(() => { dateInput.value = value(selected); render(); }, 0));
    render();
  }

  const serviceMap = { exterior:'Basic Exterior Detail', interior:'Basic Interior Detail', full:'Full Detail', deluxe:'Deluxe Detail', coating:'Ceramic Coating', paint:'Paint Correction' };
  const requestedService = new URLSearchParams(window.location.search).get('service');
  const serviceSelect = document.querySelector('#inquiry-form select[name="requestedService"]');
  if (serviceSelect && serviceMap[requestedService]) serviceSelect.value = serviceMap[requestedService];

  const saturdaySelect = document.getElementById('saturday-date');
  if (saturdaySelect) {
    const start = new Date(); start.setHours(0, 0, 0, 0);
    while (start.getDay() !== 6) start.setDate(start.getDate() + 1);
    const formatter = new Intl.DateTimeFormat('en-US', { weekday:'long', month:'long', day:'numeric', year:'numeric' });
    for (let week = 0; week < 26; week += 1) {
      const date = new Date(start); date.setDate(start.getDate() + week * 7);
      const option = document.createElement('option');
      option.value = [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-');
      option.textContent = formatter.format(date);
      saturdaySelect.appendChild(option);
    }
  }

  async function compressedPhoto(file) {
    if (!file || file.size <= 1500000 || typeof createImageBitmap !== 'function') return file;
    const image = await createImageBitmap(file);
    const scale = Math.min(1, 1280 / Math.max(image.width, image.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(image.width * scale); canvas.height = Math.round(image.height * scale);
    canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', .72)); image.close();
    return blob ? new File([blob], file.name.replace(/\.[^.]+$/, '') + '.jpg', { type:'image/jpeg' }) : file;
  }

  document.querySelectorAll('#mobile-booking-form, #inquiry-form').forEach(function (form) {
    form.addEventListener('submit', async function (event) {
      event.preventDefault(); const button = form.querySelector('button[type="submit"]'); const note = form.querySelector('.form-note'); const original = button.innerHTML;
      button.disabled = true; button.textContent = 'Sending…'; note.textContent = 'Securely sending your request…';
      try { const data = new FormData(form); const photo = data.get('photo'); if (photo instanceof File && photo.size) data.set('photo', await compressedPhoto(photo)); const response = await fetch('/api/leads', { method:'POST', body:data }); const result = await response.json().catch(() => ({})); if (!response.ok || !result.ok) throw new Error(result.error || 'Your request could not be sent.'); note.textContent = 'Request received. We’ll contact you shortly to confirm.'; form.reset(); }
      catch (error) { note.textContent = error.message || 'Please call or text (817) 454-2860.'; }
      finally { button.disabled = false; button.innerHTML = original; }
    });
  });
}());
