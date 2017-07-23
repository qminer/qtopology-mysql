"use strict";

const coor = require("../");
const fs = require("fs");
const qtopology = require("qtopology");

qtopology.logger().setLevel("normal");

let config = JSON.parse(fs.readFileSync("config.json", "utf8"));

let coordinator = new coor.MySqlCoordinator(config);
let server = new qtopology.DashboardServer();
server.init(3000, coordinator, function () {
    server.run();
});
