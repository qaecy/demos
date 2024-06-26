import * as FRAGS from "bim-fragment";
import * as THREE from "three";
import { Event } from "../../../base-types";
import { CullerRenderer, CullerRendererSettings } from "../../../core/ScreenCuller/src";
import { Components } from "../../../core";
import { StreamedGeometries, StreamedAsset } from "./base-types";
/**
 * A renderer to determine a geometry visibility on screen
 */
export declare class GeometryCullerRenderer extends CullerRenderer {
    threshold: number;
    bboxThreshold: number;
    maxLostTime: number;
    maxHiddenTime: number;
    boxes: Map<number, FRAGS.Fragment>;
    useLowLod: boolean;
    lowLod: Map<number, FRAGS.Fragment>;
    private _geometry;
    private _material;
    private _lodMaterial;
    readonly onViewUpdated: Event<{
        toLoad: {
            [modelID: string]: Map<number, Set<number>>;
        };
        toRemove: {
            [modelID: string]: Set<number>;
        };
        toHide: {
            [modelID: string]: Set<number>;
        };
        toShow: {
            [modelID: string]: Set<number>;
        };
    }>;
    private _modelIDIndex;
    private _indexModelID;
    private _nextModelID;
    private _geometries;
    private _geometriesGroups;
    private _foundGeometries;
    private codes;
    constructor(components: Components, settings?: CullerRendererSettings);
    dispose(): Promise<void>;
    add(modelID: string, assets: StreamedAsset[], geometries: StreamedGeometries): void;
    remove(modelID: string): void;
    addFragment(modelID: string, geometryID: number, frag: FRAGS.Fragment): void;
    removeFragment(modelID: string, geometryID: number): void;
    setModelTransformation(modelID: string, transform: THREE.Matrix4): void;
    setVisibility(visible: boolean, modelID: string, geometryIDsAssetIDs: Map<number, Set<number>>): void;
    private setGeometryVisibility;
    private handleWorkerMessage;
    private handleLostGeometries;
    private setLodVisibility;
    private createModelIndex;
    private getInstanceID;
}
