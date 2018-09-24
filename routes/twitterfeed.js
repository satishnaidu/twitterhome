const Twit = require('twit')
const options = require('./credentials.json');
const client = new Twit(options);
const schedule  = require('node-schedule');
const express = require('express')
var request = require('request');
var router = express.Router();


const tplinkUrl ="http://tplink:3001/tplink/device/status";

const philipsUrl ="http://localhost:3001/tplink/device/status";

var deviceTypes = {'TPLINK':1,'PHILIPS':1};
var lastText;

router.get('/', function(req, res, next) {
  res.send({'status':'200','message':'Welcome to twitter home page'});
});


router.get('/tweets/destroy', function(req, res, next) {
  var err = destroyOldTweets();
  var message = 'successfully destroy old tweets';
  if(err){
    message = 'Some problem destroying the tweets';
  }
  res.send({'status':'200','message':message});
});


router.get('/feed', function(req,res,next){
    getFeeds();
    res.send({'status':'200','message':'Recent twitter feed read successfully'});
});

Array.prototype.contains = function(element){
    return this.indexOf(element) > -1;
};

var rule = new schedule.RecurrenceRule();

var cronJob = schedule.scheduleJob({rule: '*/30 * * * * *'}, function(){
   console.log("cron triggered on for every 30 seconds");
   getFeeds();
});



var getFeeds = function() { 

var params = {'count':1,'screen_name':'iotrpifeed'};
client.get('statuses/user_timeline', params, function (err, reply, response) {
   console.log("executing every second");
   for(var i=0; i<reply.length; i++){
  
   //console.log(reply[i]);
   var text = reply[i].text;

   console.log("Got the command "+text);

   var textContent = text.split(" ");
   console.log(textContent)
   var deviceType = textContent[0];

   if(text.startsWith('Invalid')){
      console.log("Got the error state from twitter, waiting for correct input");
      return;
   }
   console.log("validating device type");
   if(deviceTypes[deviceType.toUpperCase()]!=1 && !text.startsWith('Invalid')){
      sendErrorPosts('device type');
   }

   console.log("Generating the command type");
   var command = text.substring(deviceType.length+1, text.length);
   console.log(deviceType);
   console.log(command);

   if(lastText == text){
    console.log('device is in last known status, so skipping...');
    return;
   }
   if('TPLINK' == deviceType.toUpperCase()){

      console.log('processing tplink request')
      const options = {  
          url: tplinkUrl,
          method: 'POST',
          headers: {
              'Accept': 'application/json',
              'Content-Type':'application/json'
          },
          form: {
            'status':command,
            'device':1
          }
      };
      console.log("sending tplink request to url "+ tplinkUrl) 
      request(options, function(err, res, body) { 

          if(err){
              console.log("Got error from tplink");
              console.log(err);
              sendErrorPosts(err);
          }else{
          let json = JSON.parse(body);
          console.log(json);

        }
      });


   }else if('PHILIPS' == deviceType.toUpperCase()){
      console.log('processing philips request');

   }
   lastText = text;
  
  };
 });
};


var destroyOldTweets = function(){

console.log("destrong tweets")
  var errMsg;
  var params = {'count':10,'screen_name':'iotrpifeed'};
  client.get('statuses/user_timeline', params, function (err, reply, response) {

    for(var i=1; i<reply.length; i++){
      console.log('reply id '+reply[i].id_str)
      client.post('statuses/destroy/:id', { id: reply[i].id_str}, function (err, data, response) {
          console.log(data)
          errMsg = err;
      })
    }
  });
  return errMsg;
};




var sendErrorPosts = function(message){
  client.post('statuses/update', { status: 'Invalid '+message }, function(err, data, response) {
            console.log(data)
    });
}

module.exports = router;
