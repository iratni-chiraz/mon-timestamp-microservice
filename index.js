// index.js
// where your node app starts

var express = require('express');
var app = express();
var dns = require('dns');

var cors = require('cors');
app.use(cors({ optionsSuccessStatus: 200 }));

// Body parsing pour les POST
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(express.static('public'));

app.get('/', function (req, res) {
  res.sendFile(__dirname + '/views/index.html');
});

app.get('/api/hello', function (req, res) {
  res.json({ greeting: 'hello API' });
});

// ============================================
// ROUTE 1 : Header Parser Microservice
// ============================================
app.get('/api/whoami', function (req, res) {
  const ipaddress =
    (req.headers['x-forwarded-for'] || '').split(',')[0].trim() ||
    req.ip ||
    req.socket.remoteAddress;

  res.json({
    ipaddress: ipaddress,
    language: req.headers['accept-language'],
    software: req.headers['user-agent'],
  });
});

// ============================================
// ROUTE 2 : URL Shortener Microservice
// ============================================
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
    if (err) {
      return res.json({ error: 'invalid url' });
    }

    const shortUrl = nextId++;
    urlDatabase[shortUrl] = originalUrl;

    res.json({
      original_url: originalUrl,
      short_url: shortUrl,
    });
  });
});

app.get('/api/shorturl/:short_url', function (req, res) {
  const shortUrl = req.params.short_url;
  const originalUrl = urlDatabase[shortUrl];

  if (!originalUrl) {
    return res.json({ error: 'No short URL found for the given input' });
  }

  res.redirect(originalUrl);
});

// ============================================
// ROUTE 3 : Exercise Tracker Microservice
// ============================================
const users = [];

// Générer un _id unique type MongoDB (24 hex)
function generateId() {
  return (
    Math.random().toString(16).slice(2, 14) +
    Math.random().toString(16).slice(2, 14)
  );
}

// POST /api/users → créer un utilisateur
app.post('/api/users', function (req, res) {
  const username = req.body.username;

  if (!username) {
    return res.json({ error: 'username is required' });
  }

  const user = {
    username: username,
    _id: generateId(),
    log: [],
  };

  users.push(user);

  res.json({
    username: user.username,
    _id: user._id,
  });
});

// GET /api/users → lister tous les utilisateurs
app.get('/api/users', function (req, res) {
  const list = users.map(function (u) {
    return { username: u.username, _id: u._id };
  });
  res.json(list);
});

// POST /api/users/:_id/exercises → ajouter un exercice
app.post('/api/users/:_id/exercises', function (req, res) {
  const userId = req.params._id;
  const user = users.find(function (u) {
    return u._id === userId;
  });

  if (!user) {
    return res.json({ error: 'user not found' });
  }

  const { description, duration, date } = req.body;

  // Date : si non fournie, utiliser la date actuelle
  let exerciseDate;
  if (date) {
    exerciseDate = new Date(date);
    if (isNaN(exerciseDate.getTime())) {
      exerciseDate = new Date();
    }
  } else {
    exerciseDate = new Date();
  }

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

// GET /api/users/:_id/logs → voir les logs
app.get('/api/users/:_id/logs', function (req, res) {
  const userId = req.params._id;
  const user = users.find(function (u) {
    return u._id === userId;
  });

  if (!user) {
    return res.json({ error: 'user not found' });
  }

  // Filtres optionnels : from, to, limit
  let log = user.log.slice();

  const { from, to, limit } = req.query;

  if (from) {
    const fromDate = new Date(from);
    log = log.filter(function (ex) {
      return new Date(ex.date) >= fromDate;
    });
  }

  if (to) {
    const toDate = new Date(to);
    log = log.filter(function (ex) {
      return new Date(ex.date) <= toDate;
    });
  }

  if (limit) {
    log = log.slice(0, Number(limit));
  }

  res.json({
    username: user.username,
    count: log.length,
    _id: user._id,
    log: log,
  });
});

// ============================================
// ROUTE 4 : Timestamp Microservice
// (DOIT être en DERNIER — catch-all)
// ============================================
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

// ============================================
// Lancement du serveur
// ============================================
var listener = app.listen(process.env.PORT || 3000, function () {
  console.log('Your app is listening on port ' + listener.address().port);
});
