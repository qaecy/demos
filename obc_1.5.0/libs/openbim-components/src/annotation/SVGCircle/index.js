import { Vector2 } from "three";
import { generateUUID } from "three/src/math/MathUtils";
import { Component, Event, } from "../../base-types";
export class SVGCircle extends Component {
    constructor(components, centerPoint, radius) {
        super(components);
        this.id = generateUUID();
        this.name = "SVGRectangle";
        this.enabled = true;
        /** {@link Disposable.onDisposed} */
        this.onDisposed = new Event();
        this._circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        this._centerPoint = new Vector2();
        this._radius = 20;
        this.centerPoint = centerPoint ?? this.centerPoint;
        this.radius = radius ?? this.radius;
        this._circle.id = this.id;
        this.setStyle();
    }
    async dispose() {
        this._circle.remove();
        this.components = null;
        await this.onDisposed.trigger();
        this.onDisposed.reset();
    }
    setStyle(style) {
        this._circle.setAttribute("stroke", style?.strokeColor ?? "red");
        this._circle.setAttribute("stroke-width", style?.strokeWidth?.toString() ?? "4");
        this._circle.setAttribute("fill", style?.fillColor ?? "transparent");
    }
    reset() {
        this.cx = 0;
        this.cy = 0;
        this.radius = 0;
    }
    clone() {
        return new SVGCircle(this.components, this.centerPoint, this.radius);
    }
    set radius(value) {
        this._radius = value;
        this._circle.setAttribute("r", value.toString());
    }
    get radius() {
        return this._radius;
    }
    set cx(value) {
        this._centerPoint.x = value;
        this._circle.setAttribute("cx", value.toString());
    }
    set cy(value) {
        this._centerPoint.y = value;
        this._circle.setAttribute("cy", value.toString());
    }
    set centerPoint(point) {
        this.cx = point.x;
        this.cy = point.y;
    }
    get centerPoint() {
        return this._centerPoint;
    }
    get() {
        return this._circle;
    }
}
//# sourceMappingURL=index.js.map