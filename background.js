/* Event: Runs when extension is installed */
chrome.runtime.onInstalled.addListener(function () {

  // Set which URL the extension can run on
  chrome.declarativeContent.onPageChanged.removeRules(undefined, function () {
    chrome.declarativeContent.onPageChanged.addRules([{
      conditions: [
        new chrome.declarativeContent.PageStateMatcher({
          pageUrl: { hostEquals: 'wefinex.net' }
        }),
      ],
      actions: [new chrome.declarativeContent.ShowPageAction()]
    }]);
  });

});

let UP = +1;
let DOWN = -1;
let NONE = 0;

let timer;
let timerInterval = 60 * 1000;  //seconds

/* Event: Runs when background receives a message */
chrome.runtime.onMessage.addListener(
  function (request, sender, sendResponse) {

    // Execute action
    // console.log('onMessage, ' + request.action + ', time = ' + new Date().getSeconds());
    if (request.action == "start") {
      start();
    } else if (request.action == "stop") {
      stop();
    }

    // Send response back to caller (popup.js)
    // Note: This is required even when we're not sending anything back.
    sendResponse();
  }
);

let THRESH_HOLD = 27;

function start() {
  var timeWait;

  var now = new Date().getSeconds();

  if (now >= THRESH_HOLD && now < 30) {
    timeWait = 0;
  }

  if (now < THRESH_HOLD) {
    timeWait = THRESH_HOLD - now;
  }

  if (now >= 30) {
    timeWait = 60 - now + THRESH_HOLD;
  }

  var time = now < 30 ? 30 - now : 60 - now;
  var print = now < 30 ? 'Now is second ' + time + ' of Order candle' : 'Now is second ' + time + ' of Result candle';
  console.log('Starting BOT >>> Please wait ... ' + print);

  setTimeout(function () {
    timer = setInterval(doWork, timerInterval)
  }, timeWait * 1000);

}

function stop() {
  clearInterval(timer);
  console.log('Stopped BOT!');
}

let pageAction = NONE;

async function doWork() {

  console.log('doWork, now = second ' + new Date().getSeconds());

  await getDataAndAnalysis();

  if (CANDLE_DATA.length == 0) {
    return;
  }

  if (canUp()) {
    pageAction = UP;
  } else if (canDown()) {
    pageAction = DOWN;
  } else {
    pageAction = NONE;
  }

  chrome.tabs.query({ active: true }, function (tabs) {

    chrome.tabs.executeScript(tabs[0].id, { code: 'var page_action="' + pageAction + '";' },
      function () {
        chrome.tabs.executeScript(tabs[0].id, { file: 'contentscript.js' });
        pageAction = NONE;
      }
    );

  });
}


const prefix_api_url_1m = "https://api.binance.com/api/v1/klines?symbol=BTCUSDT&interval=1m&limit=";


// var DATA = {
//   openTime: '',
//   openPrice: '',
//   highPrice: '',
//   lowPrice: '',
//   closePrice: '',
//   volume: '',
//   closeTime: '',
//   quoteVolume: '',
//   numberOfTrade: '',
//   takerBaseVolume: '',
//   takerQuoteVoume: '',
//   Ignore: ''
// }

const SIZE = 10;
var CANDLE_DATA = [];
var currentCandle = new Object();
var prevCandle = new Object();

async function getDataAndAnalysis() {
  const response1m = await fetch(prefix_api_url_1m + SIZE);
  var data1m = await response1m.json();

  for (var i = 0; i < SIZE; i++) {
    var data = data1m[i];

    var candle = {
      openPrice: parseFloat(data[1]),
      highPrice: parseFloat(data[2]),
      lowPrice: parseFloat(data[3]),
      closePrice: parseFloat(data[4]),
      volume: parseFloat(data[5])
    };

    CANDLE_DATA[i] = JSON.parse(JSON.stringify(candle));
  }

  currentCandle = JSON.parse(JSON.stringify(CANDLE_DATA[SIZE - 1]));
  prevCandle = JSON.parse(JSON.stringify(CANDLE_DATA[SIZE - 2]));
}

// ========== Resulting =================

function canUp() {
  var hardSP = isHardSP();
  var haramiBull = isHaramiBull();
  var bouceDown = isBouceDownCandleInUptrend();
  console.log('checking can Up : hardSP = ' + hardSP + ', haramiBull = ' + haramiBull + ', bouceDown = ' + bouceDown);
  return (hardSP && haramiBull) || bouceDown;
}

