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
      res.render('index', {
        title: 'Steps',
        steps: 'An error occurred :('
      });
    }
    else {
      res.render('index', {
        title: 'Steps',
        steps: data.steps,
        km: Math.round(data.km),
        cal: Math.round(data.cal)
      });
    }
  });
});

var up = require('jawbone-up')({access_token : process.env.UP_ACCESS_TOKEN});

var db = {
  'ryanseys': {
    last_sync_date: null,
    steps_historic: 0,
    km_historic: 0,
    cal_historic: 0
  }
};

function syncSteps(username, callback){
  username = username || 'ryanseys';
  var last_sync_date = db[username]['last_sync_date'];
  if(!last_sync_date) {
    console.log('get all data');
    var now = new Date();
    get_moves(1, function(data1) {
      var steps_today = data1.steps;
      var km_today = data1.km;
      var cal_today = data1.cal;
      get_moves(0, function(data2) {
        var all_steps = data2.steps;
        var all_km = data2.km;
        var all_cal = data2.cal;
        db[username]['steps_historic'] = all_steps - steps_today;
        db[username]['km_historic'] = all_km - km_today;
        db[username]['cal_historic'] = all_cal - cal_today;
        db[username]['last_sync_date'] = now.toString();
        callback({
          steps: all_steps,
          km: all_km,
          cal: all_cal
        });
      });
    });
  }
  else {
    console.log('get today only');
    get_moves(1, function(data1) {
      var steps_today = data1.steps;
      var km_today = data1.km;
      var cal_today = data1.cal;
      var now = new Date();
      var days_to_get = Math.ceil((now - (new Date(last_sync_date))) / (1000 * 3600 * 24));
      get_moves(days_to_get, function(data2) {
        var all_steps = data2.steps;
        var all_km = data2.km;
        var all_cal = data2.cal;
        db[username]['steps_historic'] = db[username]['steps_historic'] + all_steps - steps_today;
        db[username]['km_historic'] = db[username]['km_historic'] + all_km - km_today;
        db[username]['cal_historic'] = db[username]['cal_historic'] + all_cal - cal_today;
        db[username]['last_sync_date'] = now.toString();
        callback({
          steps: db[username]['steps_historic'] + steps_today,
          km: db[username]['km_historic'] + km_today,
          cal: db[username]['cal_historic'] + cal_today
        });
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
      var sum_cal = 0;
      for (var i = days.length - 1; i >= 0; i--) {
        sum_steps += days[i].details.steps;
        sum_km += days[i].details.km;
        sum_cal += days[i].details.calories;
      }
      callback({
        steps: sum_steps,
        km: sum_km,
        cal: sum_cal
      });
    }
    catch(e) {
      callback(-1);
    }
  });
}

http.createServer(app).listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});
