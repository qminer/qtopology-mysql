"use strict";
const coor = require("../");
const qtopology = require("qtopology");

qtopology.logger().setLevel("normal");

let coordinator = new coor.MySqlCoordinator({
    host: "localhost",
    database: "xtest",
    user: "qtopology_admin",
    password: "VSAp2BJ2",
    port: 3306
});

let server = new qtopology.DashboardServer();
server.init(3000, coordinator, function () {
    server.run();
});
