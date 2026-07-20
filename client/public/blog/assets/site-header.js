/* ============================================================
   Centralized blog header / nav. Defined ONCE here and shared by
   every page in /blog. Built to match the React app header
   (client/src/components/Header.jsx, logged-out state). Renders
   into <div id="site-header"></div> (falls back to prepending to
   <body>) and appends the mobile drawer to <body>. Theme state is
   synced with the app via the `darkMode` localStorage key and
   body.dark-mode / html.dark.
   ============================================================ */
(function () {
    "use strict";

    var DARK_KEY = "darkMode";

    function prefersDark() {
        try {
            return localStorage.getItem(DARK_KEY) === "true";
        } catch (e) {
            return false;
        }
    }

    function applyTheme(dark) {
        document.body.classList.toggle("dark-mode", dark);
        document.documentElement.classList.toggle("dark", dark);
    }

    // Apply persisted theme as early as possible to limit flash.
    applyTheme(prefersDark());

    function svg(inner) {
        return (
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
            'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
            inner +
            "</svg>"
        );
    }

    // lucide icons matching the app nav (Home, DollarSign, BookOpen, Mail).
    var ICONS = {
        home: svg(
            '<path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline>',
        ),
        dollar: svg(
            '<line x1="12" x2="12" y1="2" y2="22"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>',
        ),
        book: svg(
            '<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path>',
        ),
        mail: svg(
            '<rect width="20" height="16" x="2" y="4" rx="2"></rect><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"></path>',
        ),
    };

    // Root-relative so they resolve in dev and production. Order + highlight + icons
    // match the app nav (Home, Pricing [highlight], Blog, Contact Us).
    var LINKS = [
        { href: "/", label: "Home", icon: "home" },
        { href: "/pricing", label: "Pricing", icon: "dollar" },
        { href: "/blog", label: "Blog", icon: "book" },
        { href: "/contact", label: "Contact Us", icon: "mail" },
    ];

    // Matches client/src/components/LanguageSwitcher.jsx (persists to i18nextLng,
    // which the app's i18n reads on load — so a choice here carries into the app).
    var LANGS = [
        { code: "en", label: "English", flag: "🇺🇸" },
        { code: "hi", label: "हिन्दी", flag: "🇮🇳" },
    ];
    function currentLang() {
        try {
            var v = (localStorage.getItem("i18nextLng") || "en").split("-")[0];
            return LANGS.some(function (l) {
                return l.code === v;
            })
                ? v
                : "en";
        } catch (e) {
            return "en";
        }
    }

    // lucide "file-text" icon, matching the app logo.
    var LOGO_SVG =
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
        'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
        '<path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path>' +
        '<polyline points="14 2 14 8 20 8"></polyline>' +
        '<line x1="16" y1="13" x2="8" y2="13"></line>' +
        '<line x1="16" y1="17" x2="8" y2="17"></line>' +
        '<line x1="10" y1="9" x2="8" y2="9"></line></svg>';

    function activeHref() {
        var p = location.pathname || "/";
        if (p.indexOf("/blog") === 0) return "/blog";
        if (p.indexOf("/pricing") === 0) return "/pricing";
        if (p.indexOf("/contact") === 0) return "/contact";
        if (p === "/" || p === "/index.html") return "/";
        return "";
    }

    function anchorsHtml(active) {
        return LINKS.map(function (l) {
            var cls = [];
            if (l.href === active) cls.push("is-active");
            if (l.highlight) cls.push("is-highlight");
            var attr = cls.length ? ' class="' + cls.join(" ") + '"' : "";
            var cur = l.href === active ? ' aria-current="page"' : "";
            var icon = ICONS[l.icon] || "";
            return (
                '<a href="' +
                l.href +
                '"' +
                attr +
                cur +
                ">" +
                icon +
                "<span>" +
                l.label +
                "</span></a>"
            );
        });
    }

    function langHtml() {
        var cur = currentLang();
        var opts = LANGS.map(function (l) {
            return (
                '<button class="hra-lang__opt' +
                (l.code === cur ? " is-current" : "") +
                '" type="button" role="option" data-lang="' +
                l.code +
                '">' +
                "<span>" +
                l.flag +
                "</span><span>" +
                l.label +
                "</span></button>"
            );
        }).join("");
        return (
            '<div class="hra-lang">' +
            '<button class="hra-lang__btn" type="button" aria-haspopup="listbox" aria-expanded="false">' +
            cur.toUpperCase() +
            ' <span class="hra-lang__caret">▼</span>' +
            "</button>" +
            '<div class="hra-lang__menu" role="listbox" hidden>' +
            opts +
            "</div>" +
            "</div>"
        );
    }

    function linksListHtml(active) {
        return (
            '<ul class="hra-nav__links">' +
            anchorsHtml(active)
                .map(function (a) {
                    return "<li>" + a + "</li>";
                })
                .join("") +
            "</ul>"
        );
    }

    function drawerLinksHtml(active) {
        return (
            '<div class="hra-drawer__links">' +
            anchorsHtml(active).join("") +
            "</div>"
        );
    }

    function themeHtml() {
        return (
            '<button class="hra-theme" type="button" role="switch" aria-label="Toggle dark mode" ' +
            'aria-checked="' +
            prefersDark() +
            '"><span class="hra-theme__knob"></span></button>'
        );
    }

    function authHtml() {
        return (
            '<a class="hra-nav__signin" href="/login">Sign In</a>' +
            '<a class="hra-nav__signup" href="/signup">Sign Up</a>'
        );
    }

    function build() {
        var active = activeHref();

        var header = document.createElement("header");
        header.className = "hra-nav";
        header.innerHTML =
            '<div class="hra-nav__bar">' +
            '<a class="hra-nav__logo" href="/" aria-label="Health Report Analyzer">' +
            '<span class="hra-nav__logo-icon">' +
            LOGO_SVG +
            "</span>" +
            '<span class="hra-nav__logo-text">Health Report Analyzer</span>' +
            "</a>" +
            '<div class="hra-nav__desktop">' +
            '<nav aria-label="Primary">' +
            linksListHtml(active) +
            "</nav>" +
            '<div class="hra-nav__actions">' +
            langHtml() +
            themeHtml() +
            authHtml() +
            "</div>" +
            "</div>" +
            '<button class="hra-nav__burger" type="button" aria-label="Open menu" ' +
            'aria-expanded="false" aria-controls="hraDrawer">' +
            "<span></span><span></span><span></span></button>" +
            "</div>";

        var overlay = document.createElement("div");
        overlay.className = "hra-drawer-overlay";
        overlay.innerHTML =
            '<nav class="hra-drawer" id="hraDrawer" role="dialog" aria-modal="true" aria-label="Menu">' +
            '<div class="hra-drawer__head">' +
            '<span class="hra-drawer__title">Health Report Analyzer</span>' +
            '<button class="hra-drawer__close" type="button" aria-label="Close menu">&times;</button>' +
            "</div>" +
            drawerLinksHtml(active) +
            '<div class="hra-drawer__actions">' +
            authHtml() +
            "</div>" +
            '<div class="hra-drawer__theme">' +
            langHtml() +
            themeHtml() +
            "</div>" +
            "</nav>";

        var mount = document.getElementById("site-header");
        if (mount && mount.parentNode) {
            mount.parentNode.replaceChild(header, mount);
        } else {
            document.body.insertBefore(header, document.body.firstChild);
        }
        document.body.appendChild(overlay);

        wire(header, overlay);
    }

    function wire(header, overlay) {
        var burger = header.querySelector(".hra-nav__burger");
        var drawer = overlay.querySelector(".hra-drawer");
        var closeBtn = overlay.querySelector(".hra-drawer__close");

        function open() {
            overlay.classList.add("is-open");
            document.body.classList.add("hra-no-scroll");
            burger.setAttribute("aria-expanded", "true");
        }
        function close() {
            overlay.classList.remove("is-open");
            document.body.classList.remove("hra-no-scroll");
            burger.setAttribute("aria-expanded", "false");
        }

        burger.addEventListener("click", open);
        closeBtn.addEventListener("click", close);
        overlay.addEventListener("click", function (e) {
            if (e.target === overlay) close();
        });
        document.addEventListener("keydown", function (e) {
            if (e.key === "Escape") close();
        });
        Array.prototype.forEach.call(
            drawer.querySelectorAll("a"),
            function (a) {
                a.addEventListener("click", close);
            },
        );

        function onThemeToggle() {
            var next = !document.body.classList.contains("dark-mode");
            applyTheme(next);
            try {
                localStorage.setItem(DARK_KEY, String(next));
            } catch (e) {}
            Array.prototype.forEach.call(
                document.querySelectorAll(".hra-theme"),
                function (b) {
                    b.setAttribute("aria-checked", String(next));
                },
            );
        }
        Array.prototype.forEach.call(
            document.querySelectorAll(".hra-theme"),
            function (b) {
                b.addEventListener("click", onThemeToggle);
            },
        );

        // Language switcher — open/close + persist to i18nextLng (matches the app).
        function selectLang(code) {
            try {
                localStorage.setItem("i18nextLng", code);
            } catch (e) {}
            Array.prototype.forEach.call(
                document.querySelectorAll(".hra-lang"),
                function (r) {
                    var b = r.querySelector(".hra-lang__btn");
                    if (b.firstChild)
                        b.firstChild.nodeValue = code.toUpperCase() + " ";
                    b.setAttribute("aria-expanded", "false");
                    r.querySelector(".hra-lang__menu").hidden = true;
                    Array.prototype.forEach.call(
                        r.querySelectorAll(".hra-lang__opt"),
                        function (o) {
                            o.classList.toggle(
                                "is-current",
                                o.getAttribute("data-lang") === code,
                            );
                        },
                    );
                },
            );
        }
        Array.prototype.forEach.call(
            document.querySelectorAll(".hra-lang"),
            function (root) {
                var btn = root.querySelector(".hra-lang__btn");
                var menu = root.querySelector(".hra-lang__menu");
                btn.addEventListener("click", function (e) {
                    e.stopPropagation();
                    var willOpen = menu.hidden;
                    menu.hidden = !willOpen;
                    btn.setAttribute("aria-expanded", String(willOpen));
                });
                Array.prototype.forEach.call(
                    root.querySelectorAll(".hra-lang__opt"),
                    function (opt) {
                        opt.addEventListener("click", function () {
                            selectLang(opt.getAttribute("data-lang"));
                        });
                    },
                );
            },
        );
        document.addEventListener("click", function () {
            Array.prototype.forEach.call(
                document.querySelectorAll(".hra-lang__menu"),
                function (m) {
                    m.hidden = true;
                },
            );
            Array.prototype.forEach.call(
                document.querySelectorAll(".hra-lang__btn"),
                function (b) {
                    b.setAttribute("aria-expanded", "false");
                },
            );
        });

        // Solid border + shadow once scrolled, like the app's .scrolled state.
        function onScroll() {
            header.classList.toggle("is-scrolled", window.scrollY > 20);
        }
        window.addEventListener("scroll", onScroll, { passive: true });
        onScroll();
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", build);
    } else {
        build();
    }
})();
