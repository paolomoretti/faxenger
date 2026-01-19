const express = require("express");
const cookieParser = require("cookie-parser");
const CONFIG = require("./config");
const path = require("path");
const fs = require("fs");

class RoutesClass {
  server;
  constructor(app) {
    this.server = app.__server;
    app.use(
      express.json({
        limit: "50mb",
      })
    );
    app.use(cookieParser());

    app.get(`/clients`, this.getClients);
    app.post(`/set-alias`, this.setAlias);
    app.use(this.aliasChecker);
    app.post(`/message`, this.sendMessage);
    app.get(`/`, this.renderIndex);
  }

  aliasChecker = (req, res, next) => {
    console.log(`req.cookies`, req.cookies);
    if (
      !req.cookies.alias ||
      this.server.getConnectionNames().indexOf(req.cookies.alias) === -1
    ) {
      // Haven't got an alias yet, let's set it
      return res.sendFile(
        path.join(__dirname, "../", "static", "set_recipient_page.html")
      );
    }
    next();
  };

  getClients = (req, res) => {
    const clients = this.server
      .getConnectionNames()
      .filter((c) => c !== CONFIG.SERVER_SOCKER_ALIAS);
    console.log(`[getClients route] %j`, clients);
    res.send(clients);
  };

  setAlias = (req, res) => {
    if (req.body && req.body.alias) {
      const alias = req.body.alias.replace(/\s/gi, "_");
      const subscribedAliases = this.server.getConnectionNames();

      if (subscribedAliases.indexOf(alias) === -1) {
        let availableAliases = subscribedAliases.filter(
          (a) => a !== CONFIG.SERVER_SOCKER_ALIAS
        );
        if (availableAliases.length === 0) {
          availableAliases = "None";
        }
        return res.status(400).json({
          error: `Alias "${alias}" not recognised, available: ${availableAliases}`,
        });
      } else {
        return res.cookie("alias", alias).send();
      }
    }
    res.status(400).json({ error: `Can't set Alias, missing body` });
  };

  sendMessage = (req, res) => {
    const alias = req.cookies.alias;
    const msg = req.body.message;
    if (msg.startsWith(">")) {
      this.server.socket.write(msg);
    } else {
      this.server.socket.write(`FROM:${alias} ${msg}`);
    }
    res.send("ok");
  };

  renderIndex = (req, res) => {
    res.sendFile(path.join(__dirname, "../", "static", "index.html"));
  };
}

module.exports = RoutesClass;
