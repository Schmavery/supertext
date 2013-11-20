var express = require('express'),
  http = require("http"),
  io = require('socket.io'),
  helmet = require('helmet'),
  path = require('path'),
  fs = require('fs'),
    request = require('request');

var app = express();

app.configure(function(){
  app.set('port', process.env.PORT || 8080);
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.use(express.favicon());
  app.use(express.logger('dev'));
  app.use(express.bodyParser());
  app.use(helmet.xframe());
  app.use(helmet.iexss());
  app.use(helmet.contentTypeOptions());
  app.use(helmet.cacheControl());
  app.use(express.methodOverride());
  app.use(express.cookieParser());

  app.use(express.session({
  secret: "mdfmFDQSMbfd890sdfqFDg7863nbjFLLU87QSD0DSF",
  cookie: {httpOnly: true, secure: true},
  }));

  app.use(express.csrf());

  app.use(function (req, res, next) {
  res.locals.csrftoken = req.session._csrf;
  next();
  });

  app.use(app.router);
  app.use(express.static(path.join(__dirname, 'public')));
});

app.configure('development', function(){
  app.use(express.errorHandler());
});

var server = http.createServer(app);
var socket = io.listen(server);

socket.configure(function () {
  socket.set("transports", ["xhr-polling"]);
  socket.set("polling duration", 10);
});

socket.on('connection', function (socket) {
  console.log("Connection...")
  socket.emit('authorized', {message: "Server connected"});

  socket.on('end', function() {
    socket.end();
  });
});


server.listen(app.get('port'), function() {
  console.log("Express http server listening on port " + app.get('port'));
});
