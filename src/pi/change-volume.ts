import streamDeck from "@elgato/streamdeck";

import { DEFAULT_EFFECTIVE_SETTINGS } from "../settings/catalog";
import { normalizeChangeVolumeSettings } from "../settings/validation";
import type { ChangeVolumeSettings } from "../types/actions";

function requireElement<TElement extends Element>(selector: string): TElement {
    const element = document.querySelector<TElement>(selector);
    if (element === null) {
        throw new Error(`Missing required UI element: ${selector}`);
    }

    return element;
}

const directionField = requireElement<HTMLSelectElement>("#direction");
const stepField = requireElement<HTMLInputElement>("#step");
const helperText = requireElement<HTMLElement>("#helper-text");

function settingsEqual(a: ChangeVolumeSettings, b: ChangeVolumeSettings): boolean {
    return a.direction === b.direction && a.step === b.step;
}

function setHelperText(message: string): void {
    helperText.textContent = message;
}

function toPersistedSettings(input: ChangeVolumeSettings): ChangeVolumeSettings {
    const normalized = normalizeChangeVolumeSettings(input, DEFAULT_EFFECTIVE_SETTINGS.volumeStepSize);
    return {
        direction: normalized.direction,
        step: normalized.step,
    };
}

function applyToUi(settings: ChangeVolumeSettings): void {
    directionField.value = settings.direction ?? "Increase";
    const step = settings.step ?? DEFAULT_EFFECTIVE_SETTINGS.volumeStepSize;
    stepField.value = step.toFixed(3);
}

async function persistSettings(rawSettings: ChangeVolumeSettings): Promise<void> {
    const normalizedSettings = toPersistedSettings(rawSettings);
    applyToUi(normalizedSettings);
    await streamDeck.settings.setSettings(normalizedSettings);
    setHelperText("Step range is clamped to 0.001..0.20.");
}

async function loadInitialSettings(): Promise<void> {
    const existingSettings = await streamDeck.settings.getSettings<ChangeVolumeSettings>();
    const normalizedSettings = toPersistedSettings(existingSettings);
    applyToUi(normalizedSettings);

    if (!settingsEqual(existingSettings, normalizedSettings)) {
        await streamDeck.settings.setSettings(normalizedSettings);
    }
}

streamDeck.onConnected(() => {
    void loadInitialSettings();
});

streamDeck.settings.onDidReceiveSettings((ev) => {
    const normalizedSettings = toPersistedSettings(ev.payload.settings as ChangeVolumeSettings);
    applyToUi(normalizedSettings);
});

directionField.addEventListener("change", () => {
    const nextSettings: ChangeVolumeSettings = {
        direction: directionField.value === "Decrease" ? "Decrease" : "Increase",
        step: Number.parseFloat(stepField.value),
    };

    void persistSettings(nextSettings);
});

stepField.addEventListener("change", () => {
    const nextSettings: ChangeVolumeSettings = {
        direction: directionField.value === "Decrease" ? "Decrease" : "Increase",
        step: Number.parseFloat(stepField.value),
    };

    void persistSettings(nextSettings);
});
