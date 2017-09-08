"use strict";
const coor = require("../");
const fs = require("fs");
const qtopology = require("qtopology");

qtopology.logger().setLevel("normal");

let config = JSON.parse(fs.readFileSync("config.json", "utf8"));
let coordinator = new coor.MySqlCoordinator(config);
qtopology.runRepl(coordinator);
