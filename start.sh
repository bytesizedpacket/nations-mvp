#!/bin/sh
if [ ! -f /usr/bin/node ] ; then
  sudo ln -s `which nodejs` /usr/bin/node
fi
if [ -d node_modules/ ]
then
  echo "Node modules already installed, starting server..."
  node server.js
else
  echo "Node modules not installed - installing..."
  npm install
  node server.js
fi
