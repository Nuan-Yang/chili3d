// Copyright 2022-2023 the Chili authors. All rights reserved. AGPL-3.0 license.

import { nanoid } from "nanoid";

export class Id {
    static new() {
        return nanoid();
    }
}
