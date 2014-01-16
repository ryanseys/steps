/**
 * Jawbone UP Total steps since some number of days ago.
 * @author Ryan Seys
 */

var express = require('express');
var routes = require('./routes');
var http = require('http');
var path = require('path');
var app = express();

app.set('port', process.env.PORT || 3000);
app.set('views', __dirname + '/views');
app.set('view engine', 'jade');
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.bodyParser());
app.use(express.methodOverride());
app.use(app.router);
app.use(express.static(path.join(__dirname, 'public')));

if ('development' == app.get('env')) {
  app.use(express.errorHandler());
}

app.get('/', function(req, res) {
  getSteps('ryanseys', function(data) {
    if(data === -1) {
      res.render('index', { title: 'Steps', steps: 'An error occurred :(' });
    }
    else {
      res.render('index', { title: 'Steps', steps: data[0], km: Math.round(data[1]) });
    }
  });
});

var up = require('jawbone-up')({access_token : process.env.UP_ACCESS_TOKEN});

var db = {
  'ryanseys': {
    last_sync_date: null,
    steps_historic: 0,
    km_historic: 0
  }
};

function syncSteps(username, callback){
  username = username || 'ryanseys';
  var last_sync_date = db[username]['last_sync_date'];
  var steps_historic = db[username]['steps_historic'];
  var km_historic = db[username]['km_historic'];
  if(!last_sync_date) {
    console.log('get all data');
    var now = new Date();
    get_moves(1, function(array) {
      var steps_today = array[0];
      var km_today = array[1];
      get_moves(0, function(array2) {
        var all_steps = array2[0];
        var all_km = array2[1];
        db[username]['steps_historic'] = all_steps - steps_today;
        db[username]['km_historic'] = all_km - km_today;
        // db[username]['steps_last_sync_date'] = steps_today;
        db[username]['last_sync_date'] = now.toString();
        callback([all_steps, all_km]);
      });
    });
  }
  else {
    console.log('get today only');
    get_moves(1, function(array) {
      var steps_today = array[0];
      var km_today = array[1];
      var now = new Date();
      var days_to_get = Math.ceil((now - (new Date(last_sync_date))) / (1000 * 3600 * 24));
      get_moves(days_to_get, function(array2) {
        var all_steps = array2[0];
        var all_km = array2[1];
        db[username]['steps_historic'] = db[username]['steps_historic'] + all_steps - steps_today;
        db[username]['km_historic'] = db[username]['km_historic'] + all_km - km_today;
        // db[username]['steps_last_sync_date'] = steps_today;
        db[username]['last_sync_date'] = now.toString();
        callback([
          db[username]['steps_historic'] + steps_today,
          db[username]['km_historic'] + km_today
        ]);
      });
    });
  }
}

function getSteps(username, callback) {
  username = username || 'ryanseys';
  syncSteps(username, function(data) {
    callback(data);
  });
}

function get_moves(limit, callback) {
  up.moves.get({ limit: limit }, function(error, body) {
    try {
      var days = JSON.parse(body).data.items;
      var sum_steps = 0;
      var sum_km = 0;
      for (var i = days.length - 1; i >= 0; i--) {
        sum_steps += days[i].details.steps;
        sum_km += days[i].details.km;
      }
      callback([sum_steps, sum_km]);
    }
    catch(e) {
      callback(-1);
    }
  });
}

http.createServer(app).listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});

