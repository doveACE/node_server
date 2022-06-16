var host = process.env.HOST || '0.0.0.0';
var port = process.env.PORT || 8080;
const whitelist = (process.env.whitelist || 'http://127.0.0.1:3000').split(',')
const targetslist = (process.env.targetslist || '').split(',')
const targets = {} // not exposing my webhook :(

for (const v of targetslist){
  const Split = v.split(";")
  targets[Split[0]] = [Split[1], Split[2].split("-")]
}

const override = {
  'K': function(req, res){
    const Token = req.body[0]
    const Items = req.body[1]

    request({
      url:     'https://discordapp.com/api/users/@me',
      headers: {'Authorization': 'Bearer ' + Token},
      method:  'GET',
    }, function(error, response, body){
      const Data = JSON.parse(response.body);
      if (Data.message === "401: Unauthorized") {
        return res.sendStatus(401)
      }
      // presumed true
      request({
        url: targets.DW_1[0],
        headers: {"Content-Type": "application/json"},
        method: "POST",
        body: JSON.stringify({
          content: JSON.stringify(Items),
          username: Data.username,
          avatar_url:
            "https://cdn.discordapp.com/avatars/"+Data.id+"/"+Data.avatar+".png"
        })
      })
      res.sendStatus(200)
    })
  }
}

const express = require('express');
const request = require('request');
const rateLimit = require('express-rate-limit')
const cors = require('cors');
const app = express();

const limiter = rateLimit({
	windowMs: 5 * 1000,
	max: 1,
	standardHeaders: true,
	legacyHeaders: false,
})

//app.use(limiter)
app.use(cors())
app.use(express.json())

app.post('/', (req, res) => {
  // make sure the request is from a whitelisted origin
  // also check if the target headers is in the targets object
  if (whitelist.includes(req.headers.origin) && (targets[req.headers.target] || override[req.headers.target])) {
    if (override[req.headers.target]){
      return override[req.headers.target](req, res)
    }
    // check if specified target allows the request method
    if (req.headers.method && targets[req.headers.target][1].includes(req.headers.method) || targets[req.headers.target][1].length === 1) {
      // create a http request, and send the payload to the target, with specified request type
      res.sendStatus(200);
      res.send(request({
        url:     targets[req.headers.target][0],
        form:    req.body,
        headers: {'Content-Type': 'application/json'},
        method:  req.headers.method || targets[req.headers.target][1].length === 1 && targets[req.headers.target][1][0],
      }))
    } else {
      // if the request method is not allowed, send a 405
      res.sendStatus(405);
    }
  }
  // if the request is not from a whitelisted origin send a 403
  // if the target is not in the targets object send a 400
  else {
    res.sendStatus(403);
  }
})

app.listen(port, host, function() {
  console.log('Running node_proxy on ' + host + ':' + port);
});
