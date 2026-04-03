import { action, type KeyAction, type KeyDownEvent, type WillAppearEvent } from "@elgato/streamdeck";

import { SETTINGS_CATALOG_BY_KEY } from "../settings/catalog";
import { normalizeChangeSettingsSettings, validateSettingValue } from "../settings/validation";
import { backendRuntime } from "../runtime/backend-runtime";
import { renderChangeSettingsKeySvg } from "../runtime/svg";
import type { ChangeSettingsSettings } from "../types/actions";
import type { EffectiveSettings } from "../types/streamdeck";
import { RuntimeKeyAction } from "./runtime-key-action";

@action({ UUID: "net.phimai.volumepad.streamdeck-remote.change-settings" })
export class ChangeSettingsAction extends RuntimeKeyAction<ChangeSettingsSettings> {
    override async onWillAppear(ev: WillAppearEvent<ChangeSettingsSettings>): Promise<void> {
        const normalized = normalizeChangeSettingsSettings(ev.payload.settings);
        if (normalized.didCoerce) {
            await ev.action.setSettings({
                settingKey: normalized.settingKey,
                value: normalized.value,
            });
        }

        return super.onWillAppear(ev);
    }

    override async onKeyDown(ev: KeyDownEvent<ChangeSettingsSettings>): Promise<void> {
        const normalized = normalizeChangeSettingsSettings(ev.payload.settings);
        if (normalized.didCoerce) {
            await ev.action.setSettings({
                settingKey: normalized.settingKey,
                value: normalized.value,
            });
        }

        const validation = validateSettingValue(normalized.settingKey, normalized.value);
        if (!validation.ok) {
            await ev.action.showAlert();
            return;
        }

        const patch: Partial<EffectiveSettings> = {
            [normalized.settingKey]: validation.value,
        };

        try {
            await backendRuntime.updateSettings(patch);
            await ev.action.showOk();
        } catch {
            await ev.action.showAlert();
        }
    }

    protected override async renderKey(action: KeyAction<ChangeSettingsSettings>): Promise<void> {
        const settings = await action.getSettings<ChangeSettingsSettings>();
        const normalized = normalizeChangeSettingsSettings(settings);
        const entry = SETTINGS_CATALOG_BY_KEY[normalized.settingKey];
        const label = entry.label.replace(" On ", " ").replace(" (ms)", " ms");

        await Promise.all([
            action.setImage(renderChangeSettingsKeySvg(!this.getSnapshot().endpointOnline)),
            action.setTitle(label),
        ]);
    }
}

