// eslint-disable-next-line max-classes-per-file
import { IfcFragmentSettings } from "../../FragmentIfcLoader/src";
/** Configuration of the IFC-fragment streaming. */
export class IfcStreamingSettings extends IfcFragmentSettings {
    constructor() {
        super(...arguments);
        this.minGeometrySize = 10;
        this.minAssetsSize = 1000;
    }
}
/** Configuration of the IFC-fragment streaming. */
export class PropertiesStreamingSettings extends IfcFragmentSettings {
    constructor() {
        super(...arguments);
        this.propertiesSize = 100;
    }
}
//# sourceMappingURL=streaming-settings.js.map