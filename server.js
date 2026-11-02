
const express = require('express');
const session = require('express-session');
const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

const DATA = path.join(__dirname, 'data');
const SETTINGS = path.join(DATA, 'settings.json');
const BOOKINGS = path.join(DATA, 'bookings.json');

const SITE_ORIGIN = 'https://mamaplus-new.onrender.com';

fs.mkdirSync(DATA, { recursive: true });

app.set('trust proxy', 1);
app.use(express.json({ limit: '1mb' }));

// Разрешаем соединение с сайтом МамаПлюс
app.use((req, res, next) => {
  const origin = req.headers.origin;

  if (origin === SITE_ORIGIN) {
    res.setHeader('Access-Control-Allow-Origin', SITE_ORIGIN);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader(
      'Access-Control-Allow-Methods',
      'GET, POST, PUT, PATCH, OPTIONS'
    );
    res.setHeader(
      'Access-Control-Allow-Headers',
      'Content-Type'
    );
    res.setHeader('Vary', 'Origin');
  }

  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }

  next();
});

// Настройки сессии администратора
app.use(session({
  secret: process.env.SESSION_SECRET || 'mamaplus-change-this-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: true,
    maxAge: 8 * 60 * 60 * 1000
  }
}));

app.use(express.static(path.join(__dirname, 'public')));

// Начальные данные студии
const initial = {
  studioName: 'МамаПлюс',
  tagline: 'Пространство мамы и малыша',
  city: 'Нахабино, Московская область',
  phone: '+7 (___) ___-__-__',
  email: 'kitty94-01@mail.ru',
  intro: 'Забота о себе. Развитие малыша. Гармония.',
  description:
    'Йога, пилатес, танцы, раннее развитие и многое другое для счастливых мам и гармоничного детства.',
  scheduleNote:
    'Расписание примерное — уточняйте свободные места при записи.',

  services: [
    {
      icon: '✿',
      title: 'Йога и пилатес с малышами',
      desc: 'Для укрепления тела и душевного равновесия',
      age: 'Мама и малыш',
      price: 'Уточняйте стоимость'
    },
    {
      icon: '◌',
      title: 'Йога и пилатес без детей',
      desc: 'Вечерние занятия только для мам',
      age: 'Взрослые',
      price: 'Уточняйте стоимость'
    },
    {
      icon: '♡',
      title: 'Женские танцы',
      desc: 'Танцуй. Вдохновляйся. Будь собой.',
      age: 'Взрослые',
      price: 'Уточняйте стоимость'
    },
    {
      icon: '☼',
      title: 'Раннее развитие малышей',
      desc: 'Игры и занятия для первых открытий',
      age: 'От 3 месяцев до 3 лет',
      price: 'Уточняйте стоимость'
    },
    {
      icon: '♧',
      title: 'Занятия для беременных',
      desc: 'Мягкое движение и забота о себе',
      age: 'Будущие мамы',
      price: 'Уточняйте стоимость'
    },
    {
      icon: '♡',
      title: 'Семейные программы',
      desc: 'Вместе растём, вместе развиваемся',
      age: 'Для всей семьи',
      price: 'Уточняйте стоимость'
    }
  ],

  schedule: [
    { day: 'Понедельник', time: '10:00', title: 'Йога мама и малыш' },
    { day: 'Вторник', time: '11:30', title: 'Раннее развитие малышей' },
    { day: 'Среда', time: '10:00', title: 'Пилатес мама и малыш' },
    { day: 'Четверг', time: '18:30', title: 'Йога для женщин' },
    { day: 'Пятница', time: '19:30', title: 'Женские танцы' },
    { day: 'Воскресенье', time: '10:00', title: 'Йога для беременных' }
  ],

  advantages: [
    'Уютная и безопасная студия',
    'Опытные и заботливые преподаватели',
    'Небольшие группы',
    'Удобное расписание',
    'Дружелюбная атмосфера'
  ]
};

// Работа с файлами данных
function read(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return fallback;
  }
}

if (!fs.existsSync(SETTINGS)) {
  fs.writeFileSync(SETTINGS, JSON.stringify(initial, null, 2));
}

if (!fs.existsSync(BOOKINGS)) {
  fs.writeFileSync(BOOKINGS, '[]');
}

const settings = () => read(SETTINGS, initial);
const bookings = () => read(BOOKINGS, []);

function save(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

function clean(value, maxLength = 500) {
  return String(value ?? '').trim().slice(0, maxLength);
}

// Проверка администратора
function admin(req, res, next) {
  if (req.session && req.session.admin) {
    return next();
  }

  return res.status(401).json({ error: 'Требуется вход' });
}

// Проверка работоспособности сервера
app.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    service: 'МамаПлюс',
    message: 'Сервер работает'
  });
});

