import type { JsonObject, KeyAction, WillAppearEvent } from "@elgato/streamdeck";
import { SingletonAction } from "@elgato/streamdeck";

import { backendRuntime } from "../runtime/backend-runtime";
import type { RuntimeSnapshot } from "../types/streamdeck";

export abstract class RuntimeKeyAction<TSettings extends JsonObject> extends SingletonAction<TSettings> {
    private readonly _unsubscribe: () => void;

    constructor() {
        super();

        this._unsubscribe = backendRuntime.subscribe(() => {
            void this.renderVisibleActions();
        });
    }

    override onWillAppear(ev: WillAppearEvent<TSettings>): Promise<void> | void {
        if (!ev.action.isKey()) {
            return;
        }

        return this.renderKey(ev.action);
    }

    protected getSnapshot(): RuntimeSnapshot {
        return backendRuntime.getSnapshot();
    }

    protected abstract renderKey(action: KeyAction<TSettings>): Promise<void>;

    protected async renderVisibleActions(): Promise<void> {
        const renderOperations: Promise<void>[] = [];
        for (const action of this.actions) {
            if (action.isKey()) {
                renderOperations.push(this.renderKey(action));
            }
        }

        await Promise.allSettled(renderOperations);
    }
}
