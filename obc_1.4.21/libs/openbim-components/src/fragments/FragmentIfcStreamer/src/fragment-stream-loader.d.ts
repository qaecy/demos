import * as FRAG from "bim-fragment";
import { FragmentIdMap } from "bim-fragment";
import { Component, Disposable, Event } from "../../../base-types";
import { StreamedGeometries, StreamedAsset } from "./base-types";
import { Components } from "../../../core";
import { GeometryCullerRenderer } from "./geometry-culler-renderer";
export interface StreamLoaderSettings {
    assets: StreamedAsset[];
    geometries: StreamedGeometries;
    globalDataFileId: string;
}
export interface StreamPropertiesSettings {
    ids: {
        [id: number]: number;
    };
    types: {
        [type: number]: number[];
    };
    indexesFile: string;
}
export declare class FragmentStreamLoader extends Component<any> implements Disposable {
    enabled: boolean;
    culler: GeometryCullerRenderer;
    readonly onFragmentsDeleted: Event<FRAG.Fragment[]>;
    readonly onFragmentsLoaded: Event<FRAG.Fragment[]>;
    readonly onDisposed: Event<string>;
    models: {
        [modelID: string]: {
            assets: StreamedAsset[];
            geometries: StreamedGeometries;
        };
    };
    serializer: FRAG.StreamSerializer;
    maxRamTime: number;
    useCache: boolean;
    private _ramCache;
    private _fileCache;
    private _url;
    private _isDisposing;
    private _geometryInstances;
    private _loadedFragments;
    private fragIDData;
    private _baseMaterial;
    private _baseMaterialT;
    get url(): string;
    set url(value: string);
    constructor(components: Components);
    static readonly uuid: "22437e8d-9dbc-4b99-a04f-d2da280d50c8";
    dispose(): Promise<void>;
    load(settings: StreamLoaderSettings, coordinate?: boolean, properties?: StreamPropertiesSettings): Promise<void>;
    remove(modelID: string): void;
    setVisibility(visible: boolean, filter: FragmentIdMap): void;
    clearCache(): Promise<void>;
    get(): void;
    update(): void;
    private loadFoundGeometries;
    private unloadLostGeometries;
    private setMeshVisibility;
    private newFragment;
    private setupCullerEvents;
}