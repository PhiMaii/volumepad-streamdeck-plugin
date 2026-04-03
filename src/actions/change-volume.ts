import { action, type KeyAction, type KeyDownEvent, type WillAppearEvent } from "@elgato/streamdeck";

import { DEFAULT_EFFECTIVE_SETTINGS } from "../settings/catalog";
import { normalizeChangeVolumeSettings } from "../settings/validation";
import { backendRuntime } from "../runtime/backend-runtime";
import { renderChangeVolumeKeySvg } from "../runtime/svg";
import type { ChangeVolumeSettings } from "../types/actions";
import { RuntimeKeyAction } from "./runtime-key-action";

@action({ UUID: "net.phimai.volumepad.streamdeck-remote.change-volume" })
export class ChangeVolumeAction extends RuntimeKeyAction<ChangeVolumeSettings> {
    override async onWillAppear(ev: WillAppearEvent<ChangeVolumeSettings>): Promise<void> {
        const fallbackStep = this.getSnapshot().effectiveSettings.volumeStepSize ?? DEFAULT_EFFECTIVE_SETTINGS.volumeStepSize;
        const normalized = normalizeChangeVolumeSettings(ev.payload.settings, fallbackStep);
        if (normalized.didCoerce) {
            await ev.action.setSettings({
                direction: normalized.direction,
                step: normalized.step,
            });
        }

        return super.onWillAppear(ev);
    }

    override async onKeyDown(ev: KeyDownEvent<ChangeVolumeSettings>): Promise<void> {
        const fallbackStep = this.getSnapshot().effectiveSettings.volumeStepSize ?? DEFAULT_EFFECTIVE_SETTINGS.volumeStepSize;
        const normalized = normalizeChangeVolumeSettings(ev.payload.settings, fallbackStep);

        if (normalized.didCoerce) {
            await ev.action.setSettings({
                direction: normalized.direction,
                step: normalized.step,
            });
        }

        try {
            await backendRuntime.changeVolume(normalized.direction, normalized.step);
        } catch {
            await ev.action.showAlert();
        }
    }

    protected override async renderKey(action: KeyAction<ChangeVolumeSettings>): Promise<void> {
        const settings = await action.getSettings<ChangeVolumeSettings>();
        const fallbackStep = this.getSnapshot().effectiveSettings.volumeStepSize ?? DEFAULT_EFFECTIVE_SETTINGS.volumeStepSize;
        const normalized = normalizeChangeVolumeSettings(settings, fallbackStep);

        const directionPrefix = normalized.direction === "Increase" ? "+" : "-";
        const title = `${directionPrefix}${Math.round(normalized.step * 100)}%`;
        const isOffline = !this.getSnapshot().endpointOnline;

        await Promise.all([
            action.setImage(renderChangeVolumeKeySvg(normalized.direction, isOffline)),
            action.setTitle(title),
        ]);
    }
}

