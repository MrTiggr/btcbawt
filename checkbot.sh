#!/bin/bash

if [ ! -e ~/keepRunning ]; then
  exit 0;
fi

if [ ! -e ~/irc.pipe ]; then
  mkfifo ~/irc.pipe;
fi

if [ "`lsof | grep '^node .*:ircd (ESTABLISHED)'`" == "" ]; then
  kill `cat ~/stdin2irc.pid 2>>/dev/null` &>>/dev/null;
  node ~/stdin2irc.js < ~/irc.pipe &>> ~/stdin2irc.log &
  echo $! > ~/stdin2irc.pid
fi

if ! kill -0 `cat ~/json2tickerFilter.pid 2>>/dev/null` 2>>/dev/null; then
  tail -F ~/trades.json | node ~/json2tickerFilter.js >> ~/irc.pipe 2>> ~/json2tickerFilter.log &
  echo $! > ~/json2tickerFilter.pid
fi

if [ "`lsof | grep '^socat .* TCP .*:27007 (ESTABLISHED)'`" == "" ]; then
  kill `cat ~/socat.pid 2>>/dev/null` &>>/dev/null;
  (
    while [ 1 ]; do
      socat -u TCP4:bitcoincharts.com:27007 ~/trades.json;
      sleep 5;
      if [ ! -e ~/keepRunning ]; then
        exit 0;
      fi
    done
  ) &>>/dev/null &
  echo $! > ~/socat.pid
fi