function canDown() {
  var hardRS = isHardRS();
  var haramiBear = isHaramiBear();
  var bouceUp = isBouceUpCandleInDowntrend();
  console.log('checking can DOWN : hardRS = ' + hardRS + ', haramiBear = ' + haramiBear + ', bouceUp = ' + bouceUp);
  return (hardRS && harami) || bouceUp;
}


// ========== Single candle forming =================

let GOOD_TAIL = 10;
let GOOD_HARAMI_FORM = 50;  // % (open - close) so vs tong chieu dai nen


function isStrongBull(candle) {
  var range = candle.highPrice - candle.lowPrice;

  if (isBullCandle(candle) &&
    ((candle.openPrice - candle.lowPrice) < GOOD_TAIL * range / 100) &&
    ((candle.highPrice - candle.closePrice) < GOOD_TAIL * range / 100)) {
    return true;
  }
  return false;
}

function isStrongBear(candle) {
  var range = candle.highPrice - candle.lowPrice;
  if (isBearCandle(candle) &&
    ((candle.closePrice - candle.lowPrice) < GOOD_TAIL * range / 100) &&
    ((candle.highPrice - candle.openPrice) < GOOD_TAIL * range / 100)) {
    return true;
  }
  return false;

}

function isHaramiBull(candle) {
  var range = candle.highPrice - candle.lowPrice;

  if (isBullCandle(candle) &&
    ((candle.openPrice - candle.lowPrice) <= GOOD_TAIL * range / 100) &&
    ((candle.closePrice - candle.openPrice) <= GOOD_HARAMI_FORM * range / 100)) {
    return true;
  }
  return false;

}

function isHaramiBear(candle) {
  var range = candle.highPrice - candle.lowPrice;

  if (isBearCandle(candle) &&
    ((candle.highPrice - candle.openPrice) <= GOOD_TAIL * range / 100) &&
    ((candle.openPrice - candle.closePrice) <= GOOD_HARAMI_FORM * range / 100)) {
    return true;
  }
  return false;
}


function isBullCandle(candle) {
  return candle.closePrice > candle.openPrice;
}

function isBearCandle(candle) {
  return candle.closePrice < candle.openPrice;
}

// ========== double candle forming =================


let GOOD_PERCENT_BOUNCE = 0.8;

function isBouceUpCandleInDowntrend() {
  var prevRange = prevCandle.highPrice - prevCandle.lowPrice; // nen 1 do, nen 2 xanh
  return downTrend() && isStrongBear(prevCandle) && (currentCandle.closePrice - prevCandle.lowPrice) / prevRange > GOOD_PERCENT_BOUNCE;

}

function isBouceDownCandleInUptrend() {
  var prevRange = prevCandle.highPrice - prevCandle.lowPrice; // nen 1 xanh, nen 2 do
  return upTrend() && isStrongBull(prevCandle) && (prevCandle.highPrice - currentCandle.closePrice) / prevRange > GOOD_PERCENT_BOUNCE;
}

// ========== Support, Resistance =================

let NUMBER_OF_CHOP = 3;

function isHardSP() {
  var insideChopBottom = 0;

  for (var i = 0; i < SIZE; i++) {
    var candle = CANDLE_DATA[i];
    if (currentCandle.closePrice > candle.lowPrice && currentCandle.closePrice < candle.openPrice) {
      insideChopBottom++;
    }
  }

  if (insideChopBottom > NUMBER_OF_CHOP) return true;

  return false;
}

function isHardRS() {
  var insideChopTop = 0;

  for (var i = 0; i < SIZE; i++) {
    var candle = CANDLE_DATA[i];
    if (currentCandle.closePrice > candle.openPrice && currentCandle.closePrice < candle.highPrice) {
      insideChopTop++;
    }
  }

  if (insideChopTop > NUMBER_OF_CHOP) return true;

  return false;
}

// ========== Trending =================

function MA() {
  var total;
  for (var i = 0; i < SIZE; i++) {
    var candle = CANDLE_DATA[i];
    total += candle.closePrice;
  }
  return total / SIZE;
}

function upTrend() {
  return (currentCandle.closePrice > MA() && prevCandle.closePrice > MA());
}

function downTrend() {
  return (currentCandle.closePrice < MA() && prevCandle.closePrice < MA());
}