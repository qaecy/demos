import {
  Component,
  Components,
  FragmentHighlighter,
  FragmentIdMap,
  FragmentManager,
  PostproductionRenderer,
} from "openbim-components";
import { HighlighterSettings, SelectedElement } from "../models";
import { EventEmitter } from "tseep";

export class QaecyHighlighter extends Component<string> {
  static readonly uuid = "9d416ec9-fa15-4bb0-8e47-065e4c1f0751" as const;
  enabled = true;

  private _elementSelection: SelectedElement[] = [];
  private _highlightMap: FragmentIdMap = {};
  private _settings = new HighlighterSettings();
  private _container: HTMLElement;
  private _highlighter: FragmentHighlighter;
  private _lastHover: string|undefined;

  // ID Maps used for emitting UUID on click etc.
  private _idMap: { [modelUUID: string]: { [expressID: number]: string } } = {};
  private _modelUUIDs: string[] = [];

  events = new EventEmitter<{
    selectionChange: (
      lastSelection: SelectedElement | undefined,
      selection: SelectedElement[]
    ) => void;
    hoveredElement: (element: SelectedElement | undefined) => void;
  }>();

  constructor(components: Components) {
    super(components);
    const renderer = components.renderer.get();
    this._container = renderer.domElement.parentElement as HTMLElement;
    this._highlighter = components.tools.get(FragmentHighlighter);
    this._initEventListeners();
  }

  dispose() {
    //
  }

  get() {
    return QaecyHighlighter.uuid;
  }

  setup(settings: HighlighterSettings) {
    this._settings = settings;
    this._highlighter.setup(settings.config);
  }

  updateSettings(settings: HighlighterSettings) {
    this._settings = settings;
    // Highlighter
    if (this._settings.outlineEnabled) {
      const renderer: PostproductionRenderer = this.components
        .renderer as PostproductionRenderer;
      renderer.postproduction.customEffects.outlineEnabled = true;
      this._highlighter.outlineEnabled = true;
      this._highlighter.outlineMaterial.color.set(settings.outlineColor);
      this._highlighter.outlineMaterial.opacity = settings.outlineThickness;
    }
    const hl = this._highlighter.get();
    hl.hover = [settings.config.hoverMaterial];
    hl.select = [settings.config.selectionMaterial];
  }

  async updateHighlight() {
    await this._highlighter.updateHighlight();
  }

  appendIdMap(modelUUID: string, idMap: { [expressID: number]: string }) {
    this._modelUUIDs.push(modelUUID);
    this._idMap[modelUUID] = idMap;
  }

  removeIdMap(groupId: string) {
    const modelUUID = this._getModelUUIDFromFragmentGroup(groupId);
    this._modelUUIDs = this._modelUUIDs.filter((id) => id !== modelUUID);
    delete this._idMap[modelUUID];
  }

  private _initEventListeners() {
    // Handle clicks in the viewer container
    this._container?.addEventListener("click", () => this._highlightOnClick());
    this._container?.addEventListener("mousemove", () => this._updateHover());
  }

  private async _highlightOnClick() {
    const result = await this._highlighter.highlight(
      "select",
      !this._settings.multiSelect
    );

    // Clicked element
    if (result) {
      const element = this._getHighlightElement(result);

      // Pop if already selected
      const index = this._elementSelection
        .map((e) => JSON.stringify(e))
        .indexOf(JSON.stringify(element));

      if (index !== -1) {
        // Remove from selection
        this._elementSelection.splice(index, 1);

        // Update highlight map
        for (const fragment of result.fragments) {
          if (fragment === undefined) continue;
          this._highlightMap[fragment.id].delete(result.id);
        }
        this._highlighter.highlightByID("select", this._highlightMap);
      }

      // Add if not selected
      else {
        // Update highlight map
        for (const fragment of result.fragments) {
          if (fragment === undefined) continue;
          if (!Object.keys(this._highlightMap).includes(fragment?.id))
            this._highlightMap[fragment.id] = new Set<number>();
          this._highlightMap[fragment?.id].add(result.id);
        }

        if (!this._settings.multiSelect) this._elementSelection = [];
        this._elementSelection.push(element);
      }

      this.events.emit("selectionChange", element, this._elementSelection);
    }

    // Clicked canvas
    if (!result && this._elementSelection.length) {
      const lastSelection = this._elementSelection.pop();
      this._elementSelection = [];
      this._highlightMap = {};
      this.events.emit(
        "selectionChange",
        lastSelection,
        this._elementSelection
      );
    }
  }

  private async _updateHover() {
    const result = await this._highlighter.highlight("hover");
    if (result) {
      const element = this._getHighlightElement(result);
      if(this._lastHover != JSON.stringify(element)){
        this._lastHover = JSON.stringify(element);
        this.events.emit("hoveredElement", element);
      }
    } else {
      if(this._lastHover !== undefined){
        this._lastHover = undefined;
        this.events.emit("hoveredElement", undefined);
      }
    }
  }

  private _getHighlightElement(result: any): SelectedElement {
    let modelUUID;
    let elementUUID;
    const fragmentGroupId = result.fragments[0].group?.uuid;
    if (fragmentGroupId !== undefined) {
      modelUUID = this._getModelUUIDFromFragmentGroup(fragmentGroupId);
      elementUUID = this._idMap[modelUUID][result.id];
    }
    return {
      expressID: result.id,
      modelUUID,
      elementUUID,
    };
  }

  private _getModelUUIDFromFragmentGroup(groupId: string): string {
    const fragments = this.components.tools.get(FragmentManager);
    const index = fragments.groups.map((g) => g.uuid).indexOf(groupId);
    return this._modelUUIDs[index];
  }
}
