// @ts-ignore
import { createPopper } from "@popperjs/core/dist/esm";
import { Component, Event } from "../../base-types";
import { Toolbar } from "../ToolbarComponent";
/**
 * A component that handles all UI components.
 */
export class UIManager extends Component {
    get viewerContainer() {
        return this._components.renderer.get().domElement
            .parentElement;
    }
    constructor(components) {
        super(components);
        this.name = "UIManager";
        this.enabled = true;
        this.toolbars = [];
        this.tooltipsEnabled = true;
        this.children = [];
        /** {@link Disposable.onDisposed} */
        this.onDisposed = new Event();
        this._mouseMoved = false;
        this._mouseDown = false;
        this._containers = {
            top: document.createElement("div"),
            right: document.createElement("div"),
            bottom: document.createElement("div"),
            left: document.createElement("div"),
        };
        this.onMouseUp = () => {
            this._mouseDown = false;
        };
        this.onMouseMoved = () => {
            if (this._mouseDown) {
                this._mouseMoved = true;
            }
        };
        this.onMouseDown = (event) => {
            this._mouseDown = true;
            const canvas = this._components.renderer.get().domElement;
            if (event.target === canvas) {
                this.closeMenus();
                this.contextMenu.visible = false;
            }
        };
        this.onContextMenu = (event) => {
            if (this._mouseMoved) {
                this._mouseMoved = false;
                return;
            }
            event.preventDefault();
            event.stopImmediatePropagation();
            this.closeMenus();
            this._contextMenuContainer.style.left = `${event.offsetX}px`;
            this._contextMenuContainer.style.top = `${event.offsetY}px`;
            this.contextMenu.visible = true;
            this._popperInstance.update();
        };
        this._components = components;
        this.contextMenu = new Toolbar(components);
        this.contextMenu.setDirection("vertical");
        this.contextMenu.position = "left";
        this._contextMenuContainer = document.createElement("div");
        this._contextMenuContainer.style.position = "absolute";
        this._contextMenuContainer.append(this.contextMenu.domElement);
        this._popperInstance = createPopper(this._contextMenuContainer, this.contextMenu.domElement, {
            placement: "bottom-start",
            modifiers: [
                {
                    name: "preventOverflow",
                    options: {
                        boundary: Object.values(this._containers),
                    },
                },
            ],
        });
        const containerClasses = {
            top: ["top-0", "pt-4"],
            right: ["top-0", "right-0", "pr-4"],
            bottom: ["bottom-0", "pb-4"],
            left: ["top-0", "left-0", "pl-4"],
        };
        for (const id in this._containers) {
            const container = this._containers[id];
            container.className =
                "absolute flex gap-y-3 gap-x-3 pointer-events-none p-4";
            container.classList.add(...containerClasses[id]);
            container.id = `${id}-toolbar-container`;
            this.setContainerAlignment(id, "center");
        }
        const hContainerClass = ["flex-row", "w-full"];
        const vContainerClass = ["flex-column", "h-full"];
        this._containers.top.classList.add(...hContainerClass);
        this._containers.right.classList.add(...vContainerClass);
        this._containers.bottom.classList.add(...hContainerClass);
        this._containers.left.classList.add(...vContainerClass);
    }
    get() {
        return this.toolbars;
    }
    async dispose() {
        this.setupEvents(false);
        for (const name in this._containers) {
            const element = this._containers[name];
            element.remove();
        }
        for (const toolbar of this.toolbars) {
            await toolbar.dispose();
        }
        for (const child of this.children) {
            await child.dispose();
        }
        this._popperInstance.destroy();
        this.children = [];
        await this.contextMenu.dispose();
        this._containers = {};
        this._contextMenuContainer.remove();
        this._popperInstance = null;
        this._components = null;
        this.contextMenu = null;
        this._contextMenuContainer = null;
        await this.onDisposed.trigger();
        this.onDisposed.reset();
    }
    async init() {
        this.setupEvents(true);
        this.viewerContainer.append(this._containers.top, this._containers.right, this._containers.bottom, this._containers.left, this._contextMenuContainer);
        this.viewerContainer.style.position = "relative";
        this.viewerContainer.classList.add("obc-viewer");
        // Get material icons
        const materialIconsLink = document.createElement("link");
        materialIconsLink.rel = "stylesheet";
        materialIconsLink.href =
            "https://fonts.googleapis.com/icon?family=Material+Icons";
        // Get openbim-components styles
        const fetchResponse = await fetch("https://raw.githubusercontent.com/ThatOpen/engine_components/main/resources/styles.css");
        const componentsCSS = await fetchResponse.text();
        const styleElement = document.createElement("style");
        styleElement.id = "openbim-components";
        styleElement.textContent = componentsCSS;
        const firstLinkTag = document.head.querySelector("link");
        if (firstLinkTag) {
            // Inserting the styles before any link tag makes sure the developer can override the library styles
            document.head.insertBefore(materialIconsLink, firstLinkTag);
            document.head.insertBefore(styleElement, firstLinkTag);
        }
        else {
            document.head.append(materialIconsLink, styleElement);
        }
    }
    add(...uiComponents) {
        for (const component of uiComponents) {
            this.children.push(component);
            this.viewerContainer.append(component.domElement);
        }
    }
    closeMenus() {
        this.toolbars.forEach((toolbar) => toolbar.closeMenus());
        this.contextMenu.closeMenus();
    }
    setContainerAlignment(container, alingment) {
        this._containers[container].style.justifyContent = alingment;
        this._containers[container].style.alignItems = alingment;
    }
    addToolbar(...toolbar) {
        toolbar.forEach((tlbr) => {
            const container = this._containers[tlbr.position];
            if (!container) {
                return;
            }
            container.append(tlbr.domElement);
            this.toolbars.push(tlbr);
        });
        this.updateToolbars();
    }
    updateToolbars() {
        this.toolbars.forEach((toolbar) => {
            toolbar.visible = true;
            toolbar.updateElements();
            if (toolbar.position === "bottom" || toolbar.position === "top") {
                toolbar.setDirection("horizontal");
            }
            else {
                toolbar.setDirection("vertical");
            }
        });
    }
    setupEvents(active) {
        if (active) {
            this.viewerContainer.addEventListener("mouseup", this.onMouseUp);
            this.viewerContainer.addEventListener("mousedown", this.onMouseDown);
            this.viewerContainer.addEventListener("mousemove", this.onMouseMoved);
            this.viewerContainer.addEventListener("contextmenu", this.onContextMenu);
        }
        else {
            this.viewerContainer.removeEventListener("mouseup", this.onMouseUp);
            this.viewerContainer.removeEventListener("mousedown", this.onMouseDown);
            this.viewerContainer.removeEventListener("mousemove", this.onMouseMoved);
            this.viewerContainer.removeEventListener("contextmenu", this.onContextMenu);
        }
    }
}
// TODO: Does this need to be here?
UIManager.Class = {
    Label: "block leading-6 text-gray-400 text-sm my-0",
};
//# sourceMappingURL=index.js.map