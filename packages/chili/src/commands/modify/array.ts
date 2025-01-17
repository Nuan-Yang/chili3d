// Copyright 2022-2023 the Chili authors. All rights reserved. AGPL-3.0 license.

import {
    AsyncController,
    Config,
    IModel,
    INode,
    LineType,
    Matrix4,
    Transaction,
    XYZ,
    command,
} from "chili-core";
import { Selection } from "../../selection";
import { Dimension, SnapPointData } from "../../snap";
import { IStep, PointStep } from "../../step";
import { MultistepCommand } from "../multistepCommand";

@command({
    name: "modify.array",
    display: "command.array",
    icon: "icon-array",
})
export class Array extends MultistepCommand {
    private models?: IModel[];
    private positions?: number[];

    getSteps(): IStep[] {
        let firstStep = new PointStep("operate.pickFistPoint");
        let secondStep = new PointStep("operate.pickNextPoint", this.getSecondPointData);
        return [firstStep, secondStep];
    }

    private getSecondPointData = (): SnapPointData => {
        return {
            refPoint: this.stepDatas[0].point!,
            dimension: Dimension.D1D2D3,
            preview: this.movePreview,
        };
    };

    private movePreview = (point: XYZ) => {
        let start = this.stepDatas[0].point!;
        let positions = [...this.positions!];
        let { x, y, z } = point.sub(start);
        for (let i = 0; i < this.positions!.length; i++) {
            if (i % 3 === 0) positions[i] += x;
            else if (i % 3 === 1) positions[i] += y;
            else if (i % 3 === 2) positions[i] += z;
        }
        positions.push(start.x, start.y, start.z, point.x, point.y, point.z);
        return [
            {
                positions,
                lineType: LineType.Solid,
                color: Config.instance.visual.temporaryEdgeColor,
                groups: [],
            },
        ];
    };

    protected override async beforeExecute(): Promise<boolean> {
        this.models = this.document.selection
            .getSelectedNodes()
            .filter((x) => INode.isModelNode(x)) as IModel[];
        if (this.models.length === 0) {
            this.controller = new AsyncController();
            this.models = await Selection.pickModel(this.document, "axis.x", this.controller);
            if (this.restarting || this.models.length === 0) return false;
        }
        this.positions = [];
        this.models?.forEach((model) => {
            let ps = model.shape()?.mesh.edges?.positions;
            if (ps) this.positions = this.positions!.concat(model.matrix.ofPoints(ps));
        });
        return true;
    }

    protected executeMainTask(): void {
        Transaction.excute(this.document, `excute ${Object.getPrototypeOf(this).data.name}`, () => {
            let vec = this.stepDatas[1].point!.sub(this.stepDatas[0].point!);
            let transform = Matrix4.createTranslation(vec.x, vec.y, vec.z);
            this.models?.forEach((x) => {
                x.matrix = x.matrix.multiply(transform);
            });
            this.document.visual.viewer.update();
        });
    }
}
