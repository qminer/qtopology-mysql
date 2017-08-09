import * as fs from "fs";
import * as path from "path";

export class ResourcesHelper extends Map<string, string> {

    constructor() {
        super();
        let dir = path.join(__dirname, "../src/resources")
        let files = fs.readdirSync(dir);
        for (let file of files) {
            let content = fs.readFileSync(path.join(dir, file), { encoding: "utf8" });
            let key = file;
            if (key.endsWith(".sql")) {
                key = key.substring(0, key.length-4);
            }
            this.set(key, content);
        }
    }
}
