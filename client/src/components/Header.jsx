import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import {
    FileText,
    Menu,
    X,
    LogOut,
    Home,
    LayoutDashboard,
    LineChart,
    DollarSign,
    BookOpen,
    Mail,
    ChevronDown,
    Crown,
    Zap,
} from "lucide-react";
import { useSubscription } from "../context/SubscriptionContext";
import LanguageSwitcher from "./LanguageSwitcher";
import DarkModeToggle from "./DarkModeToggle";
import "../styles/Header.css";

// The nav links. Dashboard and Insights only show once you're signed in.
// `external: true` points at the static /blog site, so it's a plain <a>, not a router link.
function buildNavLinks(t, user) {
    const links = [{ to: "/", label: t("nav.home"), icon: Home }];

    if (user) {
        links.push({
            to: "/dashboard",
            label: t("nav.dashboard"),
            icon: LayoutDashboard,
        });
        links.push({
            to: "/insights",
            label: t("nav.insights"),
            icon: LineChart,
        });
    }

    links.push({
        to: "/pricing",
        label: t("nav.pricing"),
        icon: DollarSign,
    });
    links.push({
        to: "/blog",
        label: t("nav.blog"),
        icon: BookOpen,
        external: true,
    });
    links.push({ to: "/contact", label: t("nav.contact"), icon: Mail });

    return links;
}

function avatarLetter(user) {
    return user?.firstName?.charAt(0) || user?.email?.charAt(0) || "U";
}

// One desktop nav link. External links render as <a>, internal ones as router <Link>.
function DesktopNavLink({ link, isActive }) {
    const Icon = link.icon;
    const classes = ["nav-link"];
    if (isActive) classes.push("active");
    if (link.highlight) classes.push("highlight");

    if (link.external) {
        return (
            <a href={link.to} className={classes.join(" ")}>
                <Icon size={16} />
                <span>{link.label}</span>
            </a>
        );
    }

    return (
        <Link to={link.to} className={classes.join(" ")}>
            <Icon size={16} />
            <span>{link.label}</span>
        </Link>
    );
}

// The signed-in user dropdown on desktop (avatar, plan badge, quick links, logout).
function UserMenu({ user, subscription, open, setOpen, onLogout }) {
    const { t } = useTranslation();
    const isPro = subscription && subscription.plan !== "free";
    const uploadsLeft = subscription
        ? subscription.reportsLimit - subscription.reportsUsed
        : 0;

    return (
        <div className="user-dropdown" onMouseLeave={() => setOpen(false)}>
            <button
                className="user-trigger"
                onClick={() => setOpen(!open)}
                onMouseEnter={() => setOpen(true)}
            >
                <div className="user-avatar">{avatarLetter(user)}</div>
                <span className="user-name">
                    {user.firstName || t("header.user_fallback")}
                </span>
                <ChevronDown
                    size={14}
                    className={`chevron ${open ? "open" : ""}`}
                />
            </button>

            {open && (
                <div className="dropdown-menu">
                    <div className="dropdown-header">
                        <span className="dropdown-email">{user.email}</span>
                        {subscription && (
                            <div
                                className={`subscription-badge ${isPro ? "pro" : "free"}`}
                            >
                                {isPro ? (
                                    <>
                                        <Crown size={12} />
                                        <span>{t("header.pro")}</span>
                                    </>
                                ) : (
                                    <>
                                        <Zap size={12} />
                                        <span>
                                            {t("header.uploads_left", {
                                                count: uploadsLeft,
                                            })}
                                        </span>
                                    </>
                                )}
                            </div>
                        )}
                    </div>

                    <Link to="/dashboard" className="dropdown-item">
                        <LayoutDashboard size={16} />
                        <span>{t("nav.dashboard")}</span>
                    </Link>
                    <Link to="/insights" className="dropdown-item">
                        <LineChart size={16} />
                        <span>{t("nav.insights")}</span>
                    </Link>
                    <Link to="/pricing" className="dropdown-item">
                        <DollarSign size={16} />
                        <span>
                            {isPro
                                ? t("header.manage_plan")
                                : t("header.upgrade_to_pro")}
                        </span>
                    </Link>
                    <button className="dropdown-item logout" onClick={onLogout}>
                        <LogOut size={16} />
                        <span>{t("auth.logout")}</span>
                    </button>
                </div>
            )}
        </div>
    );
}

