import { Options } from "html-minifier";

export interface HtmlPrerenderOptions {

    /**
     * The output path of `vite build`.
     */
    staticDir: string;

    /**
     * Routes to render.
     */
    routes: Array<string>;

    /**
     * Minify the html output.
     * Optional.
     */
    minify?: Options;
}

export type RenderedRoute = {
    route: string;
    html: string;
};
