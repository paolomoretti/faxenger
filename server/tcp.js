const TCP_PORT = process.env.TCP_PORT || 9000;
const TCP_HOST = process.env.TCP_HOST || 'localhost';
const TCP_SERVER_ALIAS = process.env.TCP_SERVER_ALIAS || '__SERVER__';
const net = require("net");

const SET_ALIAS_CONFIG_KEY = 'ALIAS:';
const SET_FROM_CONFIG_KEY = 'FROM:';
const SOCKETS = {};
const MAP = {};

const getName = (addr) => MAP[addr] || addr;
const getSockets = () => Object.keys(SOCKETS);
const getOtherSockets = (addr) => getSockets().filter(s => s !== addr);
const getOtherSocketsByName = (name) => Object.keys(MAP).filter(s => MAP[s] !== name);
const getOtherSocketNames = (addr, list = getOtherSockets(addr)) => list.map(getName);

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
    d = d.trim();
    let message = d + "\n";
    let recipientAddrs = getOtherSockets(source);
    let recipientNames = getOtherSocketNames(source);
    let fromName = getName(source);

    if (d === '') {
      return;
    }
    if (d.match('HELP')) {
      return conn.write(`
*******************
** Faxenger help **
*******************
Commands:
> GET_CLIENTS - display the list of connected clients
> LOG:{1} - display log 
> ALIAS:{1} - set the alias for the client address
> FROM:{1} {2} - force the sender to the passed alias ({1}) and send message ({2})\n\n`);
    }
    if (d.match('GET_CLIENTS')) {
      return conn.write(`> ${getSockets().map(getName).join(`
> `)}
\n`);
    }
    if (d.indexOf('LOG:') === 0) {
      // This is a log from the client
      const now = new Date().toLocaleString("en-UK");
      console.log(`LOG ${now} from ${getName(source)}: ${d.replace(`LOG:`, '')}`);
      return;
    }
    if (d.indexOf('keep-alive') > -1) {
      console.log(`KEEP-ALIVE message, skip`);
      return;
    }
    if (d.indexOf(SET_ALIAS_CONFIG_KEY) === 0) {
      MAP[source] = d.split(SET_ALIAS_CONFIG_KEY)[1];
      console.log(`[${source}] alias set to ${fromName}`);
      return conn.write(`> alias correctly set to ${MAP[source]} (${source})\n\n`);
    }
    if (d.indexOf(SET_FROM_CONFIG_KEY) === 0) {
      fromName = d.split(SET_FROM_CONFIG_KEY)[1].split(' ')[0];
      message = d.replace(`${SET_FROM_CONFIG_KEY}${fromName} `, '');
      recipientAddrs = getOtherSocketsByName(fromName);
      recipientNames = getOtherSocketNames(fromName, recipientAddrs);
    }
    console.log(`Received "${message}" from ${fromName}. Broadcast to ${recipientNames}`);
    recipientAddrs.forEach(addr =>
      SOCKETS[addr].write(TCP.transformMessage(message, fromName))
    );
    conn.write(`> message sent\n\n`)
  }
  function onConnClose() {
    delete SOCKETS[source];
    delete MAP[source];
    console.log(`[${getName(source)}] bye bye ${getName(source)} (${Object.keys(SOCKETS).length} left)`);
  }
  function onConnError(err) {
    console.error(`[${getName(source)}] connection error: ${err.message}`);
  }
}

const TCP = {
  SOCKETS,
  MAP,
  SET_ALIAS_CONFIG_KEY,
  SET_FROM_CONFIG_KEY,
  TCP_SERVER_ALIAS,
  transformMessage(msg, sourceName) {
    const now = new Date().toLocaleString("en-UK");
    return `${now}\nFrom ${sourceName}:\n${msg}\n\n`;
  },
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
        console.log(`Socket received: \n**********\n` + data + `**********`);
      });

      client.on('close', function() {
        console.log('Connection closed');
        resolve();
      });
      app.tcpClient = client;
      client.write(`ALIAS:${TCP_SERVER_ALIAS}`);
      return client;
    });
  }
}

module.exports = TCP;
