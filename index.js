var config = require('./config.json')
var fs = require('fs')
var path = require('path')
var http = require('http')
var ecstatic = require('ecstatic')
var five = require("johnny-five")
var twitter = require('node-twitter')
var credentials = config.twitter.auth
var twitterUpload = new twitter.RestClient(
  credentials.consumer_key,
  credentials.consumer_secret,
  credentials.access_token,
  credentials.access_token_secret)

var server = http.createServer(ecstatic({ root: __dirname + '/client'}))
var io = require("socket.io")(server)
var port = process.env.PORT || 1337
server.listen(port, function () {
  console.log("photobooth listening on *:" + port)
})

var uploadQueue = []
var uploadInterval = setInterval(function(){
  if (uploadQueue.length === 0) return
  var path = uploadQueue.shift()
  console.log('tweet', path)
  tweet(path)
}, 5000)

io.on("connection", function (socket) {
  console.log('Got socket')
  socket.on("photo", function (dataUrl) {
    save(dataUrl, function(err, path){
      if(err) return console.error(err)
      uploadQueue.push(path)
    })
  })
//  setInterval(function(){
//    io.emit('highfive')
//  }, 5000)
})

var board = new five.Board()
board.on("ready", function () {
  var led = new five.Led(11)
  var btn = new five.Button(4)

  led.pulse(2000)

  var offTimeout = null

  btn.on("down", function () {
    console.log("down", Date.now())
    io.emit('highfive')
    led.stop()
    led.strobe(50)
    clearTimeout(offTimeout)
    offTimeout = setTimeout(function () {
      led.stop()
      led.pulse(2000)
    }, 5000)
  })
})

function save (dataUrl, cb) {
  var data = dataUrl.replace(/^data:image\/png;base64,/, "");
  var path = __dirname + '/client/photos/' + Date.now() + '.png'
  fs.writeFile(path, data, 'base64', function (err){
    cb(err, path)
  })
}

function tweet (path) {
  twitterUpload.statusesUpdateWithMedia({
    'status': config.twitter.status,
    'media[]': path
  }, function(err, data){
    if (err) console.error(err)
    if (data) console.log("tweet success", path)
  })
}
