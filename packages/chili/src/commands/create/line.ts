// Copyright 2022-2023 the Chili authors. All rights reserved. MPL-2.0 license.

import { command, Container, ICommand, Id, IDocument, IView, Model, Token, XYZ } from "chili-core";
import { IShapeFactory } from "chili-geo";

import { LineBody } from "../../bodys";
import { Dimension, SnapedData, SnapPointData } from "../../snap";
import { PointStep } from "../step";
import { IStep } from "../step/step";
import { CreateCommand } from "./createCommand";

@command({
    name: "Line",
    display: "command.line",
    icon: "icon-line",
})
export class Line extends CreateCommand {
    create(document: IDocument): Model {
        let body = new LineBody(this.snapedDatas[0].point, this.snapedDatas[1].point);
        return new Model(`Line ${document.modelCount + 1}`, Id.new(), body);
    }

    override afterExcute(document: IDocument): boolean {
        this.snapedDatas[0] = this.snapedDatas[1];
        this.snapedDatas.length = 1;
        this.excuteFromStep(document, 1);
        return true;
    }

    getSteps(): IStep[] {
        let firstStep = new PointStep("operate.pickFistPoint", this.getFirstPointData);
        let secondStep = new PointStep("operate.pickNextPoint", this.getSecondPointData);
        return [firstStep, secondStep];
    }

    private getFirstPointData = (): SnapPointData => {
        return {
            dimension: Dimension.D1D2D3,
        };
    };

    private getSecondPointData = (): SnapPointData => {
        return {
            refPoint: this.snapedDatas[0].point,
            dimension: Dimension.D1D2D3,
            preview: this.linePreview,
        };
    };

    private linePreview = (view: IView, point: XYZ) => {
        let factory = Container.default.resolve<IShapeFactory>(Token.ShapeFactory);
        return factory!.line(this.snapedDatas[0].point, point).value;
    };
}
