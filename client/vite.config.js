import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import { visualizer } from "rollup-plugin-visualizer";
import seoPrerender from "vite-plugin-seo-prerender";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// --- Prerender SEO -------------------------------------------------------
// The static <head> in index.html hardcodes a homepage canonical/OG URL, so
// every prerendered route would otherwise declare itself a duplicate of "/".
// This rewrites canonical + social URLs to be self-referential and gives the
// public pages unique <title>/description for indexing.
const PRERENDER_SITE = "https://health-report-analyzer.rajputxv.me";
const PRERENDER_SEO = {
    "/": {
        title: "Health Report Analyzer - AI-Powered Medical Report Analysis",
        description:
            "Upload your lab reports (PDF/image) and get your health data automatically extracted into organized tables with AI-powered trend analysis. Track your health journey with ease.",
    },
    "/pricing": {
        title: "Pricing - Health Report Analyzer",
        description:
            "Compare Health Report Analyzer plans: start free with 3 reports per month, or upgrade to Pro for 10 reports a month, or unlimited on the yearly plan.",
    },
    "/contact": {
        title: "Contact Us - Health Report Analyzer",
        description:
            "Questions, feedback, or support for Health Report Analyzer? Get in touch with our team.",
    },
};

function applyPrerenderSeo(html, route) {
    const path = route === "/" ? "/" : route.replace(/\/+$/, "");
    const url = PRERENDER_SITE + path;
    // Chatbase and Vercel Analytics inject these at runtime; baked in, the Chatbase script becomes parser-blocking.
    html = html
        .replace(/<script[^>]*src="https:\/\/www\.chatbase\.co\/embed\.min\.js"[\s\S]*(?=<\/body>)/i, "")
        .replace(/<link rel="preconnect" href="https:\/\/www\.chatbase\.co"[^>]*>/gi, "")
        .replace(/<style id="cb-[^"]*">[\s\S]*?<\/style>/gi, "")
        .replace(/<script[^>]*src="\/_vercel\/insights\/script\.js"[^>]*><\/script>/gi, "")
        .replace(/(<link rel="canonical" href=")[^"]*(")/i, `$1${url}$2`)
        .replace(/(<meta property="og:url" content=")[^"]*(")/i, `$1${url}$2`)
        .replace(/(<meta name="twitter:url" content=")[^"]*(")/i, `$1${url}$2`);

    const meta = PRERENDER_SEO[path];
    if (meta) {
        const esc = (s) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
        const t = esc(meta.title);
        const d = esc(meta.description);
        html = html
            .replace(/<title>[^<]*<\/title>/i, `<title>${t}</title>`)
            .replace(
                /(<meta name="description" content=")[^"]*(")/i,
                `$1${d}$2`,
            )
            .replace(
                /(<meta property="og:title" content=")[^"]*(")/i,
                `$1${t}$2`,
            )
            .replace(
                /(<meta property="og:description" content=")[^"]*(")/i,
                `$1${d}$2`,
            )
            .replace(
                /(<meta name="twitter:title" content=")[^"]*(")/i,
                `$1${t}$2`,
            )
            .replace(
                /(<meta name="twitter:description" content=")[^"]*(")/i,
                `$1${d}$2`,
            );
    }
    return html;
}

function serveBlogStaticInDev() {
    const publicDir = path.resolve(
        path.dirname(fileURLToPath(import.meta.url)),
        "public",
    );
    return {
        name: "serve-blog-static-dev",
        apply: "serve",
        configureServer(server) {
            server.middlewares.use((req, res, next) => {
                const pathname = (req.url || "").split("?")[0];
                if (!pathname.startsWith("/blog")) return next();
                if (path.extname(pathname)) return next(); // real asset → let Vite serve it
                const rel = pathname.replace(/\/+$/, "").replace(/^\/+/, "");
                const candidates = [
                    path.join(publicDir, rel, "index.html"),
                    path.join(publicDir, `${rel}.html`),
                ];
                const file = candidates.find((f) => fs.existsSync(f));
                if (!file) return next();
                res.statusCode = 200;
                res.setHeader("Content-Type", "text/html; charset=utf-8");
                res.end(fs.readFileSync(file));
            });
        },
    };
}

function inlineBlogCss() {
    const link = '<link rel="stylesheet" href="/blog/assets/site-header.css">';
    return {
        name: "inline-blog-css",
        apply: "build",
        writeBundle({ dir }) {
            const blogDir = path.join(dir, "blog");
            const css = fs
                .readFileSync(path.join(blogDir, "assets/site-header.css"), "utf8")
                .replace(/\/\*[\s\S]*?\*\//g, "");
            for (const name of fs.readdirSync(blogDir)) {
                if (!name.endsWith(".html")) continue;
                const file = path.join(blogDir, name);
                const html = fs.readFileSync(file, "utf8");
                fs.writeFileSync(file, html.replace(link, () => `<style>${css}</style>`));
            }
        },
    };
}

// On Vercel's build container the system libraries Chrome needs (libnspr4, …)
// aren't present, so puppeteer's bundled Chromium can't launch. There we point
// Puppeteer at @sparticuz/chromium (a serverless Chromium build that carries its
// own libs, pinned to the same Chrome major puppeteer expects). Locally we use
// puppeteer's own Chrome unchanged.
let prerenderPuppeteer = {
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
};
const shouldPrerender =
    process.env.VERCEL === "1" || process.env.ENABLE_SEO_PRERENDER === "true";

if (process.env.VERCEL === "1") {
    const chromium = (await import("@sparticuz/chromium")).default;
    prerenderPuppeteer = {
        args: chromium.args,
        executablePath: await chromium.executablePath(),
        headless: chromium.headless,
    };
}

export default defineConfig({
    plugins: [
        serveBlogStaticInDev(),
        inlineBlogCss(),
        react(),
        VitePWA({
    registerType: "autoUpdate",
    injectRegister: "auto",

    workbox: {
        clientsClaim: true,
        skipWaiting: true,

        navigateFallbackDenylist: [
            /^\/blog/,
            /^\/robots\.txt$/,
            /^\/sitemap\.xml$/,
            /^\/llms\.txt$/,
            /^\/\.well-known\//,
            /^\/404/,
            /^\/preview\.png$/,
            /^\/favicon\.ico$/,
            /^\/Health Report Analyzer Logo\.png$/,
            /^\/manifest\.webmanifest$/
        ],

        globIgnores: ["**/blog/**", "404.html"]
    },

    manifest: {
        name: "Health Report Analyzer",
        short_name: "Health Analyzer",
        description: "Understand your medical reports with clear, AI-powered health insights.",
        theme_color: "#667eea",
        background_color: "#667eea",
        start_url: "/",
        scope: "/",
        display: "standalone",
        lang: "en",
        categories: ["health", "medical", "productivity"],
        icons: [
            {
                src: "hra-192x192.png",
                sizes: "192x192",
                type: "image/png"
            },
            {
                src: "hra-512x512.png",
                sizes: "512x512",
                type: "image/png"
            },
            {
                src: "hra-512x512.png",
                sizes: "512x512",
                type: "image/png",
                purpose: "any maskable"
            }
        ]
    }
}),
        ...(process.env.ANALYZE === "true"
            ? [visualizer({ filename: "stats.html", open: false })]
            : []),
        // Build-time prerender of the public marketing pages so crawlers
        // (incl. non-JS/AI crawlers) get real HTML instead of an empty #root.
        // Runs in real Chromium via Puppeteer, so the app's browser-only code
        // (navigator/window/localStorage, i18n, AOS) executes normally.
        // `delay` waits for App.jsx's loading gate to open before snapshotting
        // (waitForSelector('body') alone fires instantly and would bake the spinner).
        ...(shouldPrerender
            ? [
                  seoPrerender({
                      routes: ["/", "/pricing", "/contact"],
                      delay: 3000,
                      removeStyle: false, // keep our inline <style> (chatbase positioning)
                      puppeteer: prerenderPuppeteer,
                      // rewrite canonical/OG + per-page title & description
                      callback: applyPrerenderSeo,
                  }),
              ]
            : []),
    ],
    server: {
        port: 3000,
        proxy: {
            "/api": {
                target: "http://localhost:5001",
                changeOrigin: true,
                secure: false,
            },
        },
    },
    build: {
        outDir: "dist",
        assetsDir: "assets",
    },
});
