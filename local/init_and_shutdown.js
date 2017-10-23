"use strict";

let common_context = {
    cnt: 0
};

exports.init = function (config, context, callback) {
    console.log(new Date(), "Custom initialization");
    common_context = context;
    common_context.cnt = 0;
    setTimeout(() => {
        // simulate some lengthy processing
        console.log(new Date(), "Exiting custom init...", common_context);
        callback();
    }, 10000);
};

exports.shutdown = function (callback) {
    console.log(new Date(), "Custom shutdown", common_context);
    setTimeout(() => {
        // simulate some lengthy processing
        console.log(new Date(), "Exiting custom shutdown...", common_context);
        callback();
    }, 5000);
};
