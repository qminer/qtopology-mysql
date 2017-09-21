"use strict";
const coor = require("../");
const fs = require("fs");
const qtopology = require("qtopology");

qtopology.logger().setLevel("normal");

let config = JSON.parse(fs.readFileSync("config.json", "utf8"));
let storage = new coor.MySqlStorage(config);

let cmd = new qtopology.CommandLineHandler(storage);
cmd.run(() => {
    storage.close(() => {
        qtopology.logger().log("Done.");
     })
});
