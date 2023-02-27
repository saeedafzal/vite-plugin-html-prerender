import puppeteer, { Browser, PuppeteerLaunchOptions } from "puppeteer";
import path from "path";
import fs from "fs";
import { RenderedRoute } from "./types";

export default class Renderer {

    private readonly _port: number;
    private _browser?: Browser;

    constructor(port: number) {
        this._port = port;
    }

    async init(): Promise<void> {
        const options: PuppeteerLaunchOptions = {
            headless: true,
            args: ["--no-sandbox", "--disable-setuid-sandbox"]
        };

        // Handle use case for Apple Silicon until Puppeteer supports it.
        // Also make sure to have PUPPETEER_EXPERIMENTAL_CHROMIUM_MAC_ARM=true environment variable set.
        // https://dev.to/tnzk/install-puppeteer-on-macbook-pro-with-apple-silicon-m1-3kc
        if (process.arch === "arm64") {
            const dir = process.env.PUPPETEER_EXECUTABLE_PATH;
            console.log("[vite-plugin-html-prerender] Using Chromium instance from:", dir);
            options.executablePath = dir;
        }

        this._browser = await puppeteer.launch(options);
    }

    async destroy(): Promise<void> {
        await this._browser?.close();
    }

    async renderRoute(route: string): Promise<RenderedRoute> {
        if (!this._browser) {
            throw Error("Headless browser instance not started. Failed to prerender.");
        }

        const page = await this._browser.newPage();
        await page.goto(`http://localhost:${ this._port }${ route }`);
        await page.waitForSelector("#root", {timeout: 10000});
        const html = await page.content();

        return {route, html};
    }

    async saveToFile(staticDir: string, renderedRoute: RenderedRoute): Promise<void> {
        const target = path.join(staticDir, renderedRoute.route, "index.html");
        const directory = path.dirname(target);

        if (!fs.existsSync(directory)) {
            fs.mkdirSync(directory, {recursive: true});
        }

        fs.writeFileSync(target, renderedRoute.html);
    }
}
