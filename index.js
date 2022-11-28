const express = require('express');
const CONFIG = require("./server/config");
const TcpServer = require("./server/tcp.server.class");
const RoutesClass = require("./server/routes.class");
const Message = require('./server/message.class');
const app = express();
const tcpServer = new TcpServer(app);
new RoutesClass(app);

app.on('error', (a) => console.error(`APP ERROR`, a));
app.on('mount', console.info);

tcpServer.start().then((server) => {
  app.listen(CONFIG.WEB_PORT);
  console.log('server', server);
  new Message(`Faxenger server started at ${new Date()} - ${JSON.stringify(server.server.address())}`).notify();

  const onExit = () => {
    console.info(`\nClear timeouts ...`);
    clearInterval(server.cleanerInt);
    new Message(`Faxenger server shutting down at ${new Date()}`).notify();
    console.log('done! bye bye');
    process.exit();
  }
  process.on('SIGINT', onExit);
  process.on('SIGUSR1', onExit);
  process.on('SIGUSR2', onExit);
});

process.on('uncaughtException', (e) => {
  console.log('Uncaught Exception...');
  console.log(e.stack);
  process.exit(99);
});

const onExit = () => {
  console.log('BYE BYE!');
  process.exit();
}
