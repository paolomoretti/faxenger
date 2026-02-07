const RoutesClass = require("../server/routes.class");
// We assume execution from project root, but require paths are relative to this file.
// If running `node tests/test_alias_checker.js` from root, verify path behavior.

const mockServer = {
  getConnectionNames: () => ["Pablo", "OtherUser"],
};

const mockApp = {
  __server: mockServer,
  use: () => {},
  get: () => {},
  post: () => {},
};

console.log("Instantiating RoutesClass...");
const routes = new RoutesClass(mockApp);
console.log("RoutesClass instantiated.");

// Test 1: User found via query param (case insensitive)
console.log("Test 1: User found via query param (case insensitive)");
{
  const req = {
    query: { user: "pablo" }, // lowercase 'pablo' vs 'Pablo'
    cookies: {},
  };

  let cookieSet = false;
  let redirectUrl = null;

  const res = {
    cookie: (name, val) => {
      if (name === "alias" && val === "Pablo") {
        cookieSet = true;
      }
      return res; // chainable
    },
    redirect: (url) => {
      redirectUrl = url;
      return res;
    },
    sendFile: (path) => {
      console.log("sendFile called (unexpected for Test 1)", path);
    },
    status: (code) => res,
    json: (obj) => res,
  };

  const next = () => {
    console.error("FAILED: next() called unexpectedly in Test 1");
  };

  routes.aliasChecker(req, res, next);

  if (cookieSet && redirectUrl === "/") {
    console.log("PASSED: Cookie set and redirected to /");
  } else {
    console.error("FAILED: Expected cookie set and redirect.", {
      cookieSet,
      redirectUrl,
    });
    process.exit(1);
  }
}

// Test 2: User NOT found via query param
console.log("\nTest 2: User NOT found via query param");
{
  const req = {
    query: { user: "unknownUser" },
    cookies: {},
  };

  let redirectCalled = false;
  let sendFileCalled = false;

  const res = {
    cookie: () => res,
    redirect: () => {
      redirectCalled = true;
      return res;
    },
    sendFile: () => {
      sendFileCalled = true;
      return res;
    },
  };

  const next = () => {
    console.log("next() called (unexpected if no cookie set)");
  };

  routes.aliasChecker(req, res, next);

  if (!redirectCalled && sendFileCalled) {
    console.log(
      "PASSED: Redirect NOT called, fell through to sendFile (login page)",
    );
  } else {
    console.error("FAILED:", { redirectCalled, sendFileCalled });
    process.exit(1);
  }
}

// Test 3: Standard behavior (no query param, valid cookie)
console.log("\nTest 3: Valid cookie provided");
{
  const req = {
    query: {},
    cookies: { alias: "Pablo" },
  };

  let nextCalled = false;

  const res = {
    sendFile: () => console.log("sendFile called (unexpected)"),
    redirect: () => console.log("redirect called (unexpected)"),
  };

  const next = () => {
    nextCalled = true;
  };

  routes.aliasChecker(req, res, next);

  if (nextCalled) {
    console.log("PASSED: next() called");
  } else {
    console.error("FAILED: next() NOT called");
    process.exit(1);
  }
}
