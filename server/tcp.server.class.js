const TcpConnection = require('./tcp.connection.class');
const Message = require('./message.class');
const CONFIG = require('./config');
const TcpSocket = require('./tcp.socket.class');
const net = require('net');
const EventEmitter = require('events');

class TcpServer {
  connections = {};
  socket;

  static ConnectionClearMs = 5 * 60 * 1000;

  constructor(app) {
    this.app = app;
    app.__server = this;
    this.emitter = new EventEmitter();
    this.emitter.on('CONN_WRITE', (tcpConn, code, message) => {
      console.log(`New command: code=${code}, message/action=${message}`);
      switch (code) {
        case 'CLIENTS':
          if (['show', 'list', 'ls'].includes(message)) {
            tcpConn.write(Message.Clients(this.connections));
          } else if (['cleanup', 'clean', 'clear', 'refresh'].includes(message)) {
            this.clearConnections(tcpConn);
          } else {
            tcpConn.write(Message.ClientsUnknownCommand(message));
          }
          break;
        case 'MSG_FROM':
          // In this scenario, tcpConn is the name of the connection rather than the instance of a connection
          // so we need to compare the name
          console.log(`Send message from ${tcpConn}`);
          for (const k in this.connections) {
            const conn = this.connections[k];
            if (conn.name !== tcpConn) {
              new Message(message, tcpConn).writeChunks(conn);
            }
          }
          break;
        case 'MSG':
          for (const k in this.connections) {
            const conn = this.connections[k];
            if (conn !== tcpConn) {
              new Message(message, tcpConn.name).writeChunks(conn);
            }
          }
          break;
      }
    })
  }

  clearConnections(tcpConn) {
    console.log('[clear connections] ...');
    for (const k in this.connections) {
      if (this.connections[k] !== tcpConn) {
        this.connections[k].write(`> connection test`);
      }
    }
    console.log('done!');
    if (tcpConn) {
      tcpConn.write(Message.Clients(this.connections));
    }
  }

  getConnectionNames() {
    return Object.keys(this.connections).map(k => this.connections[k].name);
  }

  onConnection(conn) {
    const onClosed = (c) => {
      delete this.connections[c.key];
    }
    const tcpConn = new TcpConnection(conn, onClosed, this.emitter);
    this.connections[tcpConn.key] = tcpConn;
  }

  async start() {
    return new Promise((resolve) => {
      this.cleanerInt = setInterval(() => {
        this.clearConnections();
      }, TcpServer.ConnectionClearMs);

      this.server = net.createServer(this.onConnection.bind(this));
      this.server.listen(CONFIG.TCP_PORT, () => {
        console.log('server listening to %j', this.server.address());
        const serverSocket = new TcpSocket(this);
        serverSocket.create().then(socket => this.socket = socket);
        resolve(this);
      });
    });
  }
}

module.exports = TcpServer;