// The slide-in menu for mobile. Reuses the same nav links as desktop.
function MobileMenu({
    open,
    links,
    currentPath,
    user,
    onClose,
    onNavigate,
    onLogout,
}) {
    const { t } = useTranslation();

    return (
        <div
            className={`mobile-overlay ${open ? "open" : ""}`}
            onClick={onClose}
        >
            <nav
                id="mobile-nav-drawer"
                role="dialog"
                aria-modal="true"
                aria-label={t("app.title")}
                className={`mobile-nav ${open ? "open" : ""}`}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="mobile-nav-header">
                    <Link to="/" className="mobile-logo" onClick={onClose}>
                        <FileText size={24} />
                        <span>{t("app.title")}</span>
                    </Link>
                    <button className="mobile-close-btn" onClick={onClose}>
                        <X size={24} />
                    </button>
                </div>

                <div className="mobile-nav-content">
                    {user && (
                        <div className="mobile-user-info">
                            <div className="mobile-user-avatar">
                                {avatarLetter(user)}
                            </div>
                            <div className="mobile-user-details">
                                <span className="mobile-user-name">
                                    {user.firstName} {user.lastName}
                                </span>
                                <span className="mobile-user-email">
                                    {user.email}
                                </span>
                            </div>
                        </div>
                    )}

                    <ul className="mobile-nav-links">
                        {links.map((link) => {
                            const Icon = link.icon;
                            const isActive = currentPath === link.to;
                            return (
                                <li key={link.to}>
                                    <button
                                        className={`mobile-nav-link ${isActive ? "active" : ""} ${link.highlight ? "highlight" : ""}`}
                                        onClick={() => onNavigate(link)}
                                    >
                                        <Icon size={20} />
                                        <span>{link.label}</span>
                                        {isActive && (
                                            <span className="active-indicator" />
                                        )}
                                    </button>
                                </li>
                            );
                        })}
                    </ul>

                    <div className="mobile-nav-extras">
                        <div className="mobile-extra-item">
                            <LanguageSwitcher />
                        </div>
                        <div className="mobile-extra-item">
                            <DarkModeToggle />
                        </div>
                    </div>

                    <div className="mobile-nav-footer">
                        {user ? (
                            <button
                                className="mobile-logout-btn"
                                onClick={onLogout}
                            >
                                <LogOut size={18} />
                                <span>{t("auth.logout")}</span>
                            </button>
                        ) : (
                            <div className="mobile-auth-buttons">
                                <button
                                    className="mobile-btn-signin"
                                    onClick={() => onNavigate({ to: "/login" })}
                                >
                                    {t("auth.login")}
                                </button>
                                <button
                                    className="mobile-btn-signup"
                                    onClick={() =>
                                        onNavigate({ to: "/signup" })
                                    }
                                >
                                    {t("auth.signup")}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </nav>
        </div>
    );
}

export default function Header({ user, setUser }) {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const location = useLocation();
    const { subscription, fetchSubscription } = useSubscription();

    const [menuOpen, setMenuOpen] = useState(false);
    const [userMenuOpen, setUserMenuOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);

    const navLinks = buildNavLinks(t, user);

    // Give the header a solid background once the user scrolls down a bit.
    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 20);
        window.addEventListener("scroll", onScroll);
        return () => window.removeEventListener("scroll", onScroll);
    }, []);

    // Close both menus whenever we change pages.
    useEffect(() => {
        setMenuOpen(false);
        setUserMenuOpen(false);
    }, [location.pathname]);

    // Freeze the page behind the mobile menu while it's open, hide the floating
    // chat bubble (it lives in <body> with a near-max z-index, so it'd otherwise
    // float over the drawer), and let Escape close the drawer.
    useEffect(() => {
        const value = menuOpen ? "hidden" : "";
        document.body.style.overflow = value;
        document.documentElement.style.overflow = value;
        document.body.classList.toggle("menu-open", menuOpen);

        const onKeyDown = (e) => {
            if (e.key === "Escape") setMenuOpen(false);
        };
        if (menuOpen) document.addEventListener("keydown", onKeyDown);

        return () => {
            document.body.style.overflow = "";
            document.documentElement.style.overflow = "";
            document.body.classList.remove("menu-open");
            document.removeEventListener("keydown", onKeyDown);
        };
    }, [menuOpen]);

    // Load the subscription so the dropdown can show the plan / uploads-left badge.
    useEffect(() => {
        if (user) fetchSubscription();
    }, [user, fetchSubscription]);

    const handleLogout = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        setUser(null);
        toast.success(t("toast.logout_success"));
        setMenuOpen(false);
        setUserMenuOpen(false);
        navigate("/");
    };

    // Used by the mobile menu buttons. External links leave the SPA; the rest use the router.
    const navigateFromMobile = (link) => {
        setMenuOpen(false);
        if (link.external) {
            window.location.href = link.to;
        } else {
            navigate(link.to);
        }
    };

    return (
        <header className={`main-header ${scrolled ? "scrolled" : ""}`}>
            <div className="header-container">
                <Link to="/" className="header-logo" aria-label={t("nav.home")}>
                    <div className="logo-icon-wrapper">
                        <FileText className="logo-icon" />
                    </div>
                    <span className="logo-text">{t("app.title")}</span>
                </Link>

                <nav className="desktop-nav">
                    <ul className="nav-links">
                        {navLinks.map((link) => (
                            <li key={link.to}>
                                <DesktopNavLink
                                    link={link}
                                    isActive={location.pathname === link.to}
                                />
                            </li>
                        ))}
                    </ul>

                    <div className="nav-actions">
                        <LanguageSwitcher />
                        <DarkModeToggle />

                        {user ? (
                            <UserMenu
                                user={user}
                                subscription={subscription}
                                open={userMenuOpen}
                                setOpen={setUserMenuOpen}
                                onLogout={handleLogout}
                            />
                        ) : (
                            <div className="auth-buttons">
                                <button
                                    className="btn-signin"
                                    onClick={() => navigate("/login")}
                                >
                                    {t("auth.login")}
                                </button>
                                <button
                                    className="btn-signup"
                                    onClick={() => navigate("/signup")}
                                >
                                    {t("auth.signup")}
                                </button>
                            </div>
                        )}
                    </div>
                </nav>

                <button
                    className="mobile-menu-btn"
                    onClick={() => setMenuOpen((prev) => !prev)}
                    aria-label={t("header.toggle_menu")}
                    aria-expanded={menuOpen}
                    aria-controls="mobile-nav-drawer"
                >
                    {menuOpen ? <X size={24} /> : <Menu size={24} />}
                </button>
            </div>

            <MobileMenu
                open={menuOpen}
                links={navLinks}
                currentPath={location.pathname}
                user={user}
                onClose={() => setMenuOpen(false)}
                onNavigate={navigateFromMobile}
                onLogout={handleLogout}
            />
        </header>
    );
}
