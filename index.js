/**
 * Jawbone UP Total steps.
 * @author Ryan Seys
 */

var express = require('express')
var http = require('http')
var path = require('path')
var app = express()

app.set('port', process.env.PORT || 3000)
app.set('views', path.join(__dirname, 'views'))
app.set('view engine', 'jade')
app.use(express.favicon())
app.use(express.logger('dev'))
app.use(express.bodyParser())
app.use(express.methodOverride())
app.use(app.router)
app.use(express.static(path.join(__dirname, 'public')))

var up = require('jawbone-up')({
  access_token: process.env.UP_ACCESS_TOKEN
})

var db = {
  'ryanseys': {
    last_sync_date: null,
    steps_historic: 0,
    km_historic: 0,
    cal_historic: 0
  }
}

if (app.get('env') === 'development') {
  app.use(express.errorHandler())
}

app.get('/', function (req, res) {
  getSteps('ryanseys', function (data) {
    if (data && data.steps) {
      res.render('index', {
        title: 'Steps',
        steps: data.steps.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ','),
        km: Math.round(data.km).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ','),
        cal: Math.round(data.cal).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')
      })
    } else {
      res.render('index', {
        title: 'Steps',
        err: 'An error occurred :(',
        steps: null
      })
    }
  })
})

function syncSteps (username, callback) {
  username = username || 'ryanseys'
  var last_sync_date = db[username]['last_sync_date']
  if (!last_sync_date) {
    console.log('get all data')
    var now = new Date()
    getMoves(1, function (data1) {
      var steps_today = data1.steps
      var km_today = data1.km
      var cal_today = data1.cal
      getMoves(0, function (data2) {
        var all_steps = data2.steps
        var all_km = data2.km
        var all_cal = data2.cal
        db[username]['steps_historic'] = all_steps - steps_today
        db[username]['km_historic'] = all_km - km_today
        db[username]['cal_historic'] = all_cal - cal_today
        db[username]['last_sync_date'] = now.toString()
        callback({
          steps: all_steps,
          km: all_km,
          cal: all_cal
        })
      })
    })
  } else {
    console.log('get today only')
    getMoves(1, function (data1) {
      var steps_today = data1.steps
      var km_today = data1.km
      var cal_today = data1.cal
      var now = new Date()
      var days_to_get = Math.ceil((now - (new Date(last_sync_date))) / (1000 * 3600 * 24))
      getMoves(days_to_get, function (data2) {
        var all_steps = data2.steps
        var all_km = data2.km
        var all_cal = data2.cal
        db[username]['steps_historic'] = db[username]['steps_historic'] + all_steps - steps_today
        db[username]['km_historic'] = db[username]['km_historic'] + all_km - km_today
        db[username]['cal_historic'] = db[username]['cal_historic'] + all_cal - cal_today
        db[username]['last_sync_date'] = now.toString()
        callback({
          steps: db[username]['steps_historic'] + steps_today,
          km: db[username]['km_historic'] + km_today,
          cal: db[username]['cal_historic'] + cal_today
        })
      })
    })
  }
}

function getSteps (username, callback) {
  username = username || 'ryanseys'
  syncSteps(username, function (data) {
    callback(data)
  })
}

function getMoves (limit, callback) {
  up.moves.get({ limit: limit }, function (err, body) {
    if (err) {
      console.log('An error occurred: ' + err)
      return
    }

    try {
      var days = JSON.parse(body).data.items
      var sumSteps = 0
      var sumKm = 0
      var sumCalories = 0

      for (var day of days) {
        sumSteps += day.details.steps
        sumKm += day.details.km
        sumCalories += day.details.calories
      }

      callback({
        steps: sumSteps,
        km: sumKm,
        cal: sumCalories
      })
    } catch (e) {
      callback(-1)
    }
  })
}

http.createServer(app).listen(app.get('port'), function () {
  console.log('Server listening on port ' + app.get('port'))
})
