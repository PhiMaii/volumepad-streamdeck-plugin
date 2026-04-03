import commonjs from "@rollup/plugin-commonjs";
import nodeResolve from "@rollup/plugin-node-resolve";
import terser from "@rollup/plugin-terser";
import typescript from "@rollup/plugin-typescript";
import path from "node:path";
import url from "node:url";

const isWatching = !!process.env.ROLLUP_WATCH;
const sdPlugin = "net.phimai.volumepad.streamdeck-remote.sdPlugin";
const sourcemapPathTransform = (relativeSourcePath, sourcemapPath) => {
	return url.pathToFileURL(path.resolve(path.dirname(sourcemapPath), relativeSourcePath)).href;
};

function createTypescriptPlugin(browser) {
	return typescript({
		mapRoot: isWatching ? "./" : undefined,
		include: browser ? ["src/pi/**/*.ts", "src/settings/**/*.ts", "src/types/**/*.ts"] : ["src/**/*.ts"],
		exclude: browser ? undefined : ["src/pi/**/*.ts"],
		compilerOptions: browser
			? {
				customConditions: ["browser"],
				lib: ["ES2023", "DOM"],
			}
			: {
				customConditions: ["node"],
			},
	});
}

function createNodeResolvePlugin(browser) {
	return nodeResolve({
		browser,
		exportConditions: browser ? ["browser"] : ["node"],
		preferBuiltins: !browser
	});
}

function createCommonPlugins(browser) {
	return [
		createTypescriptPlugin(browser),
		createNodeResolvePlugin(browser),
		commonjs(),
		!isWatching && terser(),
	].filter(Boolean);
}

/**
 * @type {import('rollup').RollupOptions}
 */
const pluginConfig = {
	input: "src/plugin.ts",
	output: {
		file: `${sdPlugin}/bin/plugin.js`,
		sourcemap: isWatching,
		sourcemapPathTransform,
	},
	plugins: [
		{
			name: "watch-externals",
			buildStart: function () {
				this.addWatchFile(`${sdPlugin}/manifest.json`);
			},
		},
		...createCommonPlugins(false),
		{
			name: "emit-module-package-file",
			generateBundle() {
				this.emitFile({ fileName: "package.json", source: `{ "type": "module" }`, type: "asset" });
			}
		}
	]
};

/**
 * @type {import('rollup').RollupOptions}
 */
const propertyInspectorConfig = {
	input: {
		"change-volume": "src/pi/change-volume.ts",
		"connection-status": "src/pi/connection-status.ts",
		"change-settings": "src/pi/change-settings.ts",
	},
	output: {
		dir: `${sdPlugin}/ui/js`,
		format: "esm",
		entryFileNames: "[name].js",
		sourcemap: isWatching,
		sourcemapPathTransform,
	},
	plugins: [
		{
			name: "watch-property-inspectors",
			buildStart: function () {
				this.addWatchFile(`${sdPlugin}/ui/change-volume.html`);
				this.addWatchFile(`${sdPlugin}/ui/connection-status.html`);
				this.addWatchFile(`${sdPlugin}/ui/change-settings.html`);
			},
		},
		...createCommonPlugins(true),
	],
};

export default [pluginConfig, propertyInspectorConfig];
