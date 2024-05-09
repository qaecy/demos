import { generateUUID } from "three/src/math/MathUtils";
import { Component, Event } from "../../base-types";
export class SimpleUIComponent extends Component {
    get domElement() {
        if (!this._domElement) {
            throw new Error("Dom element not initialized!");
        }
        return this._domElement;
    }
    set domElement(ele) {
        if (this._domElement) {
            this._domElement.remove();
        }
        this._domElement = ele;
    }
    set parent(value) {
        this._parent = value;
    }
    get parent() {
        return this._parent;
    }
    get active() {
        return this._active;
    }
    set active(active) {
        this.domElement.setAttribute("data-active", String(active));
        this._active = active;
    }
    get visible() {
        return this._visible;
    }
    set visible(value) {
        this._visible = value;
        if (value) {
            this.domElement.classList.remove("hidden");
            this.onVisible.trigger(this.get());
        }
        else {
            this.domElement.classList.add("hidden");
            this.onHidden.trigger(this.get());
        }
    }
    get enabled() {
        return this._enabled;
    }
    set enabled(value) {
        this._enabled = value;
        if (value) {
            this.onEnabled.trigger(this.get());
        }
        else {
            this.onDisabled.trigger(this.get());
        }
        // this.onVisibilityChanged.trigger(value);
    }
    get hasElements() {
        return this.children.length > 0;
    }
    set template(value) {
        const regex = /id="([^"]+)"/g;
        const temp = document.createElement("div");
        temp.innerHTML = value.replace(regex, `id="$1-${this.id}"`);
        const newElement = temp.firstElementChild;
        newElement.id = this.id;
        this.domElement = newElement;
        temp.remove();
    }
    constructor(components, template, id) {
        super(components);
        this.name = "SimpleUIComponent";
        /** {@link Disposable.onDisposed} */
        this.onDisposed = new Event();
        // TODO: Remove children and leave only slots?
        this.children = [];
        this.data = {};
        // Slots are other UIComponents that inherits all the logic from SimpleUIComponent
        this.slots = {};
        // InnerElements are those HTML Elements which doesn't come from an UIComponent.
        this.innerElements = {};
        this.onVisible = new Event();
        this.onHidden = new Event();
        this.onEnabled = new Event();
        this.onDisabled = new Event();
        this._parent = null;
        this._enabled = true;
        this._visible = true;
        this._active = false;
        this._components = components;
        this.id = id ?? generateUUID();
        this.template = template ?? "<div></div>";
    }
    cleanData() {
        this.data = {};
    }
    get() {
        return this.domElement;
    }
    async dispose(onlyChildren = false) {
        for (const name in this.slots) {
            const slot = this.slots[name];
            if (!slot)
                continue;
            await slot.dispose();
        }
        for (const child of this.children) {
            await child.dispose();
            this.removeChild(child);
        }
        for (const name in this.innerElements) {
            const element = this.innerElements[name];
            if (element) {
                element.remove();
            }
        }
        if (!onlyChildren) {
            if (this._domElement) {
                this._domElement.remove();
            }
            this.onVisible.reset();
            this.onHidden.reset();
            this.onEnabled.reset();
            this.onDisabled.reset();
            this.innerElements = {};
            this.children = [];
            this.slots = {};
            this.parent = null;
        }
        await this.onDisposed.trigger();
        this.onDisposed.reset();
    }
    addChild(...items) {
        for (const item of items) {
            this.children.push(item);
            this.domElement.append(item.domElement);
            item.parent = this;
        }
    }
    removeChild(...items) {
        for (const item of items) {
            item.domElement.remove();
            item.parent = null;
        }
        const filtered = this.children.filter((child) => !items.includes(child));
        this.children = filtered;
    }
    removeFromParent() {
        if (!this.parent)
            return;
        this.get().removeAttribute("data-tooeen-slot");
        this.parent.removeChild(this);
    }
    getInnerElement(id) {
        return this.get().querySelector(`#${id}-${this.id}`);
    }
    setSlot(name, uiComponent) {
        const slot = this.get().querySelector(`[data-tooeen-slot="${name}"]`);
        if (!slot)
            throw new Error(`Slot ${name} not found. You need to declare it in the UIComponent template using data-tooeen-slot="${name}"`);
        this.slots[name] = uiComponent;
        uiComponent.get().setAttribute("data-tooeen-slot", name);
        uiComponent.parent = this;
        slot.replaceWith(uiComponent.get());
        this.children.push(uiComponent);
    }
    setSlots() {
        for (const name in this.slots) {
            const component = this.slots[name];
            this.setSlot(name, component);
        }
    }
}
//# sourceMappingURL=index.js.map