"use strict";

const qtopology = require("qtopology");
const coor = require("../");

//qtopology.logger().setLevel("normal");

let coordinator = new coor.MySqlCoordinator({
    host: "localhost",
    database: "xtest",
    user: "qtopology_admin",
    password: "VSAp2BJ2",
    port: 3306
});

///////////////////////////////////////////////////////////////////////

let cmdln = new qtopology.CmdLineParser();
cmdln
    .define('n', 'name', 'worker1', 'Logical name of the worker');
let opts = cmdln.process(process.argv);

let w = new qtopology.TopologyWorker(opts.name, coordinator);
w.run();

function shutdown() {
    if (w) {
        w.shutdown((err) => {
            if (err) {
                console.log("Error while global shutdown:", err);
            }
            console.log("Shutdown complete");
            process.exit(1);
        });
        w = null;
    }
}

setTimeout(() => { shutdown(); }, 200000);
