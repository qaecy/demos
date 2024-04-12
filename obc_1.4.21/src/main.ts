import { LitElement, html } from "lit";
import { customElement, property } from "lit/decorators.js";
import {
  Components,
  FragmentHighlighter,
  FragmentIdMap,
  FragmentManager,
  FragmentStreamLoader,
  OrthoPerspectiveCamera,
  PostproductionRenderer,
  SimpleRaycaster,
  SimpleScene,
} from "openbim-components";
import { GeometryData, SelectedElement, ViewerSettings } from "./models";

@customElement("qaecy-tile-streamer")
export class StreamViewerElement extends LitElement {
  @property()
  bucketURL?: string;

  @property()
  settings = new ViewerSettings();

  private _container?: HTMLElement;
  private _components = new Components();
  private _loader?: FragmentStreamLoader;
  private _highlighter?: FragmentHighlighter;

  // ID Maps used for emitting UUID on click etc.
  private _idMap: {[modelUUID: string]: {[expressID: number]: string}} = {};
  private _modelUUIDs: string[] = [];

  private _elementSelection: SelectedElement[] = [];
  private _highlightMap: FragmentIdMap = {};

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

    this._modelUUIDs.push(geometryData.modelUUID);
    this._idMap[geometryData.modelUUID] = geometryData.idMap;

    // Load model
    this._loader.url = this.bucketURL;
    this._loader.culler.useLowLod = true;
    await this._loader.load(geometryData, true);

    this._updateSettings();

    // Trigger resize event to fix aspect ratio
    window.dispatchEvent(new Event('resize'));
  }

  async unloadAll(){
    const fragments = this._components?.tools.get(FragmentManager);
    for(const i in fragments.groups){
      const group = fragments.groups[i];
      await this._loader?.remove(group.uuid);
      const modelUUID = this._modelUUIDs[i];
      
      console.log(modelUUID);
      this._modelUUIDs.splice(parseInt(i), 1);
      delete this._idMap[modelUUID];
    };
  }

  private _initEventListeners(): void{

    // Handle clicks in the viewer container
    this._container?.addEventListener("click", () => this._highlightOnClick());

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

  }

  private async _highlightOnClick(){
    const result = await this._highlighter?.highlight('select', !this.settings.highlighter.multiSelect);
    
    // Clicked element
    if (result) {

        let modelUUID;
        let elementUUID;
        const fragmentGroupId = result.fragments[0].group?.uuid;
        if(fragmentGroupId !== undefined){
          modelUUID = this._getModelUUIDFromFragmentGroup(fragmentGroupId);
          elementUUID = this._idMap[modelUUID][result.id];
        }

        const selectedElement: SelectedElement = {
          expressID: result.id,
          modelUUID,
          elementUUID
        };

        const index = this._elementSelection.map(e => JSON.stringify(e)).indexOf(JSON.stringify(selectedElement));
        
        // Pop if already selected
        if(index !== -1){
          // Remove from selection
          this._elementSelection.splice(index, 1);
          
          // Update highlight map
          for (const fragment of result.fragments) {
            if(fragment === undefined) continue;
            this._highlightMap[fragment.id].delete(result.id);
          }
          this._highlighter?.highlightByID('select', this._highlightMap);
        }
        
        // Add if not selected
        else{
          // Update highlight map
          for (const fragment of result.fragments) {
            if(fragment === undefined) continue;
            if(!Object.keys(this._highlightMap).includes(fragment?.id)) this._highlightMap[fragment.id] = new Set<number>();
            this._highlightMap[fragment?.id].add(result.id);
          }
          console.log(this._highlightMap);

          if(!this.settings.highlighter.multiSelect) this._elementSelection = [];
          this._elementSelection.push(selectedElement);
        }

        this.dispatchEvent(new CustomEvent('selection-change', {
          detail: {
            lastSelection: selectedElement,
            selection: this._elementSelection
          },
          bubbles: true, // Allow the event to bubble up the DOM
          composed: true // Allow the event to cross Shadow DOM boundaries
        }));
    }

    // Clicked canvas
    if(!result && this._elementSelection.length) {
      const lastSelection = this._elementSelection.pop();
      this._elementSelection = [];
      this._highlightMap = {};
      this.dispatchEvent(new CustomEvent('selection-change', {
        detail: {
          lastSelection,
          selection: this._elementSelection
        },
        bubbles: true, // Allow the event to bubble up the DOM
        composed: true // Allow the event to cross Shadow DOM boundaries
      }));
    }
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
    components.renderer = new PostproductionRenderer(components, this._container);

    // Setup camera
    components.camera = new OrthoPerspectiveCamera(components);
    const renderer: PostproductionRenderer = components.renderer as PostproductionRenderer;
    renderer.postproduction.enabled = true;
    renderer.postproduction.customEffects.outlineEnabled = false; // Initially off but enabled if highlighter needs outlines

    // Init everything
    await components.init();
    
    // Setup additional components
    if(this.settings.highlighter.enabled) this._setupHighlighter();
  }

  private async _setupHighlighter(){
    // ADD RAYCASTER
    const raycasterComponent = new SimpleRaycaster(this._components);
    this._components.raycaster = raycasterComponent;

    // Setup highlighter
    this._highlighter = new FragmentHighlighter(this._components);
    this._highlighter.setup(this.settings.highlighter.config);
  }

  private async _updateSettings(){

    await this._updateStreamSettings();

    // Highlighter
    if(this._highlighter !== undefined){
      if(this.settings.highlighter.outlineEnabled){
        const renderer: PostproductionRenderer = this._components.renderer as PostproductionRenderer;
        renderer.postproduction.customEffects.outlineEnabled = true;
        this._highlighter.outlineEnabled = true;
        this._highlighter.outlineMaterial.color.set(this.settings.highlighter.outlineColor);
        this._highlighter.outlineMaterial.opacity = this.settings.highlighter.outlineThickness
      }
    }
  }

  private async _updateStreamSettings(){
    const loader = this._components.tools.get(FragmentStreamLoader);

    // Show the debug frame?
    if(this.settings.showDebugFrame){
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
    if(!this.settings.useCache){
      loader.useCache = false;
      await loader.clearCache();
    }else{
      loader.useCache = true;
    }
  }

  private _getModelUUIDFromFragmentGroup(groupId: string): string{
    const fragments = this._components.tools.get(FragmentManager);
    const index = fragments.groups.map(g => g.uuid).indexOf(groupId);
    return this._modelUUIDs[index];
  }

}
