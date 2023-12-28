import type { Plugin } from "vite";
import { HtmlPrerenderOptions, RenderedRoute } from "./types";
import Server from "./server";
import Renderer from "./renderer";
import { minify } from "html-minifier";

const port = 0;
const defaultSelector = "#root";

const htmlPrerender = (options: HtmlPrerenderOptions): Plugin => {
    return {
        name: "vite-plugin-html-prerender",
        apply: "build",
        enforce: "post",
        async closeBundle() {
            await emitRendered(options);
        }
    };
};

const emitRendered = async (options: HtmlPrerenderOptions): Promise<void> => {
    const server = new Server(port);
    const renderer = new Renderer();

    await server.init(options.staticDir).then(async () => {
        console.log("\n[vite-plugin-html-prerender] Starting headless browser...");
        return await renderer.init();
    }).then(async () => {
        const renderedRoutes: RenderedRoute[] = [];
        for (let route of options.routes) {
            console.log("[vite-plugin-html-prerender] Pre-rendering route:", route);
            renderedRoutes.push(await renderer.renderRoute(route, server.runningPort, options.selector || defaultSelector));
        }
        return renderedRoutes;
    }).then(renderedRoutes => {
        if (options.minify) {
            console.log("[vite-plugin-html-prerender] Minifying rendered HTML...");
            renderedRoutes.forEach(route => {
                route.html = minify(route.html, options.minify);
            });
        }
        return renderedRoutes;
    }).then(async renderedRoutes => {
        console.log("[vite-plugin-html-prerender] Saving pre-rendered routes to output...");
        for (let renderedRoute of renderedRoutes) {
            await renderer.saveToFile(options.staticDir, renderedRoute);
        }
    }).then(async () => {
        await renderer.destroy();
        await server.destroy();
        console.log("[vite-plugin-html-prerender] Pre-rendering routes completed.");
    }).catch(async e => {
        await renderer.destroy();
        await server.destroy();
        console.error("[vite-plugin-html-prerender] Failed to prerender routes:", e);
    });
};

export default htmlPrerender;
