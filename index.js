const PORT = process.env.PORT || 3303;
const express = require('express');
const cookieParser = require('cookie-parser');
const {renderIndex, aliasChecker, onError, setRecipient, sendMessage, getMessages, getClients} = require("./server/utils");
const {startTCPServer, SET_ALIAS_CONFIG_KEY} = require("./server/tcp");

const app = express();

app.use(express.json());
app.use(cookieParser());
app.post(`/set-recipient`, setRecipient);
app.use(aliasChecker);
app.post(`/message`, sendMessage);
app.get(`/`, renderIndex);
app.get(`/messages`, getMessages);
app.get(`/clients`, getClients);

app.on('error', onError);
app.on('mount', console.info);

startTCPServer(app).then(() => {
  console.log(`WebServer listening port %s`, PORT);
  app.listen(PORT);
  app.tcpClient.write(`${SET_ALIAS_CONFIG_KEY}server`);
});

process.on('uncaughtException', (e) => {
  console.log('Uncaught Exception...');
  console.log(e.stack);
  process.exit(99);
});
