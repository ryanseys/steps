/**
 * Jawbone UP Total steps since some number of days ago.
 * @author Ryan Seys
 */

const up = require('jawbone-up')({access_token : process.env.UP_ACCESS_TOKEN});

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

module.exports = {
  get: get_moves
};

// gets all steps without a limit
get_moves(0, function(steps) {
  console.log(steps);
});
