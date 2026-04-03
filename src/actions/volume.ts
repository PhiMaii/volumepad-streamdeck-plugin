import { action, type KeyAction, type KeyDownEvent } from "@elgato/streamdeck";

import { backendRuntime } from "../runtime/backend-runtime";
import { renderVolumeKeySvg } from "../runtime/svg";
import { RuntimeKeyAction } from "./runtime-key-action";

@action({ UUID: "net.phimai.volumepad.streamdeck-remote.volume" })
export class VolumeAction extends RuntimeKeyAction<Record<string, never>> {
    override async onKeyDown(ev: KeyDownEvent<Record<string, never>>): Promise<void> {
        try {
            await backendRuntime.toggleMute();
        } catch {
            await ev.action.showAlert();
        }
    }

    protected override async renderKey(action: KeyAction<Record<string, never>>): Promise<void> {
        const snapshot = this.getSnapshot();
        const isOffline = !snapshot.endpointOnline;

        const volumePercent = snapshot.state === null ? null : Math.round(snapshot.state.master.volume * 100);
        const muted = snapshot.state?.master.muted ?? false;
        const title = volumePercent === null ? (isOffline ? "Offline" : "--%") : `${volumePercent}%`;

        await Promise.all([
            action.setImage(renderVolumeKeySvg(muted, isOffline)),
            action.setTitle(title),
        ]);
    }
}

