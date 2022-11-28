const Message = require('./message.class');

class TcpConnection {
  constructor(conn, onClosed, emitter) {
    this.conn = conn;
    this.emitter = emitter;
    this.onClosed = onClosed || function () {};
    this.source = this.getSource();
    this.name = this.source;
    this.key = Math.random() * new Date().getTime() + this.source;

    this.conn.setEncoding('utf8');
    this.conn.once('close', this.onClose.bind(this));
    this.conn.on('error', this.onError.bind(this));
    this.conn.on('data', this.onData.bind(this));

    console.log(`new TCP connection from %j`, this.addr());
  }

  write(m) {
    this.conn.write(m);
  }

  sysWrite(m) {
    this.conn.write(`> ${m}\n\n`);
  }

  onData(d) {
    d = d.trim();
    if (d === '') {
      return;
    }
    if (d.match('keep-alive')) {
      console.log(`KEEP-ALIVE message, skip`);
      return;
    }
    if (d.match(/log/i)) {
      const now = new Date().toLocaleString("en-UK");
      console.log(`LOG ${now} from ${this.name}: ${d.replace(`LOG:`, '')}`);
      return;
    }
    if (d.match(/help/i)) {
      return this.conn.write(Message.Help);
    }
    const clientsCommand = d.match(/^clients (\w*)$/);
    if (clientsCommand) {
      return this.emitter.emit('CONN_WRITE', this, 'CLIENTS', clientsCommand[1].trim());
    }
    if (d.match(/cleanup/i)) {
      return this.emitter.emit('CONN_WRITE', this, 'CLEANUP');
    }
    if (d.match(/alias:/i)) {
      this.name = (/alias:(.*)/i.exec(d))[1].trim();
      this.sysWrite(`alias set to ${this.name}`);
      return;
    }
    if (d.match(/from:/i)) {
      const from = (/from:(.*)/i.exec(d))[1].trim().split(' ')[0];
      const message = d.replace(`FROM:${from} `, '').replace(`from:${from} `, '').trim();
      this.emitter.emit('CONN_WRITE', from, 'MSG_FROM', message);
      return;
    }
    // Send normal message
    this.emitter.emit('CONN_WRITE', this, 'MSG', d);
    this.sysWrite(`message processed`);
  }

  onError(err) {
    console.error(`[CONNECTION ERROR] ${this.name}: ${err.message}`);
  }

  onClose() {
    console.log(`[CLOSED CONNECTION] bye bye ${this.name}`);
    this.onClosed(this);
  }

  addr() {
    return this.conn.address();
  }

  getSource() {
    const { remoteAddress, remotePort } = this.conn;
    return `${remoteAddress}:${remotePort}`;
  }
}

module.exports = TcpConnection;
