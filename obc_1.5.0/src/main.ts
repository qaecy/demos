import { LitElement, html } from "lit";
import { customElement, property } from "lit/decorators.js";
import {
  Components,
  FragmentManager,
  FragmentStreamLoader,
  OrthoPerspectiveCamera,
  PostproductionRenderer,
  SimpleRaycaster,
  SimpleScene,
} from "openbim-components";
import { GeometryData, ViewerSettings } from "./models";
import { QaecyHighlighter } from './qaecy-components';

@customElement("qaecy-tile-streamer")
export class StreamViewerElement extends LitElement {
  @property()
  bucketURL?: string;

  @property()
  settings = new ViewerSettings();

  private _container?: HTMLElement;
  private _components = new Components();
  private _loader?: FragmentStreamLoader;
  private _highlighter?: QaecyHighlighter;

  // ID Maps used for emitting UUID on click etc.

  constructor() {
    super();
  }

  async updated(changedProperties: Map<string, any>) {
    await this._components.init();

    if (changedProperties.has("settings")) {
      this._updateSettings();
    }
  }

  async firstUpdated() {
    const appDiv = this.shadowRoot?.getElementById("app");
    if (!appDiv || appDiv == undefined) return;
    this._container = appDiv;
    await this._setupViewer();
    this._initEventListeners();
  }

  render() {
    return html`<div id="app" style="height: 100%"></div>`;
  }

  // Returns promise when the viewer is ready
  async ready(): Promise<void> {
    return this._components.init();
  }

  /**
   * LOADERS
   */

  // Load a stream load definition to the viewer
  async loadStream(geometryData: GeometryData) {
    if (this._loader === undefined) {
      this._loader = this._components.tools.get(FragmentStreamLoader);
    }

    if (this.bucketURL === undefined) {
      console.error("No bucket specified");
      return;
    }

    this._highlighter?.appendIdMap(geometryData.modelUUID, geometryData.idMap);

    // Load model
    this._loader.url = this.bucketURL;
    this._loader.culler.useLowLod = true;
    await this._loader.load(geometryData, true);

    this._updateSettings();

    // Trigger resize event to fix aspect ratio
    window.dispatchEvent(new Event("resize"));
  }

  async unloadAll() {
    const fragments = this._components?.tools.get(FragmentManager);
    for (const i in fragments.groups) {
      const group = fragments.groups[i];
      await this._loader?.remove(group.uuid);
      this._highlighter?.removeIdMap(group.uuid);
    }
  }

  private _initEventListeners(): void {
    // On camera control end we potentially need to load more fragments from the culler
    (
      this._components.camera as OrthoPerspectiveCamera
    ).controls.addEventListener("controlend", async () => {
      if (this._loader === undefined) return;
      this._loader.culler.needsUpdate = true;
    });

    // When new fragments are loaded the highlighter needs to be updated
    this._loader?.onFragmentsLoaded.add(async () => {
      await this._highlighter?.updateHighlight();
    });

    this._highlighter?.events.addListener(
      "selectionChange",
      (lastSelection, selection) => {
        this.dispatchEvent(
          new CustomEvent("selection-change", {
            detail: {
              lastSelection,
              selection,
            },
            bubbles: true, // Allow the event to bubble up the DOM
            composed: true, // Allow the event to cross Shadow DOM boundaries
          })
        );
      }
    );

    this._highlighter?.events.addListener("hoveredElement", (element) => {
      this.dispatchEvent(
        new CustomEvent("hovered-element", {
          detail: {
            element,
          },
          bubbles: true, // Allow the event to bubble up the DOM
          composed: true, // Allow the event to cross Shadow DOM boundaries
        })
      );
    });
  }

  private async _setupViewer() {
    const components = this._components;
    components.uiEnabled = false; // User has own UI components

    // Setup scene
    const sceneComponent = new SimpleScene(components);
    sceneComponent.setup();
    components.scene = sceneComponent;
    sceneComponent.get().background = null;

    // Setup renderer
    components.renderer = new PostproductionRenderer(
      components,
      this._container
    );

    // Setup camera
    components.camera = new OrthoPerspectiveCamera(components);
    const renderer: PostproductionRenderer =
      components.renderer as PostproductionRenderer;
    renderer.postproduction.enabled = true;
    renderer.postproduction.customEffects.outlineEnabled = false; // Initially off but enabled if highlighter needs outlines

    // Init everything
    await components.init();

    // Setup additional components
    if (this.settings.highlighter.enabled) this._setupHighlighter();
  }

  private async _setupHighlighter() {
    // ADD RAYCASTER
    const raycasterComponent = new SimpleRaycaster(this._components);
    this._components.raycaster = raycasterComponent;

    // Setup highlighter
    this._highlighter = new QaecyHighlighter(this._components);
    this._highlighter.setup(this.settings.highlighter);
  }

  private async _updateSettings() {
    await this._updateStreamSettings();
    this._highlighter?.updateSettings(this.settings.highlighter);
  }

  private async _updateStreamSettings() {
    const loader = this._components.tools.get(FragmentStreamLoader);

    // Show the debug frame?
    if (this.settings.showDebugFrame) {
      loader.culler.renderDebugFrame = true;
      const debugFrame = loader.culler.get().domElement;
      document.body.appendChild(debugFrame);
      debugFrame.style.position = "fixed";
      debugFrame.style.left = "0";
      debugFrame.style.bottom = "0";
    }

    // Update culler settings
    loader.culler.threshold = this.settings.culler.threshold;
    loader.culler.maxHiddenTime = this.settings.culler.maxHiddenTime;
    loader.culler.maxLostTime = this.settings.culler.maxLostTime;

    // Use cache?
    if (!this.settings.useCache) {
      loader.useCache = false;
      await loader.clearCache();
    } else {
      loader.useCache = true;
    }
  }
}
