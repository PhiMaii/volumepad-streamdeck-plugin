import { DEFAULT_EFFECTIVE_SETTINGS, SETTINGS_CATALOG, SETTINGS_CATALOG_BY_KEY, SETTINGS_CATALOG_KEYS, type SettingsCatalogEntry } from "./catalog";
import type { ChangeSettingsSettings, ChangeVolumeDirection, ChangeVolumeSettings } from "../types/actions";
import type { EffectiveSettings, SettingKey, SettingValue } from "../types/streamdeck";

const HEX_COLOR_REGEX = /^#[0-9A-Fa-f]{6}$/;

type ValidationSuccess<T> = {
    ok: true;
    value: T;
};

type ValidationFailure = {
    ok: false;
    error: string;
};

export type ValidationResult<T> = ValidationSuccess<T> | ValidationFailure;

export function clampNumber(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value));
}

export function isHexColor(value: string): boolean {
    return HEX_COLOR_REGEX.test(value);
}

export function normalizeHexColor(value: string): string {
    return value.trim().toUpperCase();
}

export function isSettingKey(value: string): value is SettingKey {
    return SETTINGS_CATALOG_KEYS.includes(value as SettingKey);
}

function toFiniteNumber(value: unknown): number | null {
    if (typeof value === "number" && Number.isFinite(value)) {
        return value;
    }

    if (typeof value === "string") {
        const parsed = Number.parseFloat(value.trim());
        return Number.isFinite(parsed) ? parsed : null;
    }

    return null;
}

function toBoolean(value: unknown): boolean | null {
    if (typeof value === "boolean") {
        return value;
    }

    if (typeof value === "string") {
        const normalized = value.trim().toLowerCase();
        if (normalized === "true") {
            return true;
        }

        if (normalized === "false") {
            return false;
        }
    }

    return null;
}

export function coerceSettingValue(entry: SettingsCatalogEntry, rawValue: unknown): SettingValue {
    switch (entry.type) {
        case "bool": {
            return toBoolean(rawValue) ?? entry.defaultValue;
        }
        case "number": {
            const numericValue = toFiniteNumber(rawValue);
            if (numericValue === null) {
                return entry.defaultValue;
            }

            return clampNumber(numericValue, entry.min, entry.max);
        }
        case "int": {
            const numericValue = toFiniteNumber(rawValue);
            if (numericValue === null) {
                return entry.defaultValue;
            }

            return Math.round(clampNumber(numericValue, entry.min, entry.max));
        }
        case "enum": {
            if (typeof rawValue === "string" && entry.options.includes(rawValue)) {
                return rawValue;
            }

            return entry.defaultValue;
        }
        case "color": {
            if (typeof rawValue === "string") {
                const normalized = normalizeHexColor(rawValue);
                if (isHexColor(normalized)) {
                    return normalized;
                }
            }

            return entry.defaultValue;
        }
    }

    throw new Error("Unsupported settings catalog entry.");
}

export function validateSettingValue(settingKey: SettingKey, value: unknown): ValidationResult<SettingValue> {
    const entry = SETTINGS_CATALOG_BY_KEY[settingKey];

    switch (entry.type) {
        case "bool": {
            if (typeof value !== "boolean") {
                return { ok: false, error: `${settingKey} must be a boolean.` };
            }

            return { ok: true, value };
        }
        case "number": {
            if (typeof value !== "number" || !Number.isFinite(value)) {
                return { ok: false, error: `${settingKey} must be a number.` };
            }

            if (value < entry.min || value > entry.max) {
                return { ok: false, error: `${settingKey} must be in range ${entry.min}..${entry.max}.` };
            }

            return { ok: true, value };
        }
        case "int": {
            if (typeof value !== "number" || !Number.isFinite(value) || !Number.isInteger(value)) {
                return { ok: false, error: `${settingKey} must be an integer.` };
            }

            if (value < entry.min || value > entry.max) {
                return { ok: false, error: `${settingKey} must be in range ${entry.min}..${entry.max}.` };
            }

            return { ok: true, value };
        }
        case "enum": {
            if (typeof value !== "string" || !entry.options.includes(value)) {
                return { ok: false, error: `${settingKey} must be one of ${entry.options.join(", ")}.` };
            }

            return { ok: true, value };
        }
        case "color": {
            if (typeof value !== "string" || !isHexColor(value)) {
                return { ok: false, error: `${settingKey} must be a color in #RRGGBB format.` };
            }

            return { ok: true, value: normalizeHexColor(value) };
        }
        default: {
            return { ok: false, error: `Unsupported setting key "${settingKey}".` };
        }
    }
}

export function coerceEffectiveSettings(rawValue: unknown, baseSettings: EffectiveSettings): EffectiveSettings {
    if (typeof rawValue !== "object" || rawValue === null) {
        return { ...baseSettings };
    }

    const source = rawValue as Record<string, unknown>;
    const nextSettings: EffectiveSettings = { ...baseSettings };

    for (const entry of SETTINGS_CATALOG) {
        if (!(entry.key in source)) {
            continue;
        }

        nextSettings[entry.key] = coerceSettingValue(entry, source[entry.key]) as never;
    }

    return nextSettings;
}

export function normalizeChangeVolumeDirection(value: unknown): ChangeVolumeDirection {
    return value === "Decrease" ? "Decrease" : "Increase";
}

export function normalizeChangeVolumeStep(value: unknown, fallbackStep: number = DEFAULT_EFFECTIVE_SETTINGS.volumeStepSize): number {
    const numericValue = toFiniteNumber(value) ?? fallbackStep;
    const clampedValue = clampNumber(numericValue, 0.001, 0.2);
    return Number(clampedValue.toFixed(3));
}

export function normalizeChangeVolumeSettings(settings: ChangeVolumeSettings | undefined, fallbackStep: number = DEFAULT_EFFECTIVE_SETTINGS.volumeStepSize): Required<ChangeVolumeSettings> & { didCoerce: boolean } {
    const normalizedDirection = normalizeChangeVolumeDirection(settings?.direction);
    const normalizedStep = normalizeChangeVolumeStep(settings?.step, fallbackStep);

    const originalStep = typeof settings?.step === "number" ? settings.step : null;
    const stepWasInvalid = originalStep === null || !Number.isFinite(originalStep) || originalStep < 0.001 || originalStep > 0.2;
    const directionWasInvalid = settings?.direction !== "Increase" && settings?.direction !== "Decrease";

    return {
        direction: normalizedDirection,
        step: normalizedStep,
        didCoerce: directionWasInvalid || stepWasInvalid,
    };
}

export function normalizeChangeSettingsSettings(settings: ChangeSettingsSettings | undefined): Required<ChangeSettingsSettings> & { didCoerce: boolean } {
    const fallbackKey = SETTINGS_CATALOG[0].key;
    const providedKey = typeof settings?.settingKey === "string" && isSettingKey(settings.settingKey) ? settings.settingKey : fallbackKey;
    const catalogEntry = SETTINGS_CATALOG_BY_KEY[providedKey];
    const normalizedValue = coerceSettingValue(catalogEntry, settings?.value);

    const didCoerce = providedKey !== settings?.settingKey || normalizedValue !== settings?.value;
    return {
        settingKey: providedKey,
        value: normalizedValue,
        didCoerce,
    };
}
