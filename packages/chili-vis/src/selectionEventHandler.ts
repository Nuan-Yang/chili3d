// Copyright 2022-2023 the Chili authors. All rights reserved. MPL-2.0 license.

import { IEventHandler, IModel, IView, IVisualShape, ShapeType } from "chili-core";
import { ThreeShape } from "chili-three/src/threeShape";

export class SelectionHandler implements IEventHandler {
    private mouse: { isDown: boolean; x: number; y: number };
    private _lastDetected: IVisualShape | undefined;

    constructor() {
        this.mouse = { isDown: false, x: 0, y: 0 };
    }

    mouseWheel(view: IView, event: WheelEvent): void {
        view.redraw();
    }

    keyUp(view: IView, event: KeyboardEvent): void {}

    pointerMove(view: IView, event: PointerEvent): void {
        if (this._lastDetected !== undefined) {
            this._lastDetected.unHilightedState();
            this._lastDetected = undefined;
        }
        this._lastDetected = view.detectedVisualShapes(event.offsetX, event.offsetY, true).at(0);
        this._lastDetected?.hilightedState();
        view.redraw();
    }

    pointerDown(view: IView, event: PointerEvent): void {
        if (event.button === 0) {
            this.mouse = {
                isDown: true,
                x: event.offsetX,
                y: event.offsetY,
            };
        }
    }

    pointerUp(view: IView, event: PointerEvent): void {
        if (this.mouse.isDown && event.button === 0) {
            let intersect = view.detectedVisualShapes(this.mouse.x, this.mouse.y, true).at(0);
            if (intersect === undefined) {
                view.visual.document.selection.clearSelected();
                return;
            }

            let node = view.visual.context.getModel(intersect);
            if (node !== undefined) view.visual.document.selection.setSelected(event.shiftKey, [node]);

            this.mouse.isDown = false;
        }
        view.visual.viewer.redraw();
    }

    keyDown(view: IView, event: KeyboardEvent): void {}
}