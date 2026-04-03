import streamDeck from "@elgato/streamdeck";

import { SETTINGS_CATALOG, SETTINGS_CATALOG_BY_KEY, type SettingsCatalogEntry } from "../settings/catalog";
import { coerceSettingValue, isHexColor, normalizeChangeSettingsSettings, normalizeHexColor } from "../settings/validation";
import type { ChangeSettingsSettings } from "../types/actions";
import type { SettingKey, SettingValue } from "../types/streamdeck";

function requireElement<TElement extends Element>(selector: string): TElement {
    const element = document.querySelector<TElement>(selector);
    if (element === null) {
        throw new Error(`Missing required UI element: ${selector}`);
    }

    return element;
}

const settingKeyField = requireElement<HTMLSelectElement>("#setting-key");
const helperText = requireElement<HTMLElement>("#helper-text");

const boolRow = requireElement<HTMLElement>("#bool-row");
const boolValueField = requireElement<HTMLInputElement>("#bool-value");

const numberRow = requireElement<HTMLElement>("#number-row");
const numberValueField = requireElement<HTMLInputElement>("#number-value");
const numberRangeField = requireElement<HTMLElement>("#number-range");

const enumRow = requireElement<HTMLElement>("#enum-row");
const enumValueField = requireElement<HTMLSelectElement>("#enum-value");

const colorRow = requireElement<HTMLElement>("#color-row");
const colorValueField = requireElement<HTMLInputElement>("#color-value");
const colorHexField = requireElement<HTMLInputElement>("#color-hex");

function setHelperText(message: string): void {
    helperText.textContent = message;
}

function hideAllValueRows(): void {
    boolRow.hidden = true;
    numberRow.hidden = true;
    enumRow.hidden = true;
    colorRow.hidden = true;
}

function populateSettingSelect(): void {
    settingKeyField.innerHTML = "";
    for (const entry of SETTINGS_CATALOG) {
        const option = document.createElement("option");
        option.value = entry.key;
        option.textContent = entry.label;
        settingKeyField.append(option);
    }
}

function renderValueControls(entry: SettingsCatalogEntry, value: SettingValue): void {
    hideAllValueRows();

    switch (entry.type) {
        case "bool": {
            boolRow.hidden = false;
            boolValueField.checked = value === true;
            break;
        }
        case "number":
        case "int": {
            numberRow.hidden = false;
            numberValueField.min = String(entry.min);
            numberValueField.max = String(entry.max);
            numberValueField.step = String(entry.step);
            numberValueField.value = String(value);
            numberRangeField.textContent = `Allowed range: ${entry.min}..${entry.max}`;
            break;
        }
        case "enum": {
            enumRow.hidden = false;
            enumValueField.innerHTML = "";
            for (const optionValue of entry.options) {
                const option = document.createElement("option");
                option.value = optionValue;
                option.textContent = optionValue;
                enumValueField.append(option);
            }
            enumValueField.value = typeof value === "string" ? value : entry.defaultValue;
            break;
        }
        case "color": {
            colorRow.hidden = false;
            const resolvedColor = typeof value === "string" ? normalizeHexColor(value) : entry.defaultValue;
            colorValueField.value = resolvedColor;
            colorHexField.value = resolvedColor;
            break;
        }
        default: {
            break;
        }
    }
}

function toNormalizedSettings(rawSettings: ChangeSettingsSettings): Required<ChangeSettingsSettings> {
    const normalized = normalizeChangeSettingsSettings(rawSettings);
    return {
        settingKey: normalized.settingKey,
        value: normalized.value,
    };
}

function readValueFromVisibleControl(settingKey: SettingKey): SettingValue {
    const entry = SETTINGS_CATALOG_BY_KEY[settingKey];

    switch (entry.type) {
        case "bool":
            return boolValueField.checked;
        case "number":
            return coerceSettingValue(entry, Number.parseFloat(numberValueField.value));
        case "int":
            return coerceSettingValue(entry, Number.parseFloat(numberValueField.value));
        case "enum":
            return coerceSettingValue(entry, enumValueField.value);
        case "color": {
            const candidate = normalizeHexColor(colorHexField.value);
            return isHexColor(candidate) ? candidate : coerceSettingValue(entry, colorValueField.value);
        }
    }

    throw new Error("Unsupported setting catalog entry type.");
}

function applyToUi(settings: Required<ChangeSettingsSettings>): void {
    settingKeyField.value = settings.settingKey;
    const entry = SETTINGS_CATALOG_BY_KEY[settings.settingKey];
    const coercedValue = coerceSettingValue(entry, settings.value);
    renderValueControls(entry, coercedValue);
}

async function persist(rawSettings: ChangeSettingsSettings): Promise<void> {
    const normalized = toNormalizedSettings(rawSettings);
    applyToUi(normalized);
    await streamDeck.settings.setSettings(normalized);
    setHelperText("Setting action saved.");
}

async function loadInitialSettings(): Promise<void> {
    const existing = await streamDeck.settings.getSettings<ChangeSettingsSettings>();
    const normalized = toNormalizedSettings(existing);
    applyToUi(normalized);

    if (existing.settingKey !== normalized.settingKey || existing.value !== normalized.value) {
        await streamDeck.settings.setSettings(normalized);
    }
}

populateSettingSelect();

streamDeck.onConnected(() => {
    void loadInitialSettings();
});

streamDeck.settings.onDidReceiveSettings((ev) => {
    applyToUi(toNormalizedSettings(ev.payload.settings as ChangeSettingsSettings));
});

settingKeyField.addEventListener("change", () => {
    const settingKey = settingKeyField.value as SettingKey;
    const entry = SETTINGS_CATALOG_BY_KEY[settingKey];
    const normalizedValue = coerceSettingValue(entry, entry.defaultValue);

    void persist({ settingKey, value: normalizedValue });
});

boolValueField.addEventListener("change", () => {
    const settingKey = settingKeyField.value as SettingKey;
    void persist({
        settingKey,
        value: readValueFromVisibleControl(settingKey),
    });
});

numberValueField.addEventListener("change", () => {
    const settingKey = settingKeyField.value as SettingKey;
    void persist({
        settingKey,
        value: readValueFromVisibleControl(settingKey),
    });
});

enumValueField.addEventListener("change", () => {
    const settingKey = settingKeyField.value as SettingKey;
    void persist({
        settingKey,
        value: readValueFromVisibleControl(settingKey),
    });
});

colorValueField.addEventListener("input", () => {
    colorHexField.value = normalizeHexColor(colorValueField.value);
});

colorHexField.addEventListener("change", () => {
    const normalized = normalizeHexColor(colorHexField.value);
    if (!isHexColor(normalized)) {
        setHelperText("Color must be in #RRGGBB format.");
        return;
    }

    colorValueField.value = normalized;
    const settingKey = settingKeyField.value as SettingKey;
    void persist({
        settingKey,
        value: normalized,
    });
});
