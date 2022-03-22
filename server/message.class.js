const Message = class {
  constructor(message, from) {
    this.message = message;
    this.from = from;
  }

  getDate() {
    return new Date().toLocaleString("en-UK");
  }

  toString() {
    return `${this.getDate()}\nFrom ${this.from}:\n${this.message}\n\n`;
  }
}
module.exports = Message;
