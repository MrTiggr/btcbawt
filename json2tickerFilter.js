var EventEmitter = require('events').EventEmitter;
var net = require('net');

var x03 = unescape('%03');
var IRC =
{
    green : { fg : x03 + '3', bg : x03 + '0,3' },
    red :   { fg : x03 + '4', bg : x03 + '0,4' },
    white : { fg : x03 + '0', bg : x03 + '0,1' },
    blue :  { fg : x03 + '12', bg : x03 + '0,12' },
    bold : unescape('%02'),
    end : x03
};

var canaduh = '  ' + IRC.red.fg + 'Ca' + IRC.end + 'na' + IRC.red.fg + 'di' + IRC.end + 'an '
                   + IRC.red.fg + 'Do' + IRC.end + 'll' + IRC.red.fg + 'ar' + IRC.end + '   ';

var symbolTable =
{
    'mtgoxUSD' :     [IRC.blue.fg + 'https://mtgox.com           ' + IRC.end, '     US Dollar      '],
    'btcexUSD' :     [IRC.blue.fg + 'https://btcex.com           ' + IRC.end, '     US Dollar      '],
    'b7SAR' :        [IRC.blue.fg + 'https://bitcoin7.com        ' + IRC.end, '    Saudi Riyal     '],
    'bcPGAU' :       [IRC.blue.fg + 'https://bitcoin-central.net ' + IRC.end, '    Pecunix/GAU     '],
    'thINR' :        [IRC.blue.fg + 'https://tradehill.com       ' + IRC.end, '    Indian Rupee    '],
    'bitmarketRUB' : [IRC.blue.fg + 'https://bitmarket.eu        ' + IRC.end, '   Russian Ruble    '],
    'bcmPXGAU' :     [IRC.blue.fg + 'https://bitcoinmarket.com   ' + IRC.end, '    Pecunix/GAU     '],
    'b7PLN' :        [IRC.blue.fg + 'https://bitcoin7.com        ' + IRC.end, '    Polish Zloty    '],
    'bcLREUR' :      [IRC.blue.fg + 'https://bitcoin-central.net ' + IRC.end, 'Liberty Reserve Euro'],
    'bitmarketPLN' : [IRC.blue.fg + 'https://bitmarket.eu        ' + IRC.end, '    Polish Zloty    '],
    'bcEUR' :        [IRC.blue.fg + 'https://bitcoin-central.net ' + IRC.end, '        Euro        '],
    'b7BGN' :        [IRC.blue.fg + 'https://bitcoin7.com        ' + IRC.end, '   Bulgarian Lev    '],
    'btcnCNY' :      [IRC.blue.fg + 'https://btcchina.com        ' + IRC.end, '    Chinese Yuan    '],
    'b2cUSD' :       [IRC.blue.fg + 'https://bitcoin2cash.com    ' + IRC.end, ' USD (cash by mail) '],
    'bcmLRUSD' :     [IRC.blue.fg + 'https://bitcoinmarket.com   ' + IRC.end, 'Liberty Reserve USD '],
    'thCLP' :        [IRC.blue.fg + 'https://tradehill.com       ' + IRC.end, '    Chilean Peso    '],
    'bcmMBUSD' :     [IRC.blue.fg + 'https://bitcoinmarket.com   ' + IRC.end, '  Moneybookers USD  '],
    'bcLRUSD' :      [IRC.blue.fg + 'https://bitcoin-central.net ' + IRC.end, 'Liberty Reserve USD '],
    'bcmBMUSD' :     [IRC.blue.fg + 'https://bitcoinmarket.com   ' + IRC.end, '     US Dollar      '],
    'b7EUR' :        [IRC.blue.fg + 'https://bitcoin7.com        ' + IRC.end, '        Euro        '],
    'exchbUSD' :     [IRC.blue.fg + 'https://exchangebitcoins.com' + IRC.end, '     US Dollar      '],
    'bitmarketGBP' : [IRC.blue.fg + 'https://bitmarket.eu        ' + IRC.end, '   British Pound    '],
    'thLRUSD' :      [IRC.blue.fg + 'https://tradehill.com       ' + IRC.end, 'Liberty Reserve USD '],
    'btcexUSD' :     [IRC.blue.fg + 'https://btcex.com           ' + IRC.end, '  US Dollar (wire)  '],
    'bcmPPUSD' :     [IRC.blue.fg + 'https://bitcoinmarket.com   ' + IRC.end, '  PayPal US Dollar  '],
    'bitmarketUSD' : [IRC.blue.fg + 'https://bitmarket.eu        ' + IRC.end, ' USD (wire/PayPal)  '],
    'virwoxSLL' :    [IRC.blue.fg + 'https://virwox.com          ' + IRC.end, ' SecondLife Game $$ '],
    'b7USD' :        [IRC.blue.fg + 'https://bitcoin7.com        ' + IRC.end, '     US Dollar      '],
    'britcoinGBP' :  [IRC.blue.fg + 'https://britcoin.co.uk      ' + IRC.end, '   British Pound    '],
    'bitmarketEUR' : [IRC.blue.fg + 'https://bitmarket.eu        ' + IRC.end, '    Euro (wire)     '],
    'bitomatPLN' :   [IRC.blue.fg + 'https://bitomat.pl          ' + IRC.end, '    Polish Zloty    '],
    'thAUD' :        [IRC.blue.fg + 'https://tradehill.com       ' + IRC.end, ' Australian Dollar  '],
    'thUSD' :        [IRC.blue.fg + 'https://tradehill.com       ' + IRC.end, '     US Dollar      '],
    'thCAD' :        [IRC.blue.fg + 'https://tradehill.com       ' + IRC.end, '  Canadian Dollar   '],
    'virtexCAD' :    [IRC.blue.fg + 'https://cavirtex.com        ' + IRC.end,        canaduh        ],
    'cbxUSD' :       [IRC.blue.fg + 'https://campbx.com          ' + IRC.end, '     US Dollar      '],
    'thEUR' :        [IRC.blue.fg + 'https://tradehill.com       ' + IRC.end, '        Euro        '],
    'intrsngEUR' :   [IRC.blue.fg + 'https://intersango.com      ' + IRC.end, '        Euro        '],
    'intrsngUSD' :   [IRC.blue.fg + 'https://intersango.us       ' + IRC.end, '     US Dollar      '],
};


