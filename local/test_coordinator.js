"use strict";
const async = require("async");
const fs = require("fs");
const coor = require("../");

let coordinator = new coor.MySqlCoordinator({
    host: "localhost",
    database: "xtest",
    user: "qtopology_admin",
    password: "VSAp2BJ2",
    port: 3306
});

const worker_name = "worker1";
let topology_config = JSON.parse(fs.readFileSync("./topology.json", "utf8"));
const uuid = "the.test.topology";
topology_config.general.uuid = uuid;

async.series(
    [
        (xcallback) => {
            coordinator.init(xcallback);
        },
        (xcallback) => {
            coordinator.getWorkerStatus((err, data) => {
                console.log("getWorkerStatus", err, data);
                xcallback();
            });
        },
        (xcallback) => {
            console.log("Registering worker");
            coordinator.registerWorker(worker_name, xcallback);
        },
        (xcallback) => {
            coordinator.getWorkerStatus((err, data) => {
                console.log("getWorkerStatus", err, data);
                xcallback();
            });
        },
        (xcallback) => {
            coordinator.getLeadershipStatus((err, data) => {
                console.log("getLeadershipStatus", err, data);
                xcallback();
            });
        },
        (xcallback) => {
            console.log("Registering topology");
            coordinator.registerTopology(topology_config, true, (err, data) => {
                xcallback();
            });
        },
        (xcallback) => {
            coordinator.getTopologyStatus((err, data) => {
                console.log("getTopologyStatus", err, data);
                xcallback();
            });
        },
        (xcallback) => {
            console.log("Assigning topology");
            coordinator.assignTopology(uuid, worker_name, xcallback);
        },
        (xcallback) => {
            coordinator.getTopologyStatus((err, data) => {
                console.log("getTopologyStatus", err, data);
                xcallback();
            });
        },
        (xcallback) => {
            coordinator.getMessages(worker_name, (err, data) => {
                console.log("getMessages", err, data);
                xcallback();
            });
        },

        (xcallback) => {
            coordinator.getWorkerStatus((err, data) => {
                console.log("getWorkerStatus", err, data);
                xcallback();
            });
        },
        (xcallback) => {
            console.log("Announcing leadership candidacy");
            coordinator.announceLeaderCandidacy(worker_name, (err) => {
                console.log("announceLeaderCandidacy", err);
                xcallback();
            });
        },
        (xcallback) => {
            coordinator.getWorkerStatus((err, data) => {
                console.log("getWorkerStatus", err, data);
                xcallback();
            });
        },
        (xcallback) => {
            coordinator.getLeadershipStatus((err, data) => {
                console.log("getLeadershipStatus", err, data);
                xcallback();
            });
        },
        (xcallback) => {
            console.log("Check leadership candidacy");
            coordinator.checkLeaderCandidacy(worker_name, (err, data) => {
                console.log("checkLeaderCandidacy", err, data);
                xcallback();
            });
        },
        (xcallback) => {
            coordinator.getWorkerStatus((err, data) => {
                console.log("getWorkerStatus", err, data);
                xcallback();
            });
        },
        (xcallback) => {
            coordinator.getLeadershipStatus((err, data) => {
                console.log("getLeadershipStatus", err, data);
                xcallback();
            });
        },
        (xcallback) => {
            console.log("Setting worker status");
            coordinator.setWorkerStatus(worker_name, "dead", (err) => {
                xcallback();
            });
        },
        (xcallback) => {
            coordinator.getWorkerStatus((err, data) => {
                console.log("getWorkerStatus", err, data);
                xcallback();
            });
        },
        (xcallback) => {
            coordinator.getLeadershipStatus((err, data) => {
                console.log("getLeadershipStatus", err, data);
                xcallback();
            });
        },
        (xcallback) => {
            coordinator.getTopologyStatus((err, data) => {
                console.log("getTopologyStatus", err, data);
                xcallback();
            });
        },
        (xcallback) => {
            console.log("Setting worker status");
            coordinator.setWorkerStatus(worker_name, "alive", (err) => {
                xcallback();
            });
        },
        (xcallback) => {
            console.log("Setting topology status to running");
            coordinator.setTopologyStatus(uuid, "running", null, (err) => {
                console.log("setTopologyStatus", err);
                xcallback();
            });
        },
        (xcallback) => {
            coordinator.getTopologyStatus((err, data) => {
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
        coordinator.close(() => {
            console.log("Done.");
        });
    }
)

function shutdown(err) {
    if (err) {
        console.log("Error", err);
    }
    console.log("Closing coordinator...");
    coordinator.close(() => {
        console.log("Done.");
    });
}

//do something when app is closing
process.on('exit', shutdown);

//catches ctrl+c event
process.on('SIGINT', shutdown);

//catches uncaught exceptions
process.on('uncaughtException', (err) => { shutdown(err); });
