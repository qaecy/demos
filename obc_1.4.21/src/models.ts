import { FragmentHighlighterConfig, StreamedAsset, StreamedGeometries } from "openbim-components";
import { MeshBasicMaterial } from "three";

export interface GeometryData{
    assets: StreamedAsset[],
    geometries: StreamedGeometries,
    idMap: {[expressID: number]: string}, // Map from expressId
    modelUUID: string, // UUID of model
    globalDataFileId: string
}

export interface SelectedElement{
    expressID: number;
    elementUUID?: string;
    modelUUID?: string;
}

export class ViewerSettings{
    showDebugFrame = false;
    useCache = false;
    makeAllDoubleSided = true;  // Not implemented
    highlighter = new HighlighterSettings();
    culler = new CullerSettings();
}

export class CullerSettings{
    threshold = 20;
    maxHiddenTime = 1000;
    maxLostTime = 40000;
}

export class HighlighterSettings{
    enabled = true; // If not enabled the raycaster will not be instantiated
    outlineEnabled = true;
    multiSelect = true;
    outlineColor = "#CFE601";
    outlineThickness = 0.3;
    config: FragmentHighlighterConfig = {
        selectName: "select",
        hoverName: "hover",
        autoHighlightOnClick: false, // Should always be false since we handle highlights a bit differently
        cullHighlightMeshes: true,
        selectionMaterial: new MeshBasicMaterial({
          color: "#0F5CE9",
          depthTest: false,
          opacity: 0.8,
          transparent: true
        }),
        hoverMaterial: new MeshBasicMaterial({
          color: "#0F5CE9",
          depthTest: false,
          opacity: 0.8,
          transparent: true
        }),
    };
}