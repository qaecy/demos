import Dexie from "dexie";
interface IStreamedFile {
    id: string;
    file: Uint8Array;
}
export declare class StreamFileDatabase extends Dexie {
    files: Dexie.Table<IStreamedFile, string>;
    constructor();
}
export {};
