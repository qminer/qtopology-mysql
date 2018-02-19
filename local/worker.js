"use strict";

const qtopology = require("qtopology");
const fs = require("fs");
const coor = require("../");

let config = JSON.parse(fs.readFileSync("config.json", "utf8"));
let storage = new coor.MySqlStorage(config);

///////////////////////////////////////////////////////////////////////

let cmdln = new qtopology.CmdLineParser();
cmdln
    .define('n', 'name', 'worker1', 'Logical name of the worker');
let opts = cmdln.process(process.argv);
let w = null;
storage.init((err) => {
    if (err) {
        console.log(err);
        return;
    }
    let w = new qtopology.TopologyWorker({ name: opts.name, storage: storage });
    w.run();
    setTimeout(() => { shutdown(); }, 200000);
})

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
