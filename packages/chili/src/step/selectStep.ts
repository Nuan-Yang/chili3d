// Copyright 2022-2023 the Chili authors. All rights reserved. AGPL-3.0 license.

import {
    AsyncController,
    GeometryModel,
    I18nKeys,
    IDocument,
    IModel,
    IShapeFilter,
    ShapeType,
} from "chili-core";
import { Selection } from "../selection";
import { SnapedData } from "../snap";
import { IStep } from "./step";

export class SelectShapeStep implements IStep {
    constructor(
        readonly snapeType: ShapeType,
        readonly prompt: I18nKeys,
        readonly multiple: boolean = false,
        readonly filter?: IShapeFilter,
    ) {}

    async execute(document: IDocument, controller: AsyncController): Promise<SnapedData | undefined> {
        let shapes = await Selection.pickShape(
            document,
            this.snapeType,
            this.prompt,
            controller,
            this.multiple,
            this.filter,
        );
        if (shapes.length === 0) return undefined;
        return {
            view: document.visual.viewer.activeView!,
            shapes,
        };
    }
}

export class SelectModelStep implements IStep {
    constructor(
        readonly prompt: I18nKeys,
        readonly multiple: boolean = false,
        readonly filter?: IShapeFilter,
    ) {}

    async execute(document: IDocument, controller: AsyncController): Promise<SnapedData | undefined> {
        let models = await Selection.pickModel(
            document,
            this.prompt,
            controller,
            this.multiple,
            this.filter,
        );
        if (models.length === 0) return undefined;
        return {
            view: document.visual.viewer.activeView!,
            shapes: [],
            models,
        };
    }
}
