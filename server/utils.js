const path = require("path");
const TCP = require("./tcp");

module.exports = {
  aliasChecker(req, res, next) {
    const {app} = req;
    if (!app.locals.alias && !req.cookies.alias) {
      // Haven't got an alias yet, let's set it
      return res.sendFile(path.join(__dirname, '../', 'static', 'set_recipient_page.html'));
    }
    app.locals.alias = (app.locals.alias || req.cookies.alias).trim();
    next();
  },
  onError(app) {
    console.error(`APP ERROR`, app);
  },
  setRecipient(req, res) {
    const {app} = req;
    if (req.body && req.body.alias) {
      const alias = req.body.alias.replace(/\s/gi, '_');
      app.locals.alias = alias;
      app.tcpClient.write(`${TCP.SET_ALIAS_CONFIG_KEY}${alias}`);
    }
    res.cookie('alias', app.locals.alias).send();
  },
  sendMessage(req, res) {
    const msg = req.body.message;
    if (req.app.tcpClient && req.app.tcpClient.write) {
      req.app.tcpClient.write(msg);
    }
    res.send('ok');
  },
  renderIndex(req, res) {
    res.sendFile(path.join(__dirname, '../', 'static', 'index.html'));
  },
  getClients(req, res) {
    res.send({ clients: Object.keys(TCP.SOCKETS).length, addrs: Object.keys(TCP.SOCKETS)})
  }
}
