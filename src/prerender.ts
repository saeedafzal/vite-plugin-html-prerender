import type { Plugin } from "vite";
import { HtmlPrerenderOptions, RenderedRoutes } from "./types";
import { minify } from "html-minifier";
import path from "path";
import fs from "fs";

const Prerenderer = require("@prerenderer/prerenderer");
const PuppeteerRenderer = require("@prerenderer/renderer-puppeteer");

function htmlPrerender(options: HtmlPrerenderOptions): Plugin {
    return {
        name: "vite-plugin-html-prerender",
        apply: "build",
        enforce: "post",
        async closeBundle() {
            await emitRendered(options);
        }
    };
}

function emitRendered(options: HtmlPrerenderOptions) {
    const prerenderer = new Prerenderer({
        ...options,
        renderer: new PuppeteerRenderer()
    });

    prerenderer.initialize().then(() => {
        console.log(`[vite-plugin-html-prerender] Pre-rendering routes (${options.routes})...`);
        return prerenderer.renderRoutes(options.routes);
    }).then((renderedRoutes: RenderedRoutes) => {
        // NOTE: Minify html files
        console.log("[vite-plugin-html-prerender] All routes rendered successfully.");

        if (!options.minify) {
            return renderedRoutes;
        }

        console.log("[vite-plugin-html-prerender] Minifying rendered html files...");

        renderedRoutes.forEach(route => {
            route.html = minify(route.html, options.minify);
        });

        return renderedRoutes;
    }).then((renderedRoutes: RenderedRoutes) => {
        // NOTE: Set the output paths
        return renderedRoutes.map(route => {
            route.output = path.join(options.staticDir, route.route, "index.html");
            return route;
        });
    }).then((renderedRoutes: RenderedRoutes) => {
        // NOTE: Write files to output directory
        renderedRoutes.forEach(route => {
            fs.mkdir(path.dirname(route.output), { recursive: true }, () => {
                console.log(`Appending file [${route.route}]`);
                fs.writeFile(route.output, route.html, error => {
                    if (error) {
                        throw error;
                    }
                });
            });
        });
    }).then(() => {
        prerenderer.destroy();
        console.log("[vite-plugin-html-prerender] Completed.");
    }).catch((err: Error) => {
        prerenderer.destroy();
        console.error("[vite-plugin-html-prerender] Failed to prerender routes: ", err);
    });
}

export default htmlPrerender;
