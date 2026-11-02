
const API = 'https://mamaplus-server.onrender.com';

let site = null;

const $ = s => document.querySelector(s);

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
}[c]));

async function api(url, opts = {}) {
  const r = await fetch(`${API}${url}`, {
    ...opts,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(opts.headers || {})
    }
  });

  const j = await r.json();

  if (!r.ok) throw Error(j.error || 'Ошибка');

  return j;
}

$('#loginForm').onsubmit = async e => {
  e.preventDefault();

  try {
    await api('/api/admin/login', {
      method: 'POST',
      body: JSON.stringify({
        password: new FormData(e.target).get('password')
      })
    });

    await start();
  } catch (x) {
    $('#loginMsg').textContent = x.message;
  }
};

async function start() {
  try {
    const d = await api('/api/admin/data');

    site = d.settings;

    $('#login').hidden = true;
    $('#dashboard').hidden = false;

    renderContent();
    renderSchedule();
    renderBookings(d.bookings);
  } catch (e) {
    $('#loginMsg').textContent = e.message;
  }
}

function renderContent() {
  const fields = [
    ['studioName', 'Название студии'],
    ['tagline', 'Подзаголовок'],
    ['city', 'Адрес / город'],
    ['phone', 'Телефон'],
    ['email', 'Email'],
    ['intro', 'Фраза на первом экране'],
    ['description', 'Описание на первом экране'],
    ['scheduleNote', 'Примечание к расписанию']
  ];

  const main = fields.map(([k, l]) =>
    `<label>${l}<textarea data-key="${k}" rows="${k === 'description' ? 3 : 1}">${esc(site[k])}</textarea></label>`
  ).join('');

  const services = (site.services || []).map((x, i) => `
    <div class="panel">
      <label>Название<input data-service="${i}" data-field="title" value="${esc(x.title)}"></label>
      <label>Описание<input data-service="${i}" data-field="desc" value="${esc(x.desc)}"></label>
      <label>Иконка<input data-service="${i}" data-field="icon" value="${esc(x.icon)}"></label>
      <label>Стоимость / примечание<input data-service="${i}" data-field="price" value="${esc(x.price)}"></label>
    </div>
  `).join('');

  $('#contentFields').innerHTML = `
    <div class="field-grid">${main}</div>
    <h3>Преимущества (по одному на строку)</h3>
    <textarea id="advantages" rows="5">${esc((site.advantages || []).join('\n'))}</textarea>
    <h3>Направления</h3>
    <div id="servicesFields">${services}</div>
  `;
}

function renderSchedule() {
  $('#scheduleFields').innerHTML = (site.schedule || []).map((x, i) => `
    <div class="row">
      <input placeholder="День" data-i="${i}" data-f="day" value="${esc(x.day)}">
      <input placeholder="Время" data-i="${i}" data-f="time" value="${esc(x.time)}">
      <input placeholder="Занятие" data-i="${i}" data-f="title" value="${esc(x.title)}">
      <button type="button" data-remove="${i}">Удалить</button>
    </div>
  `).join('');

  document.querySelectorAll('[data-remove]').forEach(b => {
    b.onclick = () => {
      site.schedule.splice(+b.dataset.remove, 1);
      renderSchedule();
    };
  });
}

function renderBookings(list) {
  $('#bookingList').innerHTML = list.length
    ? list.map(b => `
      <article class="booking">
        <b>${esc(b.name)} — ${esc(b.program)}</b>
        <p>${esc(b.date)} в ${esc(b.time)} · ${esc(b.phone)}</p>
        <p>Возраст малыша: ${esc(b.childAge || '—')} · ${esc(b.comment || '')}</p>
        <small>Создана: ${new Date(b.createdAt).toLocaleString('ru-RU')}</small>
        <p>
          Статус:
          <select data-status="${esc(b.id)}">
            ${['Новая', 'Подтверждена', 'Отменена'].map(s =>
              `<option ${b.status === s ? 'selected' : ''}>${s}</option>`
            ).join('')}
          </select>
        </p>
      </article>
    `).join('')
    : '<p>Заявок пока нет.</p>';

  document.querySelectorAll('[data-status]').forEach(s => {
    s.onchange = async () => {
      try {
        await api('/api/admin/bookings/' + s.dataset.status, {
          method: 'PATCH',
          body: JSON.stringify({ status: s.value })
        });
      } catch (e) {
        alert(e.message);
      }
    };
  });
}

$('#saveContent').onclick = async () => {
  document.querySelectorAll('[data-key]').forEach(x => {
    site[x.dataset.key] = x.value;
  });

  site.advantages = $('#advantages').value
    .split('\n')
    .map(x => x.trim())
    .filter(Boolean);

  document.querySelectorAll('[data-service]').forEach(x => {
    site.services[+x.dataset.service][x.dataset.field] = x.value;
  });

  try {
    await api('/api/admin/settings', {
      method: 'PUT',
      body: JSON.stringify(site)
    });

    $('#saveMsg').textContent = 'Сохранено!';
  } catch (e) {
    $('#saveMsg').textContent = e.message;
  }
};

$('#addSchedule').onclick = () => {
  site.schedule.push({ day: '', time: '', title: '' });
  renderSchedule();
};

$('#saveSchedule').onclick = async () => {
  document.querySelectorAll('[data-i]').forEach(x => {
    site.schedule[+x.dataset.i][x.dataset.f] = x.value;
  });

  try {
    await api('/api/admin/settings', {
      method: 'PUT',
      body: JSON.stringify(site)
    });

    alert('Расписание сохранено');
  } catch (e) {
    alert(e.message);
  }
};

document.querySelectorAll('[data-tab]').forEach(b => {
  b.onclick = () => {
    document.querySelectorAll('.tab').forEach(x => {
      x.hidden = true;
    });

    $('#' + b.dataset.tab).hidden = false;
  };
});

$('#logout').onclick = async () => {
  try {
    await api('/api/admin/logout', { method: 'POST' });
    location.reload();
  } catch (e) {
    alert(e.message);
  }
};
