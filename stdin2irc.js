var irc = require('/home/btcbawt/irc.js');
var EventEmitter = require('events').EventEmitter;

var awakener = new EventEmitter();

var thisBot = 'btcbawt';

var sendMessageInternal = function(data) { console.log(data); };

// sendMessage (flood control mechanism)
var sendMessage_floodCounter = 0;
var sendMessage_sendQueue = [];

var bytesPerSecond = 128;
var secondsGraceTime = 8;
var stopOnThrottleSeconds = 7;

// Init flood protection counter.
(function() {
    var checkEveryMilliseconds = 50;

    var subtractionAmount = bytesPerSecond * (checkEveryMilliseconds / 1000);

    var reduceCounter = function() {
        sendMessage_floodCounter -= subtractionAmount;
        if (sendMessage_floodCounter < 0) {
            sendMessage_floodCounter = 0;
        } else {
            setTimeout(reduceCounter, checkEveryMilliseconds);
        }
    };

    var idle = true;

    // Loop function which sends the actual data.
    var sendFunction = function()
    {
        var maxSendCycle = 1000;
        var minSendCycle = 100;
        var pollingRate = 50;
        var floodCounterMax = secondsGraceTime * bytesPerSecond;

        var toSend = sendMessage_sendQueue.shift();
        if (toSend == null) {
            idle = true;
        } else if (sendMessage_floodCounter + toSend.length < floodCounterMax) {
            sendMessageInternal(toSend);
            if (sendMessage_floodCounter == 0) {
                // If it has stopped then restart it.
                setTimeout(reduceCounter, checkEveryMilliseconds);
            }
            sendMessage_floodCounter += toSend.length;
            // Linear backoff algorithm
            var floodPercent = sendMessage_floodCounter / floodCounterMax;
            setTimeout(sendFunction, floodPercent * maxSendCycle + minSendCycle);
        } else {
            setTimeout(sendFunction, minSendCycle);
        }
    };

    awakener.on('wakeup', function() {
        if (idle == true) {
            idle = false;
            sendFunction();
        }
    });
})();

(function() {
    var channel = '#bitcoin-market';
    var nick = thisBot;
    var ircds = [
        '209.222.22.22','216.193.223.223','216.218.132.58','217.17.33.10',
        '66.225.225.225','67.218.118.62','85.236.110.228','128.39.65.230',
        '141.213.238.252','192.116.231.44','193.109.122.77','193.163.220.3',
        '194.109.129.220','195.140.202.142','198.3.160.3','198.252.144.2',
        '205.188.234.121','208.51.40.2','208.167.236.6'
    ];

    var client = new irc.Client(ircds, thisBot, {
        channels: [channel],
        userName: 'user',
        realName: 'bitcoin ticker, complain to cjd',
        showErrors: true,
        debug: true
    });
    client.on('raw', function(content) {
        console.log(content.raw);
        if (content.command == 'NOTICE' && content.server && content.raw.indexOf('flooding') != -1) {
            // Make sure it will not send another message for at least stopOnThrottleSeconds seconds.
            sendMessage_floodCounter += bytesPerSecond * stopOnThrottleSeconds;
            bytesPerSecond -= 5;
            console.log('bytesPerSecond = ' + bytesPerSecond);
        }
    });
    client.on('join', function(chan, nickName) {
        if (nickName == client.nick) {
            client.say(chan, "hai");
            if (chan == channel) {
                sendMessageInternal = function(content) { client.say(channel, content); };
            }
        }
    });
})();

(function() {
    var stdin = process.openStdin();
    var buffer = '';
    stdin.on('data', function(data) {
        buffer += '' + data;
        var newline = buffer.lastIndexOf('\n');
        if (newline === -1) {
            return;
        }
        var lines = buffer.substring(0, newline).split('\n');
        for (var i = 0; i < lines.length; i++) {
            sendMessage_sendQueue.push(lines[i]);
            awakener.emit('wakeup');
        }
        buffer = buffer.substring(newline + 1);
    });
})();
