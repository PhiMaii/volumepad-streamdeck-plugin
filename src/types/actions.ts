import type { JsonObject } from "@elgato/streamdeck";

import type { SettingKey, SettingValue } from "./streamdeck";

export type ChangeVolumeDirection = "Increase" | "Decrease";

export interface ChangeVolumeSettings extends JsonObject {
    direction?: ChangeVolumeDirection;
    step?: number;
}

export interface ConnectionStatusSettings extends JsonObject {
    connectedColor?: string;
    connectingColor?: string;
    reconnectingColor?: string;
    disconnectedColor?: string;
    errorColor?: string;
}

export interface ChangeSettingsSettings extends JsonObject {
    settingKey?: SettingKey;
    value?: SettingValue;
}
