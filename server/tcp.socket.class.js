const net = require('net');
const CONFIG = require('./config');

class TcpSocket {
  constructor(server) {
    this.server = server;
  }
  async create() {
    return new Promise((resolve) => {
      this.client = new net.Socket();
      this.client.connect(CONFIG.TCP_PORT, CONFIG.TCP_HOST, function() {
        console.log('Socket Connected');
        resolve(this);
      });
      this.client.on('data', function(data) {
        console.log(`Server socker received: ` + data);
      });
      this.client.on('close', function() {
        console.log('Server socker connection closed');
        resolve(this);
      });
      this.server.app.tcpClient = this.client;
      this.client.write(`ALIAS:${CONFIG.SERVER_SOCKER_ALIAS}`);
    });
  }
}

module.exports = TcpSocket;
