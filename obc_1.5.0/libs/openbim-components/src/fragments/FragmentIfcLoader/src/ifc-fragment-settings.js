import * as WEBIFC from "web-ifc";
/** Configuration of the IFC-fragment conversion. */
export class IfcFragmentSettings {
    constructor() {
        /** Whether to extract the IFC properties into a JSON. */
        this.includeProperties = true;
        /**
         * Generate the geometry for categories that are not included by default,
         * like IFCSPACE.
         */
        this.optionalCategories = [WEBIFC.IFCSPACE];
        /** Whether to use the coordination data coming from the IFC files. */
        this.coordinate = true;
        /** Path of the WASM for [web-ifc](https://github.com/ThatOpen/engine_web-ifc). */
        this.wasm = {
            path: "",
            absolute: false,
            logLevel: WEBIFC.LogLevel.LOG_LEVEL_OFF,
        };
        /** List of categories that won't be converted to fragments. */
        this.excludedCategories = new Set();
        /** Whether to save the absolute location of all IFC items. */
        this.saveLocations = false;
        /** Loader settings for [web-ifc](https://github.com/ThatOpen/engine_web-ifc). */
        this.webIfc = {
            COORDINATE_TO_ORIGIN: true,
            OPTIMIZE_PROFILES: true,
        };
        this.autoSetWasm = true;
        this.customLocateFileHandler = null;
    }
}
//# sourceMappingURL=ifc-fragment-settings.js.map