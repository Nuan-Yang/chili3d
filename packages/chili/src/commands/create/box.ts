// Copyright 2022-2023 the Chili authors. All rights reserved. AGPL-3.0 license.

import { GeometryModel, Plane, XYZ, command } from "chili-core";
import { BoxBody } from "../../bodys";
import { SnapLengthAtAxisData } from "../../snap";
import { IStep, LengthAtAxisStep } from "../../step";
import { RectCommandBase } from "./rect";

@command({
    name: "create.box",
    display: "command.box",
    icon: "icon-box",
})
export class Box extends RectCommandBase {
    private static count: number = 1;

    protected override getSteps(): IStep[] {
        let steps = super.getSteps();
        let third = new LengthAtAxisStep("operate.pickNextPoint", this.getHeightStepData);
        return [...steps, third];
    }

    private getHeightStepData = (): SnapLengthAtAxisData => {
        return {
            point: this.stepDatas[1].point!,
            direction: this.stepDatas[0].view.workplane.normal,
            preview: this.previewBox,
        };
    };

    private previewBox = (end: XYZ) => {
        let data = this.getRectData(end);
        return [
            this.application.shapeFactory
                .box(data.plane, data.dx, data.dy, this.getHeight(data.plane, end))
                .unwrap().mesh.edges!,
        ];
    };

    protected create(): GeometryModel {
        let rect = this.getRectData(this.stepDatas[1].point!);
        let dz = this.getHeight(rect.plane, this.stepDatas[2].point!);
        let body = new BoxBody(this.document, rect.plane, rect.dx, rect.dy, dz);
        return new GeometryModel(this.document, `Box ${Box.count++}`, body);
    }

    private getHeight(plane: Plane, point: XYZ): number {
        return point.sub(this.stepDatas[1].point!).dot(plane.normal);
    }
}
