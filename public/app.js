/* =====================================
   МАМАПЛЮС — РАБОТА САЙТА
   ===================================== */

const $ = (selector) => document.querySelector(selector);

const esc = (value) =>
  String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[char]);

function setText(selector, value) {
  const element = $(selector);
  if (element) element.textContent = value ?? '';
}

/* ЗАГРУЗКА ИНФОРМАЦИИ О СТУДИИ */

async function loadSite() {
  try {
    const response = await fetch('/api/site');

    if (!response.ok) {
      throw new Error('Не удалось загрузить информацию');
    }

    const site = await response.json();

    setText('#intro', site.intro);
    setText('#description', site.description);
    setText('#city', site.city);
    setText('#contactEmail', site.email);
    setText('#contactPhone', site.phone);
    setText('#scheduleNote', site.scheduleNote);

    const advantages = $('#advantages');

    if (advantages) {
      advantages.innerHTML = (site.advantages || [])
        .map(item => `<li>${esc(item)}</li>`)
        .join('');
    }

    const programs = $('#programs');

    if (programs) {
      programs.innerHTML = (site.services || [])
        .map(item => `
          <article class="service">
            <div class="service-icon">${esc(item.icon || '♡')}</div>
            <h3>${esc(item.title)}</h3>
            <p>${esc(item.desc)}</p>
          </article>
        `)
        .join('');
    }

    const programSelect = $('#program');

    if (programSelect) {
      programSelect.innerHTML =
        '<option value="">Выберите занятие</option>' +
        (site.services || [])
          .map(item =>
            `<option value="${esc(item.title)}">${esc(item.title)}</option>`
          )
          .join('');
    }

    const schedule = $('#scheduleList');

    if (schedule) {
      schedule.innerHTML = (site.schedule || [])
        .map(item => `
          <article class="schedule-item">
            <b>${esc(item.day)} · ${esc(item.time)}</b>
            <span>${esc(item.title)}</span>
          </article>
        `)
        .join('');
    }

  } catch (error) {
    console.error('Ошибка загрузки сайта:', error);
    setText('#intro', 'Добро пожаловать в студию «МамаПлюс»!');
  }
}

/* МОБИЛЬНОЕ МЕНЮ */

const menu = $('#menu');

if (menu) {
  menu.addEventListener('click', () => {
    const nav = $('#nav');
    if (nav) nav.classList.toggle('open');
  });
}

/* ТЕКУЩИЙ ГОД */

setText('#year', new Date().getFullYear());

/* ФОРМА ЗАПИСИ */

const bookingForm = $('#bookingForm');

if (bookingForm) {
  bookingForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const form = event.currentTarget;
    const message = $('#formMessage');
    const submitButton = form.querySelector('button[type="submit"]');

    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    const consent = form.elements.consent;

    if (consent && !consent.checked) {
      if (message) {
        message.textContent = 'Пожалуйста, подтвердите согласие на обработку данных.';
      }
      return;
    }

    const data = Object.fromEntries(new FormData(form));
    data.consent = consent ? consent.checked : false;

    if (message) {
      message.textContent = 'Отправляем вашу заявку…';
    }

    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = 'Отправка…';
    }

    try {
      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });

      let result;

      try {
        result = await response.json();
      } catch {
        throw new Error('Сервер вернул некорректный ответ. Попробуйте позже.');
      }

      if (!response.ok) {
        throw new Error(
          result.error || 'Не удалось отправить заявку. Попробуйте ещё раз.'
        );
      }

      if (message) {
        message.textContent =
          result.message ||
          'Спасибо! Ваша заявка отправлена. Мы свяжемся с вами для подтверждения записи.';
      }

      form.reset();

    } catch (error) {
      console.error('Ошибка отправки заявки:', error);

      if (message) {
        message.textContent =
          error.message || 'Ошибка отправки. Пожалуйста, попробуйте позже.';
      }

    } finally {
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = 'Записаться';
      }
    }
  });
}

/* ЗАПУСК */

loadSite();
