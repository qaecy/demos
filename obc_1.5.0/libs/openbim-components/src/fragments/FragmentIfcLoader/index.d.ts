import * as WEBIFC from "web-ifc";
import * as FRAGS from "bim-fragment";
import { IfcFragmentSettings } from "./src";
import { Disposable, Event, UI, Component, UIElement } from "../../base-types";
import { Button, ToastNotification } from "../../ui";
import { Components } from "../../core";
export declare class FragmentIfcLoader extends Component<WEBIFC.IfcAPI> implements Disposable, UI {
    static readonly uuid: "a659add7-1418-4771-a0d6-7d4d438e4624";
    readonly onIfcLoaded: Event<FRAGS.FragmentsGroup>;
    readonly onIfcStartedLoading: Event<void>;
    readonly onSetup: Event<void>;
    /** {@link Disposable.onDisposed} */
    readonly onDisposed: Event<string>;
    settings: IfcFragmentSettings;
    enabled: boolean;
    uiElement: UIElement<{
        main: Button;
        toast: ToastNotification;
    }>;
    private _material;
    private _spatialTree;
    private _metaData;
    private _fragmentInstances;
    private _webIfc;
    private _civil;
    private _propertyExporter;
    private _visitedFragments;
    private _materialT;
    constructor(components: Components);
    get(): WEBIFC.IfcAPI;
    dispose(): Promise<void>;
    setup(config?: Partial<IfcFragmentSettings>): Promise<void>;
    load(data: Uint8Array, coordinate?: boolean): Promise<FRAGS.FragmentsGroup>;
    private setupUI;
    readIfcFile(data: Uint8Array): Promise<number>;
    private getAllGeometries;
    cleanUp(): void;
    private getMesh;
    private getGeometry;
    private autoSetWasm;
}
