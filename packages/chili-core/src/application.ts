// Copyright 2022-2023 the Chili authors. All rights reserved. AGPL-3.0 license.

import { IShapeFactory } from "chili-geo";
import { IVisualFactory } from "chili-vis";
import { IStorage } from "./base";
import { IDocument } from "./document";
import { Serialized } from "./serialize";
import { IService } from "./service";

export interface IApplication {
    readonly visualFactory: IVisualFactory;
    readonly shapeFactory: IShapeFactory;
    readonly services: IService[];
    readonly storage: IStorage;
    activeDocument: IDocument | undefined;
    newDocument(name: string): Promise<IDocument>;
    openDocument(id: string): Promise<IDocument | undefined>;
    loadDocument(data: Serialized): Promise<IDocument>;
}
