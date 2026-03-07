import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useDarkMode } from '../../hooks/useDarkMode';
import { Sprout, Menu, X, Sun, Moon, ArrowRight, Globe, ChevronDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import i18n from '../../i18n';

const LANGUAGES = [
    { code: 'en', label: 'English', flag: '🇬🇧' },
    { code: 'hi', label: 'हिंदी', flag: '🇮🇳' },
    { code: 'mr', label: 'मराठी', flag: '🇮🇳' },
    { code: 'pa', label: 'ਪੰਜਾਬੀ', flag: '🇮🇳' },
    { code: 'gu', label: 'ગુજરાતી', flag: '🇮🇳' },
];

const PublicTopNav = () => {
    const { isAuthenticated, role } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const { t } = useTranslation();
    const [isDark, setIsDark] = useDarkMode();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [showLangDropdown, setShowLangDropdown] = useState(false);
    const [scrolled, setScrolled] = useState(false);
    const langDropdownRef = useRef(null);

    const currentLang = LANGUAGES.find(l => l.code === i18n.language) || LANGUAGES[0];

    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 20);
        };
        const handleClickOutside = (event) => {
            if (langDropdownRef.current && !langDropdownRef.current.contains(event.target)) {
                setShowLangDropdown(false);
            }
        };
        window.addEventListener('scroll', handleScroll);
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            window.removeEventListener('scroll', handleScroll);
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const navLinks = [
    ];

    const handleScrollTo = (id) => {
        setMobileMenuOpen(false);
        if (location.pathname !== '/') {
            navigate('/' + id);
            return;
        }
        const element = document.querySelector(id);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth' });
        }
    };

    return (
        <nav
            className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 bg-white dark:bg-gray-900 border-b border-emerald-100 dark:border-slate-800 ${scrolled ? 'py-2 shadow-md' : 'py-4'}`}
        >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-16">
                    {/* Logo */}
                    <Link to="/" className="flex items-center gap-2 group">
                        <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center group-hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20 group-hover:scale-105">
                            <Sprout className="w-6 h-6 text-white" />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-xl font-black text-emerald-900 dark:text-white leading-none">F2F</span>
                            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 tracking-widest uppercase">Farm to Fork</span>
                        </div>
                    </Link>

                    {/* Desktop Navigation */}
                    <div className="hidden md:flex items-center gap-8">
                        {navLinks.map((link) => (
                            <button
                                key={link.name}
                                onClick={() => link.path.startsWith('/#') ? handleScrollTo(link.path.substring(1)) : navigate(link.path)}
                                className="text-sm font-semibold transition-colors text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400"
                            >
                                {link.name}
                            </button>
                        ))}
                    </div>

                    {/* Desktop right: dark + auth */}
                    <div className="hidden md:flex items-center gap-4">
                        <button
                            onClick={() => setIsDark(!isDark)}
                            className="p-2 rounded-xl transition-all bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100"
                        >
                            {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                        </button>

                        {/* Language Dropdown */}
                        <div className="relative" ref={langDropdownRef}>
                            <button
                                onClick={() => setShowLangDropdown(!showLangDropdown)}
                                className="flex items-center gap-1.5 p-2 text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-900/20 hover:bg-emerald-100 rounded-xl transition-colors"
                            >
                                <Globe className="w-5 h-5" />
                                <span className="text-xs font-semibold hidden lg:block">{currentLang.flag} {currentLang.code.toUpperCase()}</span>
                                <ChevronDown className="w-3 h-3 hidden lg:block" />
                            </button>

                            {showLangDropdown && (
                                <div className="absolute right-0 mt-2 w-44 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-emerald-100 dark:border-slate-800 py-1 z-50">
                                    {LANGUAGES.map(lang => (
                                        <button
                                            key={lang.code}
                                            onClick={() => {
                                                i18n.changeLanguage(lang.code);
                                                localStorage.setItem('language', lang.code);
                                                setShowLangDropdown(false);
                                            }}
                                            className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm transition-colors ${i18n.language === lang.code
                                                ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 font-semibold'
                                                : 'text-gray-700 dark:text-slate-300 hover:bg-emerald-50 dark:hover:bg-slate-700'
                                                }`}
                                        >
                                            <span className="text-lg">{lang.flag}</span>
                                            <span>{lang.label}</span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {isAuthenticated ? (
                            <Link
                                to={`/${role?.toLowerCase()}/dashboard`}
                                className="px-6 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-bold transition-all shadow-lg shadow-emerald-900/20 active:scale-95"
                            >
                                Dashboard
                            </Link>
                        ) : (
                            <div className="flex items-center gap-3">
                                <Link
                                    to="/login"
                                    className="px-4 py-2 font-bold transition-colors text-emerald-700 dark:text-emerald-400 hover:text-emerald-800"
                                >
                                    Log In
                                </Link>
                                <Link
                                    to="/role-selection"
                                    className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-emerald-600/20 active:scale-95 flex items-center gap-2"
                                >
                                    Get Started
                                    <ArrowRight className="w-4 h-4" />
                                </Link>
                            </div>
                        )}
                    </div>

                    {/* Mobile Menu Button */}
                    <button
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                        className="md:hidden p-2 rounded-lg transition-colors text-slate-900 dark:text-white"
                    >
                        {mobileMenuOpen ? <X className="w-7 h-7" /> : <Menu className="w-7 h-7" />}
                    </button>
                </div>

                {/* Mobile Menu */}
                <div className={`md:hidden transition-all duration-300 overflow-hidden ${mobileMenuOpen ? 'max-h-[500px] opacity-100 pb-8' : 'max-h-0 opacity-0'
                    }`}>
                    <div className="flex flex-col gap-4 pt-4 border-t border-emerald-100 dark:border-emerald-900/20">
                        {navLinks.map((link) => (
                            <button
                                key={link.name}
                                onClick={() => link.path.startsWith('/#') ? handleScrollTo(link.path.substring(1)) : navigate(link.path)}
                                className="px-4 py-3 text-lg font-bold text-slate-700 dark:text-slate-200 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-xl transition-all flex justify-between items-center"
                            >
                                {link.name}
                                <ArrowRight className="w-5 h-5 text-emerald-500" />
                            </button>
                        ))}

                        <div className="grid grid-cols-2 gap-4 mt-4 px-4">
                            <button
                                onClick={() => setIsDark(!isDark)}
                                className="p-4 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 rounded-xl font-bold flex items-center justify-center gap-2"
                            >
                                {isDark ? <><Sun className="w-5 h-5" /> Light</> : <><Moon className="w-5 h-5" /> Dark</>}
                            </button>

                            {isAuthenticated ? (
                                <Link
                                    to={`/${role?.toLowerCase()}/dashboard`}
                                    className="p-4 bg-emerald-700 text-white rounded-xl font-bold text-center"
                                >
                                    Dashboard
                                </Link>
                            ) : (
                                <Link
                                    to="/login"
                                    className="p-4 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 rounded-xl font-bold text-center"
                                >
                                    Log In
                                </Link>
                            )}

                            {!isAuthenticated && (
                                <Link
                                    to="/role-selection"
                                    className="col-span-2 p-4 bg-emerald-600 text-white rounded-xl font-bold text-center shadow-lg shadow-emerald-600/20"
                                >
                                    Get Started Free
                                </Link>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </nav>
    );
};

export default PublicTopNav;
