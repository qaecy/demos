import * as THREE from "three";
import { Component, Event } from "../../base-types";
import { Disposer } from "../Disposer";
/**
 * A basic 3D [scene](https://threejs.org/docs/#api/en/scenes/Scene) to add
 * objects hierarchically, and easily dispose them when you are finished with it.
 * @noInheritDoc
 */
export class SimpleScene extends Component {
    constructor(components) {
        super(components);
        /** {@link Component.enabled} */
        this.enabled = true;
        /** {@link Configurable.isSetup} */
        this.isSetup = false;
        /** {@link Disposable.onDisposed} */
        this.onDisposed = new Event();
        this.config = {
            directionalLight: {
                color: new THREE.Color("white"),
                intensity: 1.5,
                position: new THREE.Vector3(5, 10, 3),
            },
            ambientLight: {
                color: new THREE.Color("white"),
                intensity: 1,
            },
        };
        this.onSetup = new Event();
        this._scene = new THREE.Scene();
        this._scene.background = new THREE.Color(0x202932);
    }
    /** {@link Component.get} */
    get() {
        return this._scene;
    }
    /** {@link Disposable.dispose} */
    async dispose() {
        const disposer = this.components.tools.get(Disposer);
        for (const child of this._scene.children) {
            const mesh = child;
            if (mesh.geometry) {
                disposer.destroy(mesh);
            }
        }
        this._scene.children = [];
        await this.onDisposed.trigger();
        this.onDisposed.reset();
    }
    /** Creates a simple and nice default set up for the scene (e.g. lighting). */
    async setup(config) {
        this.config = { ...this.config, ...config };
        const directionalLight = new THREE.DirectionalLight(this.config.directionalLight.color, this.config.directionalLight.intensity);
        directionalLight.position.copy(this.config.directionalLight.position);
        const ambientLight = new THREE.AmbientLight(this.config.ambientLight.color, this.config.ambientLight.intensity);
        this._scene.add(directionalLight, ambientLight);
        this.isSetup = true;
        this.onSetup.trigger(this);
    }
}
//# sourceMappingURL=index.js.map