/**
 * Jawbone UP Total steps since some number of days ago.
 * @author Ryan Seys
 */

var express = require('express');
var app = express();
const up = require('jawbone-up')({access_token : process.env.UP_ACCESS_TOKEN});

var db = {
  'ryanseys': {
    last_sync_date: null,
    steps_historic: 0,
    // steps_last_sync_date: 0
  }
};

function syncSteps(username, callback){
  username = username || 'ryanseys';
  var last_sync_date = db[username]['last_sync_date'];
  var steps_historic = db[username]['steps_historic'];
  if(!last_sync_date) {
    console.log('get all data');
    var now = new Date();
    get_moves(1, function(steps_today) {
      get_moves(0, function(all_steps) {
        db[username]['steps_historic'] = all_steps - steps_today;
        db[username]['steps_last_sync_date'] = steps_today;
        db[username]['last_sync_date'] = now.toString();
        callback(all_steps);
      });
    });
  }
  else {
    console.log('get today only');
    get_moves(1, function(steps_today) {
      var now = new Date();
      var days_to_get = Math.ceil((now - (new Date(last_sync_date))) / (1000 * 3600 * 24));
      get_moves(days_to_get, function(all_steps) {
        db[username]['steps_historic'] = db[username]['steps_historic'] + all_steps - steps_today;
        db[username]['steps_last_sync_date'] = steps_today;
        db[username]['last_sync_date'] = now.toString();
        callback(db[username]['steps_historic'] + steps_today);
      });
    });
  }
}

function getSteps(username, callback) {
  username = username || 'ryanseys';
  syncSteps(username, function(all_steps) {
    callback(all_steps);
  });
}

function get_moves(limit, callback) {
  up.moves.get({ limit: limit }, function(error, body) {
    try {
      var days = JSON.parse(body).data.items;
      var sum = 0;
      for (var i = days.length - 1; i >= 0; i--) {
        sum += days[i].details.steps;
      }
      callback(sum);
    }
    catch(e) {
      callback(-1);
    }
  });
}

app.get('/', function(req, res) {
  getSteps('ryanseys', function(steps) {
    steps = steps + '';
    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Content-Length', Buffer.byteLength(steps));
    res.end(steps);
  });
});

app.listen(3000);
console.log('Listening on port 3000');
