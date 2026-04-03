import type { EffectiveSettings, MeterMode, SettingKey, SettingValue } from "../types/streamdeck";

type CatalogBase<TKey extends SettingKey, TType extends string, TValue extends SettingValue> = {
    key: TKey;
    label: string;
    type: TType;
    defaultValue: TValue;
};

export type CatalogBooleanEntry<TKey extends SettingKey = SettingKey> = CatalogBase<TKey, "bool", boolean>;

export type CatalogNumberEntry<TKey extends SettingKey = SettingKey> = CatalogBase<TKey, "number", number> & {
    min: number;
    max: number;
    step: number;
};

export type CatalogIntEntry<TKey extends SettingKey = SettingKey> = CatalogBase<TKey, "int", number> & {
    min: number;
    max: number;
    step: number;
};

export type CatalogEnumEntry<TKey extends SettingKey = SettingKey> = CatalogBase<TKey, "enum", string> & {
    options: readonly string[];
};

export type CatalogColorEntry<TKey extends SettingKey = SettingKey> = CatalogBase<TKey, "color", string>;

export type SettingsCatalogEntry =
    | CatalogBooleanEntry
    | CatalogNumberEntry
    | CatalogIntEntry
    | CatalogEnumEntry
    | CatalogColorEntry;

export const METER_MODE_OPTIONS = ["ring_fill", "vu_peak_hold", "peak_indicator"] as const satisfies readonly MeterMode[];

export const DEFAULT_EFFECTIVE_SETTINGS: EffectiveSettings = {
    autoReconnectOnError: true,
    autoConnectOnStartup: false,
    volumeStepSize: 0.02,
    detentCount: 24,
    detentStrength: 0.65,
    snapStrength: 0.4,
    encoderInvert: false,
    ledBrightness: 0.8,
    meterMode: "ring_fill",
    meterColor: "#00D26A",
    meterBrightness: 0.8,
    meterGain: 1.0,
    meterSmoothing: 0.25,
    meterPeakHoldMs: 500,
    meterMuteRedDurationMs: 700,
    lowEndstopEnabled: true,
    lowEndstopPosition: -1.0,
    lowEndstopStrength: 0.7,
    highEndstopEnabled: true,
    highEndstopPosition: 1.0,
    highEndstopStrength: 0.7,
};

export const SETTINGS_CATALOG: readonly SettingsCatalogEntry[] = [
    { key: "autoReconnectOnError", label: "Auto Reconnect On Error", type: "bool", defaultValue: DEFAULT_EFFECTIVE_SETTINGS.autoReconnectOnError },
    { key: "autoConnectOnStartup", label: "Auto Connect On Startup", type: "bool", defaultValue: DEFAULT_EFFECTIVE_SETTINGS.autoConnectOnStartup },
    { key: "volumeStepSize", label: "Volume Step Size", type: "number", min: 0.001, max: 0.2, step: 0.001, defaultValue: DEFAULT_EFFECTIVE_SETTINGS.volumeStepSize },
    { key: "detentCount", label: "Detent Count", type: "int", min: 0, max: 128, step: 1, defaultValue: DEFAULT_EFFECTIVE_SETTINGS.detentCount },
    { key: "detentStrength", label: "Detent Strength", type: "number", min: 0.0, max: 1.0, step: 0.01, defaultValue: DEFAULT_EFFECTIVE_SETTINGS.detentStrength },
    { key: "snapStrength", label: "Snap Strength", type: "number", min: 0.0, max: 1.0, step: 0.01, defaultValue: DEFAULT_EFFECTIVE_SETTINGS.snapStrength },
    { key: "encoderInvert", label: "Encoder Invert", type: "bool", defaultValue: DEFAULT_EFFECTIVE_SETTINGS.encoderInvert },
    { key: "ledBrightness", label: "LED Brightness", type: "number", min: 0.0, max: 1.0, step: 0.01, defaultValue: DEFAULT_EFFECTIVE_SETTINGS.ledBrightness },
    { key: "meterMode", label: "Meter Mode", type: "enum", options: METER_MODE_OPTIONS, defaultValue: DEFAULT_EFFECTIVE_SETTINGS.meterMode },
    { key: "meterColor", label: "Meter Color", type: "color", defaultValue: DEFAULT_EFFECTIVE_SETTINGS.meterColor },
    { key: "meterBrightness", label: "Meter Brightness", type: "number", min: 0.0, max: 1.0, step: 0.01, defaultValue: DEFAULT_EFFECTIVE_SETTINGS.meterBrightness },
    { key: "meterGain", label: "Meter Gain", type: "number", min: 0.1, max: 8.0, step: 0.01, defaultValue: DEFAULT_EFFECTIVE_SETTINGS.meterGain },
    { key: "meterSmoothing", label: "Meter Smoothing", type: "number", min: 0.0, max: 1.0, step: 0.01, defaultValue: DEFAULT_EFFECTIVE_SETTINGS.meterSmoothing },
    { key: "meterPeakHoldMs", label: "Meter Peak Hold (ms)", type: "int", min: 0, max: 3000, step: 1, defaultValue: DEFAULT_EFFECTIVE_SETTINGS.meterPeakHoldMs },
    { key: "meterMuteRedDurationMs", label: "Meter Mute Red Duration (ms)", type: "int", min: 50, max: 3000, step: 1, defaultValue: DEFAULT_EFFECTIVE_SETTINGS.meterMuteRedDurationMs },
    { key: "lowEndstopEnabled", label: "Low Endstop Enabled", type: "bool", defaultValue: DEFAULT_EFFECTIVE_SETTINGS.lowEndstopEnabled },
    { key: "lowEndstopPosition", label: "Low Endstop Position", type: "number", min: -1.0, max: 1.0, step: 0.01, defaultValue: DEFAULT_EFFECTIVE_SETTINGS.lowEndstopPosition },
    { key: "lowEndstopStrength", label: "Low Endstop Strength", type: "number", min: 0.0, max: 1.0, step: 0.01, defaultValue: DEFAULT_EFFECTIVE_SETTINGS.lowEndstopStrength },
    { key: "highEndstopEnabled", label: "High Endstop Enabled", type: "bool", defaultValue: DEFAULT_EFFECTIVE_SETTINGS.highEndstopEnabled },
    { key: "highEndstopPosition", label: "High Endstop Position", type: "number", min: -1.0, max: 1.0, step: 0.01, defaultValue: DEFAULT_EFFECTIVE_SETTINGS.highEndstopPosition },
    { key: "highEndstopStrength", label: "High Endstop Strength", type: "number", min: 0.0, max: 1.0, step: 0.01, defaultValue: DEFAULT_EFFECTIVE_SETTINGS.highEndstopStrength },
];

const settingsCatalogByKey = Object.create(null) as Record<SettingKey, SettingsCatalogEntry>;
for (const entry of SETTINGS_CATALOG) {
    settingsCatalogByKey[entry.key] = entry;
}

export const SETTINGS_CATALOG_BY_KEY = settingsCatalogByKey;
export const SETTINGS_CATALOG_KEYS = SETTINGS_CATALOG.map((entry) => entry.key) as SettingKey[];

