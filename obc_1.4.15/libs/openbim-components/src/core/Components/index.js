import * as THREE from "three";
import { acceleratedRaycast, computeBoundsTree, disposeBoundsTree, } from "three-mesh-bvh";
import { UIManager } from "../../ui";
import { Event } from "../../base-types";
import { ToolComponent } from "../ToolsComponent";
import { Disposer } from "../Disposer";
/**
 * The entry point of Open BIM Components.
 * It contains the basic items to create a BIM 3D scene based on Three.js, as
 * well as all the tools provided by this library. It also manages the update
 * loop of everything. Each instance has to be initialized with {@link init}.
 *
 */
export class Components {
    /** {@link UIManager} */
    get ui() {
        if (!this._ui) {
            throw new Error("UIManager hasn't been initialised.");
        }
        return this._ui;
    }
    /**
     * The [Three.js renderer](https://threejs.org/docs/#api/en/renderers/WebGLRenderer)
     * used to render the scene. This library provides multiple renderer
     * components with pre-made functionality (e.g. rendering of 2D CSS elements.
     */
    get renderer() {
        if (!this._renderer) {
            throw new Error("Renderer hasn't been initialised.");
        }
        return this._renderer;
    }
    /**
     * This needs to be initialized before calling init().
     */
    set renderer(renderer) {
        this._renderer = renderer;
    }
    /**
     * The [Three.js scene](https://threejs.org/docs/#api/en/scenes/Scene)
     * where all the rendered items are placed.
     */
    get scene() {
        if (!this._scene) {
            throw new Error("Scene hasn't been initialised.");
        }
        return this._scene;
    }
    /**
     * This needs to be initialized before calling init().
     */
    set scene(scene) {
        this._scene = scene;
    }
    /**
     * The [Three.js camera](https://threejs.org/docs/#api/en/cameras/Camera)
     * that determines the point of view of the renderer.
     */
    get camera() {
        if (!this._camera) {
            throw new Error("Camera hasn't been initialised.");
        }
        return this._camera;
    }
    /**
     * This needs to be initialized before calling init().
     */
    set camera(camera) {
        this._camera = camera;
    }
    /**
     * A component using the [Three.js raycaster](https://threejs.org/docs/#api/en/core/Raycaster)
     * used primarily to pick 3D items with the mouse or a touch screen.
     */
    get raycaster() {
        if (!this._raycaster) {
            throw new Error("Raycaster hasn't been initialised.");
        }
        return this._raycaster;
    }
    /**
     * Although this is not necessary to make the library work, it's necessary
     * to initialize this if any component that needs a raycaster is used.
     */
    set raycaster(raycaster) {
        this._raycaster = raycaster;
    }
    constructor() {
        /**
         * All the loaded [meshes](https://threejs.org/docs/#api/en/objects/Mesh).
         * This includes fragments, 3D scans, etc.
         */
        this.meshes = new Set();
        /**
         * Event that fires when this instance has been fully initialized and is
         * ready to work (scene, camera and renderer are ready).
         */
        this.onInitialized = new Event();
        /** {@link Disposable.onDisposed} */
        this.onDisposed = new Event();
        this.enabled = false;
        /** Whether UI components should be created. */
        this.uiEnabled = true;
        this.update = async () => {
            if (!this.enabled)
                return;
            const delta = this._clock.getDelta();
            await Components.update(this.scene, delta);
            await Components.update(this.renderer, delta);
            await Components.update(this.camera, delta);
            await this.tools.update(delta);
            const renderer = this.renderer.get();
            // Works the same as requestAnimationFrame, but let us use WebXR.
            renderer.setAnimationLoop(this.update);
        };
        this._clock = new THREE.Clock();
        this.tools = new ToolComponent(this);
        Components.setupBVH();
    }
    /**
     * Initializes the library. It should be called at the start of the app after
     * initializing the scene, the renderer and the
     * camera. Additionally, if any component that need a raycaster is
     * used, the {@link raycaster} will need to be initialized.
     */
    async init() {
        this.enabled = true;
        this._clock.start();
        if (this.uiEnabled) {
            this._ui = new UIManager(this);
            await this.ui.init();
        }
        await this.update();
        await this.onInitialized.trigger(this);
    }
    /**
     * Disposes the memory of all the components and tools of this instance of
     * the library. A memory leak will be created if:
     *
     * - An instance of the library ends up out of scope and this function isn't
     * called. This is especially relevant in Single Page Applications (React,
     * Angular, Vue, etc).
     *
     * - Any of the objects of this instance (meshes, geometries, etc) is
     * referenced by a reference type (object or array).
     *
     * You can learn more about how Three.js handles memory leaks
     * [here](https://threejs.org/docs/#manual/en/introduction/How-to-dispose-of-objects).
     *
     */
    async dispose() {
        const disposer = this.tools.get(Disposer);
        this.enabled = false;
        await this.tools.dispose();
        await this._ui?.dispose();
        this.onInitialized.reset();
        this._clock.stop();
        for (const mesh of this.meshes) {
            disposer.destroy(mesh);
        }
        this.meshes.clear();
        if (this._renderer?.isDisposeable()) {
            await this._renderer.dispose();
        }
        if (this._scene?.isDisposeable()) {
            await this._scene.dispose();
        }
        if (this._camera?.isDisposeable()) {
            await this._camera.dispose();
        }
        if (this._raycaster?.isDisposeable()) {
            await this._raycaster.dispose();
        }
        await this.onDisposed.trigger();
        this.onDisposed.reset();
    }
    static async update(component, delta) {
        if (component.isUpdateable() && component.enabled) {
            await component.update(delta);
        }
    }
    static setupBVH() {
        THREE.BufferGeometry.prototype.computeBoundsTree = computeBoundsTree;
        THREE.BufferGeometry.prototype.disposeBoundsTree = disposeBoundsTree;
        THREE.Mesh.prototype.raycast = acceleratedRaycast;
    }
}
Components.release = "1.3.0";
//# sourceMappingURL=index.js.map