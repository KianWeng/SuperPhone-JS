'use strict'

let express = require('express')
let bodyParser = require('body-parser')

let app = express();
app.set('port', (process.env.PORT || 8040));
app.use(bodyParser.json({type: 'application/json'}));

var replyMessage = '';
var resultType = 'RESULT';

var mqtt = require('mqtt');
var client = mqtt.connect('mqtt://45.32.7.217:1883',{
    username:'admin',
    password:'password',
    clientId:'dev_36547892'});

var bFlag = false;

client.on('connect', function(){
    console.log('>>> connected');
    client.subscribe('/app2dev/36547892/callingstatus');
})

client.on('message', function(topic, message){
    var status = message.toString();
    console.log('Recieve message:' + status);
    if(status == "SUCCESS"){
        replyMessage = '已经为您拨打电话。';
        resultType = 'RESULT';
    }else if(status == "NO CONTACT"){
        replyMessage = '对不起，找不到联系人。';
        resultType = 'RESULT';
    }else{
        replyMessage = '拨打电话失败请检查手机APK是否设置正确';
        resultType = 'RESULT';
    }
    console.log('replyMessage:' + replyMessage);
    bFlag = true;
})

app.post('/', function (req, res) {
    console.log(JSON.stringify(req.body));

    let requestBody = req.body;
    let intentName = requestBody.intentName;
    let userUtterance = requestBody.utterance;
    let slotValue = requestBody.slotEntities[1].slotValue;
    console.log('user utterance: ' + userUtterance);
    console.log('user intent:' + intentName);
    console.log('slot value:' + slotValue);

    switch (intentName) {
        case 'calling':
            console.log('send mqtt topic /dev2app/36547892/call');
            client.publish('/dev2app/36547892/call', slotValue);
            break;
        default:
            replyMessage = '对不起，我暂时无法处理这个意图。';
            resultType = 'RESULT';
            bFlag = true;
            break;
    }

    setTimeout(function(){
        if(bFlag){
            let echoResponse = `
            {
                "returnCode": "0",
                "returnErrorSolution": "",
                "returnMessage": "",
                "returnValue": {
                    "reply": "${replyMessage}",
                    "resultType": "${resultType}",
                    "executeCode": "SUCCESS",
                    "msgInfo": ""
                }   
            }
                `;

            console.log('Response:' + echoResponse);
            res.append('Content-Type', 'application/json');
            res.status(200).send(echoResponse);
            replyMessage = '';
            resultType = 'RESULT';
            bFlag = false;
        }else{
            replyMessage = '响应超时，请重试。';
            resultType = 'RESULT';
            let echoResponse = `
            {
                "returnCode": "0",
                "returnErrorSolution": "",
                "returnMessage": "",
                "returnValue": {
                    "reply": "${replyMessage}",
                    "resultType": "${resultType}",
                    "executeCode": "SUCCESS",
                    "msgInfo": ""
                }   
            }
                `;

            console.log('Response:' + echoResponse);
            res.append('Content-Type', 'application/json');
            res.status(200).send(echoResponse);
            replyMessage = '';
            resultType = 'RESULT';
            bFlag = false;
        }
    }, 1000);
    
});

let server = app.listen(app.get('port'), function () {
  console.log('App listening on port %s', server.address().port);
  console.log('Press Ctrl+C to quit.');
});
