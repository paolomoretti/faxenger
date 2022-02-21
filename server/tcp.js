const TCP_PORT = process.env.TCP_PORT || 9000;
const TCP_HOST = process.env.TCP_HOST || 'localhost';
const net = require("net");

const SET_ALIAS_CONFIG_KEY = 'ALIAS:';
const SOCKETS = {};
const MAP = {};

const getName = (addr) => MAP[addr] || addr;
const getSockets = () => Object.keys(SOCKETS);
const getOtherSockets = (addr) => getSockets().filter(s => s !== addr);
const getOtherSocketNames = (addr) => getOtherSockets(addr).map(getName);

function handleConnection(conn) {
  console.log(`New TCP connection`, conn.address());
  const { remoteAddress, remotePort } = conn;
  const source = `${remoteAddress}:${remotePort}`;

  if (!SOCKETS[source]) {
    SOCKETS[source] = conn;
  }
  conn.setEncoding('utf8');
  conn.on('data', onConnData);
  conn.once('close', onConnClose);
  conn.on('error', onConnError);

  function onConnData(d) {
    const now = new Date().toLocaleString("en-UK");
    d = d.trim();
    if (d.indexOf(SET_ALIAS_CONFIG_KEY) === 0) {
      MAP[source] = d.split(SET_ALIAS_CONFIG_KEY)[1];
      console.log(`[${source}] alias set to ${getName(source)}`);
      return;
    }
    console.log(`Received "${d}" from ${getName(source)}. Broadcast to ${getOtherSocketNames(source)}`);
    getOtherSockets(source).forEach(addr =>
      SOCKETS[addr].write(`${now}\nFrom ${getName(source)}:\n${d}\n\n----------\n`)
    );
  }
  function onConnClose() {
    delete SOCKETS[source];
    console.log(`[${getName(source)}] bye bye ${getName(source)} (${Object.keys(SOCKETS).length} left)`);
  }
  function onConnError(err) {
    console.error(`[${getName(source)}] connection error: ${err.message}`);
  }
}

const TCP = {
  SOCKETS: SOCKETS,
  async startTCPServer(app) {
    return new Promise(resolve => {
      try {
        const server = net.createServer(handleConnection);
        server.once('error', function (e) {
          if (e.code === 'EADDRINUSE') {
            console.log('Master is already app, listen to it');
            return TCP.createTCPSocket(app);
          }
        });
        server.listen(TCP_PORT, async function () {
          console.log('server listening to %j', server.address());
          await TCP.createTCPSocket(app);
          resolve();
        });
      } catch (e) {
        console.error(`Error creating TCP server: ${e.message}`);
        resolve();
      }
    })
  },
  createTCPSocket(app) {
    return new Promise(resolve => {
      const client = new net.Socket();
      client.connect(TCP_PORT, TCP_HOST, function() {
        console.log('Socket Connected');
        resolve();
      });

      client.on('data', function(data) {
        console.log(`Socket received: ` + data);
      });

      client.on('close', function() {
        console.log('Connection closed');
        resolve();
      });
      app.tcpClient = client;
      return client;
    });
  },
  SET_ALIAS_CONFIG_KEY
}

module.exports = TCP;