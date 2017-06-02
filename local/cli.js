"use strict";
const coor = require("../");
const qtopology = require("../../qtopology");

qtopology.logger().setLevel("normal");

let coordinator = new coor.MySqlCoordinator({
    host: "localhost",
    database: "xtest",
    user: "qtopology_admin",
    password: "VSAp2BJ2",
    port: 3306
});

let cmd = new qtopology.CommandLineHandler(coordinator);
cmd.run();
