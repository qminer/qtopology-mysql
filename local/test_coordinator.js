"use strict";
const async = require("async");
const fs = require("fs");
const coor = require("../");

let config = JSON.parse(fs.readFileSync("config.json", "utf8"));

let storage = new coor.MySqlStorage(config);

const worker_name = "worker1";
let topology_config = JSON.parse(fs.readFileSync("./topology.json", "utf8"));
const uuid = "the.test.topology";
topology_config.general.uuid = uuid;

async.series(
    [
        (xcallback) => {
            storage.init(xcallback);
        },
        (xcallback) => {
            storage.getWorkerStatus((err, data) => {
                console.log("getWorkerStatus", err, data);
                xcallback();
            });
        },
        (xcallback) => {
            console.log("Registering worker");
            storage.registerWorker(worker_name, xcallback);
        },
        (xcallback) => {
            storage.getWorkerStatus((err, data) => {
                console.log("getWorkerStatus", err, data);
                xcallback();
            });
        },
        (xcallback) => {
            storage.getLeadershipStatus((err, data) => {
                console.log("getLeadershipStatus", err, data);
                xcallback();
            });
        },
        (xcallback) => {
            console.log("Registering topology");
            storage.registerTopology(topology_config, true, (err, data) => {
                xcallback();
            });
        },
        (xcallback) => {
            storage.getTopologyStatus((err, data) => {
                console.log("getTopologyStatus", err, data);
                xcallback();
            });
        },
        (xcallback) => {
            console.log("Assigning topology");
            storage.assignTopology(uuid, worker_name, xcallback);
        },
        (xcallback) => {
            storage.getTopologyStatus((err, data) => {
                console.log("getTopologyStatus", err, data);
                xcallback();
            });
        },
        (xcallback) => {
            storage.getMessages(worker_name, (err, data) => {
                console.log("getMessages", err, data);
                xcallback();
            });
        },

        (xcallback) => {
            storage.getWorkerStatus((err, data) => {
                console.log("getWorkerStatus", err, data);
                xcallback();
            });
        },
        (xcallback) => {
            console.log("Announcing leadership candidacy");
            storage.announceLeaderCandidacy(worker_name, (err) => {
                console.log("announceLeaderCandidacy", err);
                xcallback();
            });
        },
        (xcallback) => {
            storage.getWorkerStatus((err, data) => {
                console.log("getWorkerStatus", err, data);
                xcallback();
            });
        },
        (xcallback) => {
            storage.getLeadershipStatus((err, data) => {
                console.log("getLeadershipStatus", err, data);
                xcallback();
            });
        },
        (xcallback) => {
            console.log("Check leadership candidacy");
            storage.checkLeaderCandidacy(worker_name, (err, data) => {
                console.log("checkLeaderCandidacy", err, data);
                xcallback();
            });
        },
        (xcallback) => {
            storage.getWorkerStatus((err, data) => {
                console.log("getWorkerStatus", err, data);
                xcallback();
            });
        },
        (xcallback) => {
            storage.getLeadershipStatus((err, data) => {
                console.log("getLeadershipStatus", err, data);
                xcallback();
            });
        },
        (xcallback) => {
            console.log("Setting worker status");
            storage.setWorkerStatus(worker_name, "dead", (err) => {
                xcallback();
            });
        },
        (xcallback) => {
            storage.getWorkerStatus((err, data) => {
                console.log("getWorkerStatus", err, data);
                xcallback();
            });
        },
        (xcallback) => {
            storage.getLeadershipStatus((err, data) => {
                console.log("getLeadershipStatus", err, data);
                xcallback();
            });
        },
        (xcallback) => {
            storage.getTopologyStatus((err, data) => {
                console.log("getTopologyStatus", err, data);
                xcallback();
            });
        },
        (xcallback) => {
            console.log("Setting worker status");
            storage.setWorkerStatus(worker_name, "alive", (err) => {
                xcallback();
            });
        },
        (xcallback) => {
            console.log("Setting topology status to running");
            storage.setTopologyStatus(uuid, "running", null, (err) => {
                console.log("setTopologyStatus", err);
                xcallback();
            });
        },
        (xcallback) => {
            storage.getTopologyStatus((err, data) => {
                console.log("getTopologyStatus", err, data);
                xcallback();
            });
        }
    ],
    (err) => {
        if (err) {
            console.log("Error occured:", err);
        }
        console.log("Closing coordinator...");
        storage.close(() => {
            console.log("Done.");
        });
    }
)

function shutdown(err) {
    if (err) {
        console.log("Error", err);
    }
    console.log("Closing coordinator...");
    storage.close(() => {
        console.log("Done.");
    });
}

//do something when app is closing
process.on('exit', shutdown);

//catches ctrl+c event
process.on('SIGINT', shutdown);

//catches uncaught exceptions
process.on('uncaughtException', (err) => { shutdown(err); });
