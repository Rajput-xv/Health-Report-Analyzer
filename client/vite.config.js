import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import { visualizer } from "rollup-plugin-visualizer";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

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

export default defineConfig({
    plugins: [
        serveBlogStaticInDev(),
        react(),
        VitePWA({
            registerType: "autoUpdate", // Automatically updates the service worker

            // Add the manifest configuration
            manifest: {
                name: "Health Report Analyzer",
                short_name: "HealthAnalyzer",
                description: "Upload and analyze your health reports.",
                theme_color: "#ffffff",
                background_color: "#ffffff",
                start_url: "/",
                scope: "/",
                display: "standalone",
                icons: [
                    {
                        src: "hra-192x192.png", // Path relative to 'public' folder
                        sizes: "192x192",
                        type: "image/png",
                    },
                    {
                        src: "hra-512x512.png", // Path relative to 'public' folder
                        sizes: "512x512",
                        type: "image/png",
                    },
                    {
                        src: "hra-512x512.png",
                        sizes: "512x512",
                        type: "image/png",
                        purpose: "any maskable", // For adaptive icons on Android
                    },
                ],
            },
        }),
        visualizer({ filename: "dist/stats.html", open: false }),
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
