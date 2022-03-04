const path = require("path");
const TCP = require("./tcp");

module.exports = {
  aliasChecker(req, res, next) {
    if (!req.cookies.alias || Object.values(TCP.MAP).indexOf(req.cookies.alias) === -1) {
      // Haven't got an alias yet, let's set it
      return res.sendFile(path.join(__dirname, '../', 'static', 'set_recipient_page.html'));
    }
    next();
  },
  onError(app) {
    console.error(`APP ERROR`, app);
  },
  setAlias(req, res) {
    if (req.body && req.body.alias) {
      const alias = req.body.alias.replace(/\s/gi, '_');
      if (Object.values(TCP.MAP).indexOf(alias) === -1) {
        let availableAliases = Object.values(TCP.MAP).filter(a => a !== TCP.TCP_SERVER_ALIAS);
        if (availableAliases.length === 0) {
          availableAliases = 'None';
        }
        return res.status(400).json({ error: `Alias "${alias}" not recognised, available: ${availableAliases}`})
      } else {
        return res.cookie('alias', alias).send();
      }
      // app.locals.alias = alias;
      // app.tcpClient.write(`${TCP.SET_ALIAS_CONFIG_KEY}${alias}`);
    }
    res.status(400).json({ error: `Can't set Alias, missing body`});
  },
  sendMessage(req, res) {
    const alias = req.cookies.alias;
    const msg = req.body.message;
    if (req.app.tcpClient && req.app.tcpClient.write && alias) {
      req.app.tcpClient.write(`${TCP.SET_FROM_CONFIG_KEY}${alias} ${msg}`);
    } else {
      console.log(`SOMETHING WRONG`);
    }
    res.send('ok');
  },
  renderIndex(req, res) {
    res.sendFile(path.join(__dirname, '../', 'static', 'index.html'));
  },
  getClients(req, res) {
    const clients = Object.keys(TCP.SOCKETS).reduce((aggr, k) =>
      [{ addr: k, name: TCP.MAP[k] || 'Unknown' }, ...aggr]
    , []);
    res.send(clients.filter(c => c.name !== TCP.TCP_SERVER_ALIAS));
  }
}
