// index.js
var express = require('express');
var app = express();
var dns = require('dns');
var multer = require('multer');
var upload = multer({ storage: multer.memoryStorage() });

var cors = require('cors');
app.use(cors({ optionsSuccessStatus: 200 }));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

app.get('/', function (req, res) {
  res.sendFile(__dirname + '/views/index.html');
});

app.get('/api/hello', function (req, res) {
  res.json({ greeting: 'hello API' });
});

// ROUTE 1 : Header Parser
app.get('/api/whoami', function (req, res) {
  const ipaddress =
    (req.headers['x-forwarded-for'] || '').split(',')[0].trim() ||
    req.ip || req.socket.remoteAddress;
  res.json({
    ipaddress: ipaddress,
    language: req.headers['accept-language'],
    software: req.headers['user-agent'],
  });
});

// ROUTE 2 : URL Shortener
const urlDatabase = {};
let nextId = 1;

app.post('/api/shorturl', function (req, res) {
  const originalUrl = req.body.url;
  if (!originalUrl || !/^https?:\/\/.+/.test(originalUrl)) {
    return res.json({ error: 'invalid url' });
  }
  let hostname;
  try {
    hostname = new URL(originalUrl).hostname;
  } catch (e) {
    return res.json({ error: 'invalid url' });
  }
  dns.lookup(hostname, function (err) {
    if (err) return res.json({ error: 'invalid url' });
    const shortUrl = nextId++;
    urlDatabase[shortUrl] = originalUrl;
    res.json({ original_url: originalUrl, short_url: shortUrl });
  });
});

app.get('/api/shorturl/:short_url', function (req, res) {
  const originalUrl = urlDatabase[req.params.short_url];
  if (!originalUrl) {
    return res.json({ error: 'No short URL found for the given input' });
  }
  res.redirect(originalUrl);
});

// ROUTE 3 : File Metadata
app.post('/api/fileanalyse', upload.single('upfile'), function (req, res) {
  if (!req.file) {
    return res.json({ error: 'no file uploaded' });
  }
  res.json({
    name: req.file.originalname,
    type: req.file.mimetype,
    size: req.file.size,
  });
});

// ROUTE 4 : Exercise Tracker
const users = [];

function generateId() {
  return Math.random().toString(16).slice(2, 14) + Math.random().toString(16).slice(2, 14);
}

app.post('/api/users', function (req, res) {
  const username = req.body.username;
  if (!username) return res.json({ error: 'username is required' });
  const user = { username: username, _id: generateId(), log: [] };
  users.push(user);
  res.json({ username: user.username, _id: user._id });
});

app.get('/api/users', function (req, res) {
  res.json(users.map(u => ({ username: u.username, _id: u._id })));
});

app.post('/api/users/:_id/exercises', function (req, res) {
  const user = users.find(u => u._id === req.params._id);
  if (!user) return res.json({ error: 'user not found' });
  const { description, duration, date } = req.body;
  let exerciseDate = date ? new Date(date) : new Date();
  if (isNaN(exerciseDate.getTime())) exerciseDate = new Date();
  const exercise = {
    description: String(description),
    duration: Number(duration),
    date: exerciseDate.toDateString(),
  };
  user.log.push(exercise);
  res.json({
    username: user.username,
    description: exercise.description,
    duration: exercise.duration,
    date: exercise.date,
    _id: user._id,
  });
});

app.get('/api/users/:_id/logs', function (req, res) {
  const user = users.find(u => u._id === req.params._id);
  if (!user) return res.json({ error: 'user not found' });
  let log = user.log.slice();
  const { from, to, limit } = req.query;
  if (from) log = log.filter(ex => new Date(ex.date) >= new Date(from));
  if (to) log = log.filter(ex => new Date(ex.date) <= new Date(to));
  if (limit) log = log.slice(0, Number(limit));
  res.json({
    username: user.username,
    count: log.length,
    _id: user._id,
    log: log,
  });
});

// ROUTE 5 : Timestamp (DERNIÈRE - catch-all)
app.get('/api/:date?', function (req, res) {
  const { date } = req.params;
  let parsedDate;
  if (!date) {
    parsedDate = new Date();
  } else if (!isNaN(Number(date))) {
    parsedDate = new Date(Number(date));
  } else {
    parsedDate = new Date(date);
  }
  if (isNaN(parsedDate.getTime())) {
    return res.json({ error: 'Invalid Date' });
  }
  res.json({
    unix: parsedDate.getTime(),
    utc: parsedDate.toUTCString(),
  });
});

var listener = app.listen(process.env.PORT || 3000, function () {
  console.log('Your app is listening on port ' + listener.address().port);
});
