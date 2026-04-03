import type { ChangeVolumeDirection } from "../types/actions";

const CANVAS_SIZE = 144;
const CANVAS_CENTER = CANVAS_SIZE / 2;

function toDataUri(svg: string): string {
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function withBase(content: string, backgroundColor: string): string {
    return toDataUri(
        `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${CANVAS_SIZE} ${CANVAS_SIZE}"><rect x="0" y="0" width="${CANVAS_SIZE}" height="${CANVAS_SIZE}" rx="20" fill="${backgroundColor}" />${content}</svg>`,
    );
}

function offlineOverlay(): string {
    return `<rect x="0" y="0" width="${CANVAS_SIZE}" height="${CANVAS_SIZE}" rx="20" fill="#000000" opacity="0.42" />`;
}

export function renderVolumeKeySvg(muted: boolean, offline: boolean): string {
    const iconColor = muted ? "#F87171" : "#F8FAFC";
    const waveColor = muted ? "#F87171" : "#86EFAC";

    const speaker = `
        <polygon points="34,60 54,60 74,44 74,100 54,84 34,84" fill="${iconColor}" />
        <rect x="28" y="62" width="10" height="20" rx="2" fill="${iconColor}" />
    `;

    const soundWaves = muted
        ? `<line x1="82" y1="52" x2="112" y2="92" stroke="${waveColor}" stroke-width="9" stroke-linecap="round" />`
        : `
            <path d="M88 58 A20 20 0 0 1 88 86" fill="none" stroke="${waveColor}" stroke-width="8" stroke-linecap="round"/>
            <path d="M101 48 A32 32 0 0 1 101 96" fill="none" stroke="${waveColor}" stroke-width="7" stroke-linecap="round"/>
        `;

    return withBase(`${speaker}${soundWaves}${offline ? offlineOverlay() : ""}`, "#111827");
}

export function renderChangeVolumeKeySvg(direction: ChangeVolumeDirection, offline: boolean): string {
    const arrowPoints = direction === "Increase"
        ? "72,36 42,72 58,72 58,106 86,106 86,72 102,72"
        : "72,108 42,72 58,72 58,38 86,38 86,72 102,72";

    const symbol = direction === "Increase"
        ? `<line x1="108" y1="48" x2="108" y2="66" stroke="#F8FAFC" stroke-width="8" stroke-linecap="round"/><line x1="99" y1="57" x2="117" y2="57" stroke="#F8FAFC" stroke-width="8" stroke-linecap="round"/>`
        : `<line x1="98" y1="57" x2="118" y2="57" stroke="#F8FAFC" stroke-width="8" stroke-linecap="round"/>`;

    const icon = `
        <polygon points="${arrowPoints}" fill="#60A5FA" />
        ${symbol}
    `;

    return withBase(`${icon}${offline ? offlineOverlay() : ""}`, "#0F172A");
}

export function renderConnectionStatusKeySvg(color: string, offline: boolean): string {
    const icon = `
        <rect x="43" y="38" width="58" height="44" rx="9" fill="#FFFFFF" opacity="0.20" />
        <path d="M49 88 C63 104, 81 104, 95 88" stroke="#FFFFFF" stroke-width="8" fill="none" stroke-linecap="round" />
        <circle cx="${CANVAS_CENTER}" cy="74" r="6" fill="#FFFFFF" />
    `;

    return withBase(`${icon}${offline ? offlineOverlay() : ""}`, color);
}

export function renderChangeSettingsKeySvg(offline: boolean): string {
    const spokes = Array.from({ length: 8 }, (_, index) => {
        const angle = index * 45;
        return `<rect x="68" y="22" width="8" height="18" rx="3" fill="#93C5FD" transform="rotate(${angle} ${CANVAS_CENTER} ${CANVAS_CENTER})" />`;
    }).join("");

    const icon = `
        ${spokes}
        <circle cx="${CANVAS_CENTER}" cy="${CANVAS_CENTER}" r="30" fill="#1D4ED8" />
        <circle cx="${CANVAS_CENTER}" cy="${CANVAS_CENTER}" r="15" fill="#BFDBFE" />
    `;

    return withBase(`${icon}${offline ? offlineOverlay() : ""}`, "#0B1220");
}

