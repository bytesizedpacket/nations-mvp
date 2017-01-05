@echo off
if exist "node_modules\*" (
    echo Node plugins already installed
    node server.js
) else (
    echo Node plugins not installed - installing now...
    npm install
    node server.js
)