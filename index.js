const PORT = process.env.PORT || 3303;
const express = require('express');
const cookieParser = require('cookie-parser');
const {renderIndex, aliasChecker, onError, setAlias, sendMessage, getClients, sendImage} = require("./server/utils");
const {startTCPServer, SET_ALIAS_CONFIG_KEY} = require("./server/tcp");
const multer  = require('multer')
const upload = multer({});

const app = express();

app.use(express.json({limit: '50mb'}));
app.use(cookieParser());
app.get(`/clients`, getClients);
app.post(`/set-alias`, setAlias);
app.use(aliasChecker);
app.post(`/message`, sendMessage);
app.post(`/image`, upload.single('myFile'), sendImage);
app.get(`/`, renderIndex);

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

