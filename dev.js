'use strict'

var app = require('express')()
	, server = require('http').createServer(app)
	, io = require('socket.io').listen(server);

var fs = require('fs')

server.listen(3000);

app.get('/', function (req, res) {
 res.sendFile(__dirname + '/test/cmarked.html');
});

app.get('/lib/cmarked.js', function(req, res) {
	res.sendFile(__dirname + '/lib/cmarked.js')
})

app.get('/test/github2.css', function(req, res) {
	res.sendFile(__dirname + '/test/github2.css')
})

io.sockets.on('connection', function (socket) {
	let watcher

	fs.unwatchFile('./lib/cmarked.js')

	watcher = fs.watchFile('./lib/cmarked.js', {interval: 100}, (eventType, filename) => {
		if (filename) {
			socket.emit('news', { hello: 'world' });
		}
	})

});
