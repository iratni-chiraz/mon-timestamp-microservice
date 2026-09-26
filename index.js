// index.js
// where your node app starts

var express = require('express');
var app = express();

var cors = require('cors');
app.use(cors({ optionsSuccessStatus: 200 }));

app.use(express.static('public'));

app.get('/', function (req, res) {
  res.sendFile(__dirname + '/views/index.html');
});

app.get('/api/hello', function (req, res) {
  res.json({ greeting: 'hello API' });
});

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
// Route Request Header Parser Microservice
app.get('/api/whoami', function (req, res) {
  // IP address
  const ipaddress = req.headers['x-forwarded-for'] || req.ip || req.socket.remoteAddress;
  
  // Language
  const language = req.headers['accept-language'];
  
  // Software (User-Agent)
  const software = req.headers['user-agent'];
  
  res.json({
    ipaddress: ipaddress,
    language: language,
    software: software
  });
});
var listener = app.listen(process.env.PORT || 3000, function () {
  console.log('Your app is listening on port ' + listener.address().port);
});
