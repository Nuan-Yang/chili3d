// Copyright 2022-2023 the Chili authors. All rights reserved. AGPL-3.0 license.

import {
    AsyncController,
    GeometryModel,
    IApplication,
    ICommand,
    IDocument,
    IEdge,
    IModel,
    IShapeFilter,
    ShapeType,
    Transaction,
    command,
} from "chili-core";
import { FaceBody } from "../../bodys/face";
import { WireBody } from "../../bodys/wire";
import { SelectModelStep } from "../../step";

let count = 1;

abstract class ConvertCommand implements ICommand {
    async execute(application: IApplication): Promise<void> {
        let document = application.activeDocument;
        if (!document) return;
        let models = await this.getOrPickModels(document);
        if (!models) return;
        Transaction.excute(document, `excute ${Object.getPrototypeOf(this).data.name}`, () => {
            let geometryModel = this.create(document!, models!);
            document!.addNode(geometryModel);
            document!.visual.viewer.update();
        });
    }

    protected abstract create(document: IDocument, models: IModel[]): GeometryModel;

    async getOrPickModels(document: IDocument) {
        let filter: IShapeFilter = {
            allow: (shape) => {
                return shape.shapeType === ShapeType.Edge || shape.shapeType === ShapeType.Wire;
            },
        };
        let models = this.#getSelectedModels(document, filter);
        if (models.length > 0) return models;
        document.selection.clearSelected();
        let controller = new AsyncController();
        let step = new SelectModelStep("prompt.select.models", true);
        let data = await step.execute(document, controller);
        return data?.models;
    }

    #getSelectedModels(document: IDocument, filter?: IShapeFilter) {
        return document.selection
            .getSelectedNodes()
            .map((x) => x as GeometryModel)
            .filter((x) => {
                if (x === undefined) return false;
                let shape = x.shape();
                if (shape === undefined) return false;
                if (filter !== undefined && !filter.allow(shape)) return false;
                return true;
            });
    }
}

@command({
    name: "convert.toWire",
    display: "command.toWire",
    icon: "icon-toPoly",
})
export class ConvertToWire extends ConvertCommand {
    protected override create(document: IDocument, models: IModel[]): GeometryModel {
        let edges = models.map((x) => x.shape()) as IEdge[];
        let wireBody = new WireBody(document, edges);
        models.forEach((x) => x.parent?.remove(x));
        return new GeometryModel(document, `Wire ${count++}`, wireBody);
    }
}

@command({
    name: "convert.toFace",
    display: "command.toFace",
    icon: "icon-toFace",
})
export class ConvertToFace extends ConvertCommand {
    protected override create(document: IDocument, models: IModel[]): GeometryModel {
        let edges = models.map((x) => x.shape()) as IEdge[];
        let wireBody = new FaceBody(document, edges);
        models.forEach((x) => x.parent?.remove(x));
        return new GeometryModel(document, `Face ${count++}`, wireBody);
    }
}
