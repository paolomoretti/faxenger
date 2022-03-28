const TcpConnection = require('./tcp.connection.class');
const Message = require('./message.class');
const CONFIG = require('./config');
const TcpSocket = require('./tcp.socket.class');
const net = require('net');
const EventEmitter = require('events');

class TcpServer {
  connections = {};
  socket;

  constructor(app) {
    this.app = app;
    app.__server = this;
    this.emitter = new EventEmitter();
    this.emitter.on('CONN_WRITE', (tcpConn, code, message) => {
      switch (code) {
        case 'CLIENTS':
          tcpConn.write(Message.Clients(this.connections));
          break;
        case 'CLEANUP':
          for (const k in this.connections) {
            if (this.connections[k] !== tcpConn) {
              this.connections[k].write(`> connection test`);
            }
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
      this.server = net.createServer(this.onConnection.bind(this));
      this.server.listen(CONFIG.TCP_PORT, () => {
        console.log('server listening to %j', this.server.address());
        const serverSocket = new TcpSocket(this);
        serverSocket.create().then(socket => this.socket = socket);
        resolve();
      });
    });
  }
}

module.exports = TcpServer;
