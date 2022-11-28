const axios = require("axios");
const Message = class {
  static Help = `
*******************
** Faxenger help **
*******************
Commands:
> clients list|show|ls - display the list of connected clients
> clients cleanup|clear|refresh|clean - validate the clients and remove those that don't respond
> log:{1} - display log 
> alias:{1} - set the alias for the client address
> from:{1} {2} - force the sender to the passed alias ({1}) and send message ({2})

`;
  static ClientsUnknownCommand = (command) => `> Unknown clients command "${command}"\n`;

  static Clients = (conns) => `
${Object.keys(conns).map(k => `> ${conns[k].name}`).join(`\n`)}
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
    for (let i = 0; i<this.message.length; i++) {
      const c = this.message[i];
      if (c !== '<') {
        chunks[chunks.length - 1] = `${chunks[chunks.length - 1]}${c}`;
      } else {
        // Opening a tag, what tag?
        switch (this.message[i + 1]) {
          case '/':
            chunks.push(`>reset`);
            i = i + 3;
            break
          case 'b':
            chunks.push(`>doubleWidthOn`);
            i = i + 2;
            break;
          case 'h':
            chunks.push(`>inverseOn`);
            i = i + 2;
            break;
        }
        chunks.push('');
      }
    }
    chunks[chunks.length - 1] += this.getFooter();
    return chunks;
  }

  getHeading() {
    return `${this.getDate()}\nFrom ${this.from}:`;
  }
  getFooter() {
    return `\n \n***\n \n \n`;
  }

  toString() {
    return `${this.getHeading()}\n${this.message}${this.getFooter()}`;
  }

  notify(text) {
    return axios.post(`https://api.telegram.org/bot5127335905:AAF4sqJtVMKFYLa8C9fAFJQxRyiOYLA1H_U/sendMessage`,  {
      chat_id: "-790930077",
      text: text || this.message || "NO_MESSAGE"
    })
  }

  async writeChunks(conn) {
    this.notify(this.message);
    const chunks = this.getChunks();
    const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
    const CHAR_TIME = 80;
    const COMMAND_TIME = 200;

    for (let chunk of chunks) {
      conn.write(chunk);
      if (chunk.indexOf('>') === -1) {
        await sleep(chunk.length * CHAR_TIME);
      } else {
        await sleep(COMMAND_TIME);
      }
    }
  }
}
module.exports = Message;
