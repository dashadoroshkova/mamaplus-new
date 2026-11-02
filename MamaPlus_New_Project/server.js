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
fs.mkdirSync(DATA, { recursive: true });

const initial = {
  studioName: 'МамаПлюс',
  tagline: 'Пространство мамы и малыша',
  city: 'Нахабино, Московская область',
  phone: '+7 (___) ___-__-__',
  email: 'kitty94-01@mail.ru',
  intro: 'Забота о себе. Развитие малыша. Гармония.',
  description: 'Йога, пилатес, танцы, раннее развитие и многое другое для счастливых мам и гармоничного детства.',
  scheduleNote: 'Расписание примерное — уточняйте свободные места при записи.',
  services: [
    {icon:'✿', title:'Йога и пилатес с малышами', desc:'Для укрепления тела и душевного равновесия', age:'Мама и малыш', price:'Уточняйте стоимость'},
    {icon:'◌', title:'Йога и пилатес без детей', desc:'Вечерние занятия только для мам', age:'Взрослые', price:'Уточняйте стоимость'},
    {icon:'♡', title:'Женские танцы', desc:'Танцуй. Вдохновляйся. Будь собой.', age:'Взрослые', price:'Уточняйте стоимость'},
    {icon:'☼', title:'Раннее развитие малышей', desc:'Игры и занятия для первых открытий', age:'От 3 месяцев до 3 лет', price:'Уточняйте стоимость'},
    {icon:'♧', title:'Занятия для беременных', desc:'Мягкое движение и забота о себе', age:'Будущие мамы', price:'Уточняйте стоимость'},
    {icon:'♡', title:'Семейные программы', desc:'Вместе растём, вместе развиваемся', age:'Для всей семьи', price:'Уточняйте стоимость'}
  ],
  schedule: [
    {day:'Понедельник', time:'10:00', title:'Йога мама и малыш'},
    {day:'Вторник', time:'11:30', title:'Раннее развитие малышей'},
    {day:'Среда', time:'10:00', title:'Пилатес мама и малыш'},
    {day:'Четверг', time:'18:30', title:'Йога для женщин'},
    {day:'Пятница', time:'19:30', title:'Женские танцы'},
    {day:'Воскресенье', time:'10:00', title:'Йога для беременных'}
  ],
  advantages: ['Уютная и безопасная студия','Опытные и заботливые преподаватели','Небольшие группы','Удобное расписание','Дружелюбная атмосфера']
};
function read(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return fallback; }
}
if (!fs.existsSync(SETTINGS)) fs.writeFileSync(SETTINGS, JSON.stringify(initial, null, 2));
if (!fs.existsSync(BOOKINGS)) fs.writeFileSync(BOOKINGS, '[]');
const settings = () => read(SETTINGS, initial);
const bookings = () => read(BOOKINGS, []);
const save = (file, data) => fs.writeFileSync(file, JSON.stringify(data, null, 2));
app.use(express.json({limit:'1mb'}));
app.use(session({ secret: process.env.SESSION_SECRET || 'please-set-a-long-secret', resave:false, saveUninitialized:false, cookie:{ httpOnly:true, sameSite:'lax', secure: process.env.NODE_ENV === 'production', maxAge: 8*60*60*1000 }}));
app.use(express.static(path.join(__dirname, 'public')));
const admin = (req,res,next) => req.session.admin ? next() : res.status(401).json({error:'Требуется вход'});
app.get('/api/site', (req,res) => res.json(settings()));
app.post('/api/bookings', async (req,res) => {
  const {name, phone, program, date, time, childAge, comment, consent} = req.body || {};
  if (!name || !phone || !program || !date || !time || consent !== true) return res.status(400).json({error:'Заполните обязательные поля и подтвердите согласие на обработку данных.'});
  const list = bookings();
  const activeSlot = list.filter(b => b.date === date && b.time === time && b.program === program && b.status !== 'Отменена');
  const duplicate = activeSlot.find(b => b.phone.replace(/\\D/g,'') === String(phone).replace(/\\D/g,''));
  if (duplicate) return res.status(409).json({error:'Вы уже оставили заявку на это занятие.'});
  if (activeSlot.length >= 8) return res.status(409).json({error:'На это занятие уже набрана группа. Выберите другое время.'});
  const item = {id:Date.now().toString(36), name:String(name).slice(0,100), phone:String(phone).slice(0,40), program:String(program).slice(0,120), date, time, childAge:String(childAge||'').slice(0,50), comment:String(comment||'').slice(0,500), status:'Новая', createdAt:new Date().toISOString()};
  list.unshift(item); save(BOOKINGS,list);
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    try {
      const transporter = nodemailer.createTransport({host:process.env.SMTP_HOST, port:Number(process.env.SMTP_PORT||587), secure:process.env.SMTP_SECURE==='true', auth:{user:process.env.SMTP_USER,pass:process.env.SMTP_PASS}});
      await transporter.sendMail({from:process.env.MAIL_FROM||process.env.SMTP_USER, to:process.env.MAIL_TO||'kitty94-01@mail.ru', subject:'Новая запись — МамаПлюс', text:`Имя: ${item.name}\nТелефон: ${item.phone}\nЗанятие: ${item.program}\nДата: ${item.date}\nВремя: ${item.time}\nВозраст малыша: ${item.childAge}\nКомментарий: ${item.comment}`});
    } catch(e) { console.error('Email send failed:',e.message); }
  }
  res.status(201).json({ok:true, message:'Заявка принята! Мы свяжемся с вами для подтверждения записи.'});
});
app.post('/api/admin/login',(req,res)=>{
  const pass = req.body && req.body.password;
  if (!process.env.ADMIN_PASSWORD) return res.status(503).json({error:'Сначала задайте ADMIN_PASSWORD в настройках сервиса Render.'});
  if (pass !== process.env.ADMIN_PASSWORD) return res.status(403).json({error:'Неверный пароль'});
  req.session.admin=true; res.json({ok:true});
});
app.post('/api/admin/logout',admin,(req,res)=>req.session.destroy(()=>res.json({ok:true})));
app.get('/api/admin/data',admin,(req,res)=>res.json({settings:settings(),bookings:bookings()}));
app.put('/api/admin/settings',admin,(req,res)=>{
  const incoming=req.body;
  if (!incoming || typeof incoming!=='object' || Array.isArray(incoming)) return res.status(400).json({error:'Некорректные данные'});
  save(SETTINGS,incoming); res.json({ok:true});
});
app.patch('/api/admin/bookings/:id',admin,(req,res)=>{
  const list=bookings(); const item=list.find(x=>x.id===req.params.id);
  if(!item) return res.status(404).json({error:'Заявка не найдена'});
  item.status=String(req.body.status||'Новая').slice(0,40); save(BOOKINGS,list); res.json({ok:true});
});
app.get('/admin',(req,res)=>res.sendFile(path.join(__dirname,'public','admin.html')));
app.listen(PORT,()=>console.log(`МамаПлюс запущен на порту ${PORT}`));
