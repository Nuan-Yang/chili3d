// Copyright 2022-2023 the Chili authors. All rights reserved. AGPL-3.0 license.

import { EventEmitter } from "events";
import { IDocument } from "../document";
import { IDisposable } from "./disposable";
import { IEqualityComparer } from "./equalityComparer";
import { PropertyHistoryRecord } from "./history";
import { Transaction } from "./transaction";

const PropertyChangedEvent = "PropertyChangedEvent";

export type PropertyChangedHandler<T, K extends keyof T> = (property: K, source: T, oldValue: T[K]) => void;

export interface IPropertyChanged {
    onPropertyChanged<K extends keyof this>(handler: PropertyChangedHandler<this, K>): void;
    removePropertyChanged<K extends keyof this>(handler: PropertyChangedHandler<this, K>): void;
}

export class Observable implements IPropertyChanged, IDisposable {
    protected readonly eventEmitter: EventEmitter;

    constructor() {
        this.eventEmitter = new EventEmitter();
    }

    protected setPrivatePropertyValue<K extends keyof this>(pubKey: K, newValue: this[K]) {
        let privateKey = `_${String(pubKey)}`;
        if (privateKey in this) {
            (this as any)[privateKey] = newValue;
        } else {
            throw new Error(`property ${privateKey} dose not exist in ${this.constructor.name}`);
        }
    }

    /**
     * Set the value of a private property, and if successful, execute emitPropertyChanged.
     *
     * Note: The private property name must be the public property name with the prefix _, i.e., age->_age(private property name).
     */
    protected setProperty<K extends keyof this>(
        property: K,
        newValue: this[K],
        onPropertyChanged?: (property: K, oldValue: this[K]) => void,
        equals?: IEqualityComparer<this[K]>,
    ): boolean {
        let oldValue = this[property];
        if (this.isEuqals(oldValue, newValue, equals)) return false;
        this.setPrivatePropertyValue(property, newValue);
        onPropertyChanged?.(property, oldValue);
        this.emitPropertyChanged(property, oldValue);
        return true;
    }

    private isEuqals<K extends keyof this>(
        oldValue: this[K],
        newValue: this[K],
        equals?: IEqualityComparer<this[K]>,
    ): boolean {
        if (equals !== undefined) {
            return equals.equals(oldValue, newValue);
        } else {
            return oldValue === newValue;
        }
    }

    protected emitPropertyChanged<K extends keyof this>(property: K, oldValue: this[K]) {
        this.eventEmitter.emit(PropertyChangedEvent, property, this, oldValue);
    }

    onPropertyChanged<K extends keyof this>(handler: PropertyChangedHandler<this, K>) {
        this.eventEmitter.on(PropertyChangedEvent, handler);
    }

    removePropertyChanged<K extends keyof this>(handler: PropertyChangedHandler<this, K>) {
        this.eventEmitter.off(PropertyChangedEvent, handler);
    }

    dispose() {
        this.eventEmitter.eventNames().forEach((x) => {
            this.eventEmitter.removeAllListeners(x);
        });
    }
}

export abstract class HistoryObservable extends Observable {
    constructor(readonly document: IDocument) {
        super();
    }

    protected override setProperty<K extends keyof this>(
        property: K,
        newValue: this[K],
        onPropertyChanged?: (property: K, oldValue: this[K]) => void,
        equals?: IEqualityComparer<this[K]> | undefined,
    ): boolean {
        return super.setProperty(
            property,
            newValue,
            (property, oldValue) => {
                onPropertyChanged?.(property, oldValue);
                Transaction.add(
                    this.document,
                    new PropertyHistoryRecord(this, property, oldValue, newValue),
                );
            },
            equals,
        );
    }
}
