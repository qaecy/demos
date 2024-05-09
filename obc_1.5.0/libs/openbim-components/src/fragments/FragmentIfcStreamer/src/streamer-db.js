import Dexie from "dexie";
export class StreamFileDatabase extends Dexie {
    constructor() {
        super("MyAppDatabase");
        this.version(1).stores({
            files: "id, file",
        });
    }
}
//# sourceMappingURL=streamer-db.js.map