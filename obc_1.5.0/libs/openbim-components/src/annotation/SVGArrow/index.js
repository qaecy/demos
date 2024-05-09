import { Vector2 } from "three";
import { generateUUID } from "three/src/math/MathUtils";
import { Component, Event, } from "../../base-types";
export class SVGArrow extends Component {
    constructor(components, startPoint, endPoint) {
        super(components);
        this.name = "SVGRectangle";
        this.enabled = true;
        this.id = generateUUID();
        /** {@link Disposable.onDisposed} */
        this.onDisposed = new Event();
        this._line = document.createElementNS("http://www.w3.org/2000/svg", "line");
        this._polygon = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
        this._marker = document.createElementNS("http://www.w3.org/2000/svg", "marker");
        this._arrow = document.createElementNS("http://www.w3.org/2000/svg", "g");
        this._startPoint = new Vector2();
        this._endPoint = new Vector2();
        // Create marker for the arrow head
        this._marker.setAttribute("id", `${this.id}-arrowhead`);
        this._marker.setAttribute("markerWidth", "5");
        this._marker.setAttribute("markerHeight", "6");
        this._marker.setAttribute("refX", "4");
        this._marker.setAttribute("refY", "3");
        this._marker.setAttribute("orient", "auto");
        // Create polygon for the arrowhead shape
        this._polygon.setAttribute("points", "0 0, 5 3, 0 6");
        this._marker.appendChild(this._polygon);
        this._line.setAttribute("marker-end", `url(#${this.id}-arrowhead)`);
        this._arrow.append(this._marker, this._line);
        this.startPoint = startPoint ?? this.startPoint;
        this.endPoint = endPoint ?? this.endPoint;
        this._arrow.id = this.id;
        this.setStyle();
    }
    async dispose() {
        this._arrow.remove();
        this._marker.remove();
        this._polygon.remove();
        this._line.remove();
        this.components = null;
        await this.onDisposed.trigger();
        this.onDisposed.reset();
    }
    setStyle(style) {
        this._line.setAttribute("stroke", style?.strokeColor ?? "red");
        this._line.setAttribute("stroke-width", style?.strokeWidth?.toString() ?? "4");
        this._polygon.setAttribute("fill", style?.strokeColor ?? "red");
    }
    reset() {
        this.x1 = 0;
        this.y1 = 0;
        this.x2 = 0;
        this.y2 = 0;
    }
    clone() {
        return new SVGArrow(this.components, this.startPoint, this.endPoint);
    }
    set x1(value) {
        this._startPoint.x = value;
        this._line.setAttribute("x1", value.toString());
    }
    set y1(value) {
        this._startPoint.y = value;
        this._line.setAttribute("y1", value.toString());
    }
    set startPoint(point) {
        this.x1 = point.x;
        this.y1 = point.y;
    }
    get startPoint() {
        return this._startPoint;
    }
    set x2(value) {
        this._endPoint.x = value;
        this._line.setAttribute("x2", value.toString());
    }
    set y2(value) {
        this._endPoint.y = value;
        this._line.setAttribute("y2", value.toString());
    }
    set endPoint(point) {
        this.x2 = point.x;
        this.y2 = point.y;
    }
    get endPoint() {
        return this._endPoint;
    }
    get() {
        return this._arrow;
    }
}
//# sourceMappingURL=index.js.map