var BUY =  IRC.green.bg + 'BUY' + IRC.end + ' ';
var SELL = IRC.red.bg + 'SELL' + IRC.end;
var UNKNOWN_TRADE = '??? ';

/** Last price by symbol, used to determine if a given trade is on a price increase or decrease. */
var getTradeType_lastPrices = {};

/** If the trade is exactly the same price as the last one then we must remember the last trade type. */
var getTradeType_lastTradeTypes = {};

/**
 * If the price has risen since the last trade then it's a buy, if it has fallen since the last
 * trade then it's a sell. If it is exactly equal to the last trade then it's the same as before.
 * If there is no data on the last trade then it's unknown.
 */
var getTradeType = function(symbol, tradePrice)
{
    var tradeType = null;
    var priceDiff = tradePrice - getTradeType_lastPrices[symbol];
    if (priceDiff < 0) {
        tradeType = SELL;
    } else if (priceDiff > 0) {
        tradeType = BUY;
    } else {
        tradeType = getTradeType_lastTradeTypes[symbol];
        if (tradeType == null) {
            tradeType = UNKNOWN_TRADE;
        }
    }
    getTradeType_lastTradeTypes[symbol] = tradeType;
    getTradeType_lastPrices[symbol] = tradePrice;

    return tradeType;
};

var dataEmitter = new EventEmitter();
var sendMessage = function(dataToSend)
{
    dataEmitter.emit('data', dataToSend + '\n');
}


/**
 * Pad the right side of a string with spaces
 *
 * @param string the string to pad
 * @param finalLength the length that the string should end up.
 * @param padLeft if set true then padding will be on the left side instead of the right.
 * @return a string with space padding.
 */
var spacePad = function(string, finalLength, padLeft)
{
    var out = string;
    var thirtySpaces = '                              ';
    while (out.length + 30 < finalLength) {
        out = (padLeft == true) ? thirtySpaces + out : out + thirtySpaces;
    }
    var finalPad = thirtySpaces.substr(0, finalLength - out.length);
    return (padLeft == true) ? finalPad + out : out + finalPad;
};

var roundAndPad = function(number, decimalPlaces)
{
    var tenZeros = '0000000000';
    var multiple = Math.pow(10, decimalPlaces);
    var numberStr = '' + (Math.round(number * multiple) / multiple);
    if (numberStr.indexOf('.') == -1) {
        numberStr = numberStr + '.';
    }
    numberStr += tenZeros.substr(0, decimalPlaces - (numberStr.length - numberStr.indexOf('.')) + 1);
    // We'll pad with 4 spaces on the left so it would take a 5 figure number to break the format.
    return spacePad(numberStr, numberStr.length + 5 - numberStr.indexOf('.'), true);
};

var handleIncoming = function(jsonEncoded)
{
    try {
        // Trim because \r\n is confusing the parser.
        var trimmedJson = jsonEncoded.replace(/^[^{]+|[^}]+$/g, '');

        // Sometimes multiple entries are sent at once.
        if (trimmedJson.indexOf('\n') != -1) {
            var entries = trimmedJson.split('\n');
            for (var i = 0; i < entries.length; i++) {
                handleIncoming(entries[i]);
            }
            return;
        }

        var data = JSON.parse(trimmedJson);

        var exchange = symbolTable[data.symbol];
        if (exchange == null) {
            process.binding('stdio').writeError('Unknown type! ' + jsonEncoded);
            return;
        }

        sendMessage(getTradeType(data.symbol, data.price) + ' ' + exchange[0]
                    + IRC.bold + roundAndPad(data.volume, 4) + IRC.bold
                    + ' BTC @'
                    + IRC.bold + roundAndPad(data.price, 4) + IRC.bold
                    + ' ' + exchange[1] + ' Total:'
                    + IRC.bold + roundAndPad(data.volume * data.price, 2) + IRC.bold);

    } catch (e) {
        process.binding('stdio').writeError('\n\n' + jsonEncoded + '\n' + e + '\n' + e.stack + '\n\n');
    }
};

// Main function
var main = function()
{
    var stdin = process.openStdin();
    var buffer = '';
    stdin.on('data', function(data) {
        buffer += '' + data;
        var newline = buffer.lastIndexOf('\n');
        if (newline === -1) {
            return;
        }
        handleIncoming(buffer.substring(0, newline + 1));
        buffer = buffer.substring(newline + 1);
    });

    dataEmitter.on('data', function(data) {
        process.stdout.write(data);
    });
};
main();
