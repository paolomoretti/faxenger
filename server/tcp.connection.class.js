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
    if (d.match('LOG')) {
      const now = new Date().toLocaleString("en-UK");
      console.log(`LOG ${now} from ${this.name}: ${d.replace(`LOG:`, '')}`);
      return;
    }
    if (d.match('HELP')) {
      return this.conn.write(Message.Help);
    }
    if (d.match('CLIENTS')) {
      return this.emitter.emit('CONN_WRITE', this, 'CLIENTS');
    }
    if (d.match('CLEANUP')) {
      return this.emitter.emit('CONN_WRITE', this, 'CLEANUP');
    }
    if (d.match('ALIAS:')) {
      this.name = (/ALIAS:(.*)/.exec(d))[1].trim();
      this.sysWrite(`alias set to ${this.name}`);
      return;
    }
    if (d.match('FROM:')) {
      const from = (/FROM:(.*)/.exec(d))[1].trim().split(' ')[0];
      const message = d.replace(`FROM:${from} `, '').trim();
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
