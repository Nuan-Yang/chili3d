// Copyright 2022-2023 the Chili authors. All rights reserved. MPL-2.0 license.

import { CurveType, ICurve, IEdge, IShape, VertexRenderData } from "chili-geo";
import { i18n, ShapeType, XYZ, XY, ObjectSnapType, I18n } from "chili-shared";
import { ISelection, IView } from "chili-vis";
import { IPointSnap, ISnap, SnapInfo } from "./interfaces";

const SnapDistance: number = 5;

interface Hilighted {
    view: IView;
    shapes: IShape[];
}

interface InvisibleSnapInfo {
    view: IView;
    snaps: SnapInfo[];
    displays: number[];
}

export class ObjectSnap implements IPointSnap {
    private _snapedPoint?: SnapInfo;
    private _featureInfos: Map<IShape, SnapInfo[]>;
    private _intersectionInfos: Map<string, SnapInfo[]>;
    private _invisibleInfos: Map<IShape, InvisibleSnapInfo>;
    private _hilightedShapes?: Hilighted;
    private _detectedShape: IShape | undefined;

    constructor(readonly selection: ISelection, private _snapType: ObjectSnapType, readonly referencePoint?: XYZ) {
        this._featureInfos = new Map();
        this._intersectionInfos = new Map();
        this._invisibleInfos = new Map();
    }

    getDetectedShape(): IShape | undefined {
        return this._detectedShape;
    }

    onSnapTypeChanged(snapType: ObjectSnapType) {
        this._snapType = snapType;
        this._featureInfos.clear();
        this._intersectionInfos.clear();
    }

    handleKeyUp(): void {
        throw new Error("Method not implemented.");
    }

    point(): SnapInfo | undefined {
        return this._snapedPoint;
    }

    removeDynamicObject(): void {
        this.unHilited();
    }

    snap(view: IView, x: number, y: number): boolean {
        this._snapedPoint = undefined;
        this.selection.setSelectionType(ShapeType.Edge);
        let shapes = this.selection.detectedShapes(view, x, y);
        if (shapes !== undefined && shapes.length > 0) {
            this._detectedShape = shapes[0];
            this.showInvisibleSnaps(view, shapes[0]);
            let featurePoints = this.getFeaturePoints(shapes[0]);
            let intersections = this.getIntersections(shapes[0], shapes);
            let ordered = featurePoints.concat(intersections).sort((a, b) => this.sortSnaps(view, x, y, a, b));
            if (ordered.length !== 0 && this.distanceToMouse(view, x, y, ordered[0].point) < SnapDistance) {
                this._snapedPoint = ordered[0];
                this.hilited(view, this._snapedPoint.shapes);
                return true;
            }
        } else {
            this._detectedShape = undefined;
        }

        return this.getInvisibleSnape(view, x, y);
    }

    private getInvisibleSnape(view: IView, x: number, y: number): boolean {
        let snap: SnapInfo | undefined = undefined;
        let minDistance = Number.MAX_VALUE;
        this._invisibleInfos.forEach((info) => {
            info.snaps.forEach((s) => {
                let dist = this.distanceToMouse(view, x, y, s.point);
                if (dist < minDistance) {
                    minDistance = dist;
                    snap = s;
                }
            });
        });
        if (minDistance < SnapDistance) {
            this._snapedPoint = snap;
            this.hilited(view, snap!.shapes);
            return true;
        }

        return false;
    }

    private showInvisibleSnaps(view: IView, shape: IShape) {
        if (shape.shapeType === ShapeType.Edge) {
            if (this._invisibleInfos.has(shape)) return;
            let curve = (shape as IEdge).asCurve();
            if (curve !== undefined && ICurve.isCircle(curve)) {
                let temporary = VertexRenderData.from(curve.center, 0xffff00, 3);
                let id = view.document.visualization.context.temporaryDisplay(temporary);
                this._invisibleInfos.set(shape, {
                    view,
                    snaps: [
                        {
                            point: curve.center,
                            info: i18n["snap.center"],
                            shapes: [shape],
                        },
                    ],
                    displays: [id],
                });
            }
        }
    }

    private hilited(view: IView, shapes: IShape[]) {
        this._hilightedShapes = {
            view,
            shapes: shapes,
        };
        shapes.map((x) => view.document.visualization.context.hilighted(x));
    }

    clear() {
        this.unHilited();
        this._invisibleInfos.forEach((info) => {
            info.displays.forEach((x) => info.view.document.visualization.context.temporaryRemove(x));
        });
    }

    private unHilited() {
        if (this._hilightedShapes !== undefined) {
            this._hilightedShapes.shapes.forEach((x) =>
                this._hilightedShapes?.view.document.visualization.context.unHilighted(x)
            );
            this._hilightedShapes = undefined;
        }
    }

    private distanceToMouse(view: IView, x: number, y: number, point: XYZ) {
        let xy = view.worldToScreen(point);
        let dx = xy.x - x;
        let dy = xy.y - y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    private sortSnaps(view: IView, x: number, y: number, a: SnapInfo, b: SnapInfo): number {
        return this.distanceToMouse(view, x, y, a.point) - this.distanceToMouse(view, x, y, b.point);
    }

    getIntersections(current: IShape, shapes: IShape[]) {
        let result = new Array<SnapInfo>();
        if (current.shapeType !== ShapeType.Edge) return result;
        shapes.forEach((x) => {
            if (x === current || x.shapeType !== ShapeType.Edge) return;
            let key = current.id < x.id ? `${current.id}:${x.id}` : `${x.id}:${current.id}`;
            if (!this._intersectionInfos.has(key)) {
                let intersections = (current as IEdge).intersect(x as IEdge);
                if (intersections.length > 0) {
                    let infos: SnapInfo[] = intersections.map((point) => {
                        return { point, info: i18n["snap.intersection"], shapes: [current, x] };
                    });
                    this._intersectionInfos.set(key, infos);
                }
            }
            if (this._intersectionInfos.has(key)) result.push(...this._intersectionInfos.get(key)!);
        });
        return result;
    }

    private getFeaturePoints(shape: IShape) {
        if (this._featureInfos.has(shape)) {
            return this._featureInfos.get(shape)!;
        }
        let infos = new Array<SnapInfo>();
        if (shape.shapeType === ShapeType.Edge) {
            this.getEdgeFeaturePoints(shape, infos);
        }
        this._featureInfos.set(shape, infos);
        return infos;
    }

    private getEdgeFeaturePoints(shape: IShape, infos: SnapInfo[]) {
        let curve = (shape as IEdge).asCurve();
        if (curve === undefined) return;
        let start = curve.point(curve.firstParameter());
        let end = curve.point(curve.lastParameter());
        let addPoint = (point: XYZ, info: string) => infos.push({ point, info, shapes: [shape] });
        if (ObjectSnapType.has(this._snapType, ObjectSnapType.endPoint)) {
            addPoint(start, i18n["snap.end"]);
            addPoint(end, i18n["snap.end"]);
        }
        if (ObjectSnapType.has(this._snapType, ObjectSnapType.midPoint) && curve.curveType === CurveType.Line) {
            infos.push({
                point: XYZ.center(start, end),
                info: i18n["snap.mid"],
                shapes: [shape],
            });
        }
    }
}