// Получение информации для сайта
app.get('/api/site', (req, res) => {
  res.json(settings());
});

// Приём заявок
app.post('/api/bookings', async (req, res) => {
  try {
    const {
      name,
      phone,
      program,
      date,
      time,
      childAge,
      comment,
      consent
    } = req.body || {};

    if (!name || !phone || !program || !date || !time || consent !== true) {
      return res.status(400).json({
        error: 'Заполните обязательные поля и подтвердите согласие на обработку данных.'
      });
    }

    const item = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
      name: clean(name, 100),
      phone: clean(phone, 40),
      program: clean(program, 120),
      date: clean(date, 20),
      time: clean(time, 10),
      childAge: clean(childAge, 50),
      comment: clean(comment, 500),
      status: 'Новая',
      createdAt: new Date().toISOString()
    };

    const list = bookings();

    const activeSlot = list.filter(booking =>
      booking.date === item.date &&
      booking.time === item.time &&
      booking.program === item.program &&
      booking.status !== 'Отменена'
    );

    const normalizedPhone = item.phone.replace(/\D/g, '');

    const duplicate = activeSlot.find(booking =>
      String(booking.phone || '').replace(/\D/g, '') === normalizedPhone
    );

    if (duplicate) {
      return res.status(409).json({
        error: 'Вы уже оставили заявку на это занятие.'
      });
    }

    if (activeSlot.length >= 8) {
      return res.status(409).json({
        error: 'На это занятие уже набрана группа. Выберите другое время.'
      });
    }

    list.unshift(item);
    save(BOOKINGS, list);

    // Отправка письма, если SMTP настроен в Render
    if (
      process.env.SMTP_HOST &&
      process.env.SMTP_USER &&
      process.env.SMTP_PASS
    ) {
      try {
        const transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: Number(process.env.SMTP_PORT || 587),
          secure: process.env.SMTP_SECURE === 'true',
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
          }
        });

        await transporter.sendMail({
          from: process.env.MAIL_FROM || process.env.SMTP_USER,
          to: process.env.MAIL_TO || 'kitty94-01@mail.ru',
          subject: 'Новая заявка — МамаПлюс',
          text:
            `Имя: ${item.name}\n` +
            `Телефон: ${item.phone}\n` +
            `Занятие: ${item.program}\n` +
            `Дата: ${item.date}\n` +
            `Время: ${item.time}\n` +
            `Возраст малыша: ${item.childAge}\n` +
            `Комментарий: ${item.comment}\n` +
            `Статус: ${item.status}`
        });
      } catch (error) {
        console.error('Ошибка отправки письма:', error.message);
      }
    } else {
      console.warn('SMTP не настроен: заявка сохранена, письмо не отправлено.');
    }

    return res.status(201).json({
      ok: true,
      message:
        'Заявка принята! Мы свяжемся с вами для подтверждения записи.'
    });

  } catch (error) {
    console.error('Ошибка при обработке заявки:', error);

    return res.status(500).json({
      error: 'Не удалось обработать заявку. Попробуйте позже.'
    });
  }
});

// Вход в административную панель
app.post('/api/admin/login', (req, res) => {
  const password = req.body && req.body.password;

  if (!process.env.ADMIN_PASSWORD) {
    return res.status(503).json({
      error: 'Задайте ADMIN_PASSWORD в настройках Render.'
    });
  }

  if (password !== process.env.ADMIN_PASSWORD) {
    return res.status(403).json({
      error: 'Неверный пароль'
    });
  }

  req.session.admin = true;

  res.json({ ok: true });
});

// Выход администратора
app.post('/api/admin/logout', admin, (req, res) => {
  req.session.destroy(() => {
    res.json({ ok: true });
  });
});

// Получение данных панели администратора
app.get('/api/admin/data', admin, (req, res) => {
  res.json({
    settings: settings(),
    bookings: bookings()
  });
});

// Обновление настроек студии
app.put('/api/admin/settings', admin, (req, res) => {
  const incoming = req.body;

  if (
    !incoming ||
    typeof incoming !== 'object' ||
    Array.isArray(incoming)
  ) {
    return res.status(400).json({
      error: 'Некорректные данные'
    });
  }

  save(SETTINGS, incoming);
  res.json({ ok: true });
});

// Изменение статуса заявки
app.patch('/api/admin/bookings/:id', admin, (req, res) => {
  const list = bookings();
  const item = list.find(entry => entry.id === req.params.id);

  if (!item) {
    return res.status(404).json({
      error: 'Заявка не найдена'
    });
  }

  item.status = clean(req.body.status || 'Новая', 40);
  save(BOOKINGS, list);

  res.json({ ok: true });
});

// Административная страница
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// Запуск сервера
app.listen(PORT, () => {
  console.log(`МамаПлюс запущен на порту ${PORT}`);
});
