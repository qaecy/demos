import * as THREE from "three";
import { LineGeometry } from "three/examples/jsm/lines/LineGeometry";
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial";
import { Line2 } from "three/examples/jsm/lines/Line2";
import { Simple2DMarker } from "../../../core";
import { Event, Component } from "../../../base-types";
import { DimensionLabelClassName } from "../../SimpleDimensionLine";
export class AngleMeasureElement extends Component {
    set lineMaterial(material) {
        this._lineMaterial.dispose();
        this._lineMaterial = material;
        this._line.material = material;
        this._lineMaterial.resolution.set(window.innerWidth, window.innerHeight);
    }
    get lineMaterial() {
        return this._lineMaterial;
    }
    set labelMarker(marker) {
        this._labelMarker.dispose();
        this._labelMarker = marker;
    }
    get labelMarker() {
        return this._labelMarker;
    }
    get scene() {
        return this._components.scene.get();
    }
    constructor(components, points) {
        super(components);
        this.enabled = true;
        this.visible = true;
        this.points = [];
        /** {@link Disposable.onDisposed} */
        this.onDisposed = new Event();
        this._lineMaterial = new LineMaterial({
            color: 0x6528d7,
            linewidth: 2,
        });
        this._lineGeometry = new LineGeometry();
        this._line = new Line2(this._lineGeometry, this._lineMaterial);
        this.onAngleComputed = new Event();
        this.onPointAdded = new Event();
        this._components = components;
        const htmlText = document.createElement("div");
        htmlText.className = DimensionLabelClassName;
        this._labelMarker = new Simple2DMarker(components, htmlText);
        this.labelMarker.visible = false;
        this.onPointAdded.add(() => {
            if (this.points.length === 1)
                this.scene.add(this._line);
            if (this.points.length === 3)
                this.labelMarker.visible = true;
        });
        this.onAngleComputed.add((angle) => {
            this.labelMarker.get().element.textContent = `${angle.toFixed(2)}°`;
            this.labelMarker
                .get()
                .position.copy(this.points[1] ?? new THREE.Vector3());
        });
        points?.forEach((point) => this.setPoint(point));
    }
    setPoint(point, index) {
        let _index;
        if (!index) {
            _index = this.points.length === 0 ? 0 : this.points.length;
        }
        else {
            _index = index;
        }
        if (![0, 1, 2].includes(_index))
            return;
        this.points[_index] = point;
        this.onPointAdded.trigger(point);
        const points = this.points.map((point) => {
            return [point.x, point.y, point.z];
        });
        this._lineGeometry.setPositions(points.flat());
    }
    toggleLabel() {
        this.labelMarker.toggleVisibility();
    }
    computeAngle() {
        const v0 = this.points[0];
        const v1 = this.points[1];
        const v2 = this.points[2];
        if (!(v0 && v1 && v2))
            return 0;
        const vA = new THREE.Vector3().subVectors(v1, v0);
        const vB = new THREE.Vector3().subVectors(v1, v2);
        const angle = THREE.MathUtils.radToDeg(vA.angleTo(vB));
        this.onAngleComputed.trigger(angle);
        return angle;
    }
    async dispose() {
        this.points = [];
        await this.labelMarker.dispose();
        this.onAngleComputed.reset();
        this.onPointAdded.reset();
        await this.labelMarker.dispose();
        this._line.removeFromParent();
        this._lineMaterial.dispose();
        this._lineGeometry.dispose();
        this._components = null;
        await this.onDisposed.trigger();
        this.onDisposed.reset();
    }
    get() {
        return {
            points: this.points,
            angle: this.computeAngle(),
        };
    }
}
//# sourceMappingURL=index.js.map