"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const path = require("path");
class ResourcesHelper extends Map {
    constructor() {
        super();
        let dir = path.join(__dirname, "../src/resources");
        let files = fs.readdirSync(dir);
        for (let file of files) {
            let content = fs.readFileSync(path.join(dir, file), { encoding: "utf8" });
            let key = file;
            if (key.endsWith(".sql")) {
                key = key.substring(0, key.length - 4);
            }
            this.set(key, content);
        }
    }
}
exports.ResourcesHelper = ResourcesHelper;
//# sourceMappingURL=resources_helper.js.map