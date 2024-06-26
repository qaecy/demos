import * as WEBIFC from "web-ifc";
/** Configuration of the IFC-fragment conversion. */
export declare class IfcFragmentSettings {
    /** Whether to extract the IFC properties into a JSON. */
    includeProperties: boolean;
    /**
     * Generate the geometry for categories that are not included by default,
     * like IFCSPACE.
     */
    optionalCategories: number[];
    /** Whether to use the coordination data coming from the IFC files. */
    coordinate: boolean;
    /** Path of the WASM for [web-ifc](https://github.com/ThatOpen/engine_web-ifc). */
    wasm: {
        path: string;
        absolute: boolean;
        logLevel?: WEBIFC.LogLevel;
    };
    /** List of categories that won't be converted to fragments. */
    excludedCategories: Set<number>;
    /** Whether to save the absolute location of all IFC items. */
    saveLocations: boolean;
    /** Loader settings for [web-ifc](https://github.com/ThatOpen/engine_web-ifc). */
    webIfc: WEBIFC.LoaderSettings;
    autoSetWasm: boolean;
    customLocateFileHandler: WEBIFC.LocateFileHandlerFn | null;
}
