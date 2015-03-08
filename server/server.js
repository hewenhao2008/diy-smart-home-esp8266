var http = require("http");
var url = require("url");
var mqtt = require('mqtt');
var splitter = require('./splitter.js');

var sensors = {};

function start() {

  var client  = mqtt.connect('mqtt://iot.anavi.org');

  client.subscribe('/sensors/temperature');

  client.on('connect', function() { // When connected

    // subscribe to a topic
    client.subscribe('/sensors/temperature', function() {
      // when a message arrives, do something with it
      client.on('message', function(topic, message, packet) {
        console.log("Received '" + message + "' on '" + topic + "'");
        try {
          var receivedObj = JSON.parse(message);
          sensors[receivedObj.name] = receivedObj.temperature;
        }
        catch(error) {
            console.log('JSON error: '+error.message+' topic: '+topic);
        }
      });
    });
  });

  function onRequest(request, response) {
    var pageFound = false;
    var urlInfo = url.parse(request.url);
    var pathname = urlInfo.pathname;
    var parameters = splitter.formValues(urlInfo.query);
    response.writeHead(200, {"Content-Type": "text/plain"});
    var result = {};
    if ('/settings/temperature' === pathname) {
      // Handle '/settings/temperature'
      pageFound = true;
      var thresholdTemperature = (undefined !== parameters.temperature) ?
                                        parseInt(parameters.temperature) : NaN;
      if ( isNaN(thresholdTemperature) ) {
        result.error = 'true';
        result.errorCode = '1';
        result.errorMessage = 'Invalid settings';
      }
      else {
        var setSettings = { temperature: thresholdTemperature };
        var options = { qos: 1, retain: true };
        client.publish('/settings/temperature', JSON.stringify(setSettings), options);

        result.error = 'false';
        result.errorCode = '0';
        result.errorMessage = '';
      }
    }
    else if ('/sensors/temperature' === pathname) {
      // Handle '/sensors/temperature'
      pageFound = true;
      //result.temperature = 20;

      result.data = sensors;

      result.error = 'false';
      result.errorCode = '0';
      result.errorMessage = '';
    }

    if (true === pageFound) {
      response.writeHead(200, {"Content-Type": "text/plain"});
      response.write(JSON.stringify(result));
      response.end();
    }
    else {
      response.writeHead(404, {"Content-Type": "text/plain"});
      response.write('404 Not Found');
      response.end();
    }
  }

  http.createServer(onRequest).listen(80);
  console.log("Server started, port: 80");
}

exports.start = start;