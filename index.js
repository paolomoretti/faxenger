const express = require('express');
const CONFIG = require("./server/config");
const TcpServer = require("./server/tcp.server.class");
const RoutesClass = require("./server/routes.class");

const app = express();
const tcpServer = new TcpServer(app);
new RoutesClass(app);

app.on('error', (a) => console.error(`APP ERROR`, a));
app.on('mount', console.info);

tcpServer.start().then(() => {
  console.log(`DONE!`);
  app.listen(CONFIG.WEB_PORT);
});

process.on('uncaughtException', (e) => {
  console.log('Uncaught Exception...');
  console.log(e.stack);
  process.exit(99);
});

