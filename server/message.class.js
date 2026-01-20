const Message = class {
  static Help = `
*******************
** Faxenger help **
*******************
Commands:
> CLIENTS - display the list of connected clients
> LOG:{1} - display log 
> ALIAS:{1} - set the alias for the client address
> CLEANUP - validate the clients and remove those that don't respond
> FROM:{1} {2} - force the sender to the passed alias ({1}) and send message ({2})

`;
  static Clients = (conns) => `
${Object.keys(conns)
  .map((k) => `> ${conns[k].name}`)
  .join(`\n`)}
  \n`;

  constructor(message, from) {
    this.message = message;
    this.from = from;
  }

  getDate() {
    return new Date().toLocaleString("en-UK");
  }

  getChunks() {
    const chunks = [`${this.getHeading()}\n`];
    for (let i = 0; i < this.message.length; i++) {
      const c = this.message[i];
      chunks[chunks.length - 1] = `${chunks[chunks.length - 1]}${c}`;
    }
    chunks[chunks.length - 1] += this.getFooter();
    return chunks;
  }

  getHeading() {
    return `${this.getDate()}\nFrom ${this.from}:`;
  }
  getFooter() {
    return ``;
  }

  toString() {
    return `${this.getHeading()}\n${this.message}${this.getFooter()}`;
  }

  async writeChunks(conn) {
    const chunks = this.getChunks();
    const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    const CHAR_TIME = 80;
    const COMMAND_TIME = 200;

    for (let chunk of chunks) {
      conn.write(chunk);
      if (chunk.indexOf(">") === -1) {
        await sleep(chunk.length * CHAR_TIME);
      } else {
        await sleep(COMMAND_TIME);
      }
    }
  }
};
module.exports = Message;
