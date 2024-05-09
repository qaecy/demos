import * as WEBIFC from "web-ifc";
import * as THREE from "three";
import * as FRAGS from "bim-fragment";
import { SpatialStructure } from "./src/spatial-structure";
import { CivilReader, IfcFragmentSettings, IfcMetadataReader } from "./src";
import { Event, Component, UIElement } from "../../base-types";
import { FragmentManager } from "../FragmentManager";
import { Button, ToastNotification } from "../../ui";
import { Components, ToolComponent } from "../../core";
import { IfcJsonExporter } from "../../ifc/IfcJsonExporter";
export class FragmentIfcLoader extends Component {
    constructor(components) {
        super(components);
        this.onIfcLoaded = new Event();
        this.onIfcStartedLoading = new Event();
        this.onSetup = new Event();
        /** {@link Disposable.onDisposed} */
        this.onDisposed = new Event();
        this.settings = new IfcFragmentSettings();
        this.enabled = true;
        this.uiElement = new UIElement();
        this._material = new THREE.MeshLambertMaterial();
        this._spatialTree = new SpatialStructure();
        this._metaData = new IfcMetadataReader();
        this._fragmentInstances = new Map();
        this._webIfc = new WEBIFC.IfcAPI();
        this._civil = new CivilReader();
        this._propertyExporter = new IfcJsonExporter();
        this._visitedFragments = new Map();
        this._materialT = new THREE.MeshLambertMaterial({
            transparent: true,
            opacity: 0.5,
        });
        this.components.tools.add(FragmentIfcLoader.uuid, this);
        if (components.uiEnabled) {
            this.setupUI();
        }
        this.settings.excludedCategories.add(WEBIFC.IFCOPENINGELEMENT);
    }
    get() {
        return this._webIfc;
    }
    async dispose() {
        this.onIfcLoaded.reset();
        await this.uiElement.dispose();
        this._webIfc = null;
        await this.onDisposed.trigger(FragmentIfcLoader.uuid);
        this.onDisposed.reset();
    }
    async setup(config) {
        this.settings = { ...this.settings, ...config };
        if (this.settings.autoSetWasm) {
            await this.autoSetWasm();
        }
        await this.onSetup.trigger();
    }
    async load(data, coordinate = true) {
        const before = performance.now();
        await this.onIfcStartedLoading.trigger();
        await this.readIfcFile(data);
        const group = await this.getAllGeometries();
        const properties = await this._propertyExporter.export(this._webIfc, 0);
        group.setLocalProperties(properties);
        this.cleanUp();
        console.log(`Streaming the IFC took ${performance.now() - before} ms!`);
        const fragments = this.components.tools.get(FragmentManager);
        fragments.groups.push(group);
        for (const frag of group.items) {
            fragments.list[frag.id] = frag;
            frag.mesh.uuid = frag.id;
            frag.group = group;
            this.components.meshes.add(frag.mesh);
        }
        if (coordinate) {
            fragments.coordinate([group]);
        }
        await this.onIfcLoaded.trigger(group);
        return group;
    }
    setupUI() {
        const main = new Button(this.components);
        main.materialIcon = "upload_file";
        main.tooltip = "Load IFC";
        const toast = new ToastNotification(this.components, {
            message: "IFC model successfully loaded!",
        });
        main.onClick.add(() => {
            const fileOpener = document.createElement("input");
            fileOpener.type = "file";
            fileOpener.accept = ".ifc";
            fileOpener.style.display = "none";
            fileOpener.onchange = async () => {
                const fragments = this.components.tools.get(FragmentManager);
                if (fileOpener.files === null || fileOpener.files.length === 0)
                    return;
                const file = fileOpener.files[0];
                const buffer = await file.arrayBuffer();
                const data = new Uint8Array(buffer);
                const model = await this.load(data);
                const scene = this.components.scene.get();
                scene.add(model);
                toast.visible = true;
                await fragments.updateWindow();
                fileOpener.remove();
            };
            fileOpener.click();
        });
        this.components.ui.add(toast);
        toast.visible = false;
        this.uiElement.set({ main, toast });
    }
    async readIfcFile(data) {
        const { path, absolute, logLevel } = this.settings.wasm;
        this._webIfc.SetWasmPath(path, absolute);
        await this._webIfc.Init();
        if (logLevel) {
            this._webIfc.SetLogLevel(logLevel);
        }
        return this._webIfc.OpenModel(data, this.settings.webIfc);
    }
    async getAllGeometries() {
        // Precompute the level and category to which each item belongs
        this._spatialTree.setUp(this._webIfc);
        const allIfcEntities = this._webIfc.GetIfcEntityList(0);
        const group = new FRAGS.FragmentsGroup();
        const { FILE_NAME, FILE_DESCRIPTION } = WEBIFC;
        group.ifcMetadata = {
            name: this._metaData.get(this._webIfc, FILE_NAME),
            description: this._metaData.get(this._webIfc, FILE_DESCRIPTION),
            schema: this._webIfc.GetModelSchema(0) || "IFC2X3",
            maxExpressID: this._webIfc.GetMaxExpressID(0),
        };
        const ids = [];
        for (const type of allIfcEntities) {
            if (!this._webIfc.IsIfcElement(type) && type !== WEBIFC.IFCSPACE) {
                continue;
            }
            if (this.settings.excludedCategories.has(type)) {
                continue;
            }
            const result = this._webIfc.GetLineIDsWithType(0, type);
            const size = result.size();
            for (let i = 0; i < size; i++) {
                const itemID = result.get(i);
                ids.push(itemID);
                const level = this._spatialTree.itemsByFloor[itemID] || 0;
                group.data.set(itemID, [[], [level, type]]);
            }
        }
        this._spatialTree.cleanUp();
        this._webIfc.StreamMeshes(0, ids, (mesh) => {
            this.getMesh(mesh, group);
        });
        for (const entry of this._visitedFragments) {
            const { index, fragment } = entry[1];
            group.keyFragments.set(index, fragment.id);
        }
        for (const fragment of group.items) {
            const fragmentData = this._fragmentInstances.get(fragment.id);
            if (!fragmentData) {
                throw new Error("Fragment not found!");
            }
            const items = [];
            for (const [_geomID, item] of fragmentData) {
                items.push(item);
            }
            fragment.add(items);
        }
        const matrix = this._webIfc.GetCoordinationMatrix(0);
        group.coordinationMatrix.fromArray(matrix);
        group.ifcCivil = this._civil.read(this._webIfc);
        return group;
    }
    cleanUp() {
        this._webIfc = null;
        this._webIfc = new WEBIFC.IfcAPI();
        this._visitedFragments.clear();
        this._fragmentInstances.clear();
    }
    getMesh(mesh, group) {
        const size = mesh.geometries.size();
        const id = mesh.expressID;
        for (let i = 0; i < size; i++) {
            const geometry = mesh.geometries.get(i);
            const { x, y, z, w } = geometry.color;
            const transparent = w !== 1;
            const { geometryExpressID } = geometry;
            const geometryID = `${geometryExpressID}-${transparent}`;
            // Create geometry if it doesn't exist
            if (!this._visitedFragments.has(geometryID)) {
                const bufferGeometry = this.getGeometry(this._webIfc, geometryExpressID);
                const material = transparent ? this._materialT : this._material;
                const fragment = new FRAGS.Fragment(bufferGeometry, material, 1);
                group.add(fragment.mesh);
                group.items.push(fragment);
                const index = this._visitedFragments.size;
                this._visitedFragments.set(geometryID, { index, fragment });
            }
            // Save this instance of this geometry
            const color = new THREE.Color().setRGB(x, y, z, "srgb");
            const transform = new THREE.Matrix4();
            transform.fromArray(geometry.flatTransformation);
            const fragmentData = this._visitedFragments.get(geometryID);
            if (fragmentData === undefined) {
                throw new Error("Error getting geometry data for streaming!");
            }
            const data = group.data.get(id);
            if (!data) {
                throw new Error("Data not found!");
            }
            data[0].push(fragmentData.index);
            const { fragment } = fragmentData;
            if (!this._fragmentInstances.has(fragment.id)) {
                this._fragmentInstances.set(fragment.id, new Map());
            }
            const instances = this._fragmentInstances.get(fragment.id);
            if (!instances) {
                throw new Error("Instances not found!");
            }
            if (instances.has(id)) {
                // This item has more than one instance in this fragment
                const instance = instances.get(id);
                if (!instance) {
                    throw new Error("Instance not found!");
                }
                instance.transforms.push(transform);
                if (instance.colors) {
                    instance.colors.push(color);
                }
            }
            else {
                instances.set(id, { id, transforms: [transform], colors: [color] });
            }
        }
    }
    getGeometry(webIfc, id) {
        const geometry = webIfc.GetGeometry(0, id);
        const index = webIfc.GetIndexArray(geometry.GetIndexData(), geometry.GetIndexDataSize());
        const vertexData = webIfc.GetVertexArray(geometry.GetVertexData(), geometry.GetVertexDataSize());
        const position = new Float32Array(vertexData.length / 2);
        const normal = new Float32Array(vertexData.length / 2);
        for (let i = 0; i < vertexData.length; i += 6) {
            position[i / 2] = vertexData[i];
            position[i / 2 + 1] = vertexData[i + 1];
            position[i / 2 + 2] = vertexData[i + 2];
            normal[i / 2] = vertexData[i + 3];
            normal[i / 2 + 1] = vertexData[i + 4];
            normal[i / 2 + 2] = vertexData[i + 5];
        }
        const bufferGeometry = new THREE.BufferGeometry();
        const posAttr = new THREE.BufferAttribute(position, 3);
        const norAttr = new THREE.BufferAttribute(normal, 3);
        bufferGeometry.setAttribute("position", posAttr);
        bufferGeometry.setAttribute("normal", norAttr);
        bufferGeometry.setIndex(Array.from(index));
        geometry.delete();
        return bufferGeometry;
    }
    async autoSetWasm() {
        const componentsPackage = await fetch(`https://unpkg.com/openbim-components@${Components.release}/package.json`);
        if (!componentsPackage.ok) {
            console.warn("Couldn't get openbim-components package.json. Set wasm settings manually.");
            return;
        }
        const componentsPackageJSON = await componentsPackage.json();
        if (!("web-ifc" in componentsPackageJSON.peerDependencies ?? {})) {
            console.warn("Couldn't get web-ifc from peer dependencies in openbim-components. Set wasm settings manually.");
        }
        else {
            const webIfcVer = componentsPackageJSON.peerDependencies["web-ifc"];
            this.settings.wasm.path = `https://unpkg.com/web-ifc@${webIfcVer}/`;
            this.settings.wasm.absolute = true;
        }
    }
}
FragmentIfcLoader.uuid = "a659add7-1418-4771-a0d6-7d4d438e4624";
ToolComponent.libraryUUIDs.add(FragmentIfcLoader.uuid);
//# sourceMappingURL=index.js.map