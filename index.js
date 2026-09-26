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
// (DOIT être AVANT /api/:date?)
// ============================================
app.get('/api/whoami', function (req, res) {
  const ipaddress =
    (req.headers['x-forwarded-for'] || '').split(',')[0].trim() ||
    req.ip ||
    req.socket.remoteAddress;

  const language = req.headers['accept-language'];
  const software = req.headers['user-agent'];

  res.json({
    ipaddress: ipaddress,
    language: language,
    software: software,
  });
});

// ============================================
// ROUTE 2 : URL Shortener Microservice
// ============================================
const urlDatabase = {};
let nextId = 1;

// POST : créer une URL courte
app.post('/api/shorturl', function (req, res) {
  const originalUrl = req.body.url;

  // Valider le format : doit commencer par http:// ou https://
  if (!originalUrl || !/^https?:\/\/.+/.test(originalUrl)) {
    return res.json({ error: 'invalid url' });
  }

  // Extraire le hostname
  let hostname;
  try {
    hostname = new URL(originalUrl).hostname;
  } catch (e) {
    return res.json({ error: 'invalid url' });
  }

  // Vérifier que le domaine existe (résolution DNS)
  dns.lookup(hostname, function (err) {
    if (err) {
      return res.json({ error: 'invalid url' });
    }

    // Créer un nouvel ID court
    const shortUrl = nextId++;
    urlDatabase[shortUrl] = originalUrl;

    res.json({
      original_url: originalUrl,
      short_url: shortUrl,
    });
  });
});

// GET : rediriger vers l'URL originale
app.get('/api/shorturl/:short_url', function (req, res) {
  const shortUrl = req.params.short_url;
  const originalUrl = urlDatabase[shortUrl];

  if (!originalUrl) {
    return res.json({ error: 'No short URL found for the given input' });
  }

  res.redirect(originalUrl);
});

// ============================================
// ROUTE 3 : Timestamp Microservice
// (DOIT être APRÈS /api/whoami et /api/shorturl)
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
