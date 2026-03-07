import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import useLenis from '../../hooks/useLenis';
import { useDarkMode } from '../../hooks/useDarkMode';
import { useTranslation } from 'react-i18next';
import { useLocalizedNumber } from '../../hooks/useLocalizedNumber';
import {
  Sprout, Truck, Shield, CheckCircle, QrCode, Package,
  ShoppingCart, Github, Twitter, ChevronDown, ArrowRight,
  Database, Zap, Search, Eye, ExternalLink, Activity, Info, User,
  Globe, Clock, MapPin, Award, Box, Loader2, Building, Store
} from 'lucide-react';
import PublicTopNav from '../../components/layout/PublicTopNav';
import { useInView } from 'react-intersection-observer';
import { motion, AnimatePresence } from 'framer-motion';
import heroBg from '../../assets/hero_farmland_bg.png';

const LandingPage = () => {
  useLenis();
  const { isAuthenticated, role } = useAuth();
  const navigate = useNavigate();
  const [isDark] = useDarkMode();
  const { t } = useTranslation();
  const { formatNumber } = useLocalizedNumber();

  useEffect(() => {
    if (isAuthenticated && role) navigate(`/${role.toLowerCase()}/dashboard`);
  }, [isAuthenticated, role, navigate]);

  const HeroSection = () => (
    <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden">
      {/* Background Image with Overlay */}
      <div className="absolute inset-0 z-0">
        <img
          src={heroBg}
          alt="Farmland Background"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/40 to-slate-950/90 dark:to-slate-950/95 shadow-[inset_0_0_100px_rgba(0,0,0,0.5)]"></div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center pt-24">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: "easeOut" }}
        >
          <div className="inline-flex items-center gap-2 px-5 py-2 bg-white/10 backdrop-blur-md text-emerald-300 rounded-full text-[10px] md:text-xs font-black mb-8 border border-white/20 tracking-widest uppercase">
            <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
            {t('landing.trustedBy')}
          </div>

          <h1 className="text-4xl md:text-8xl font-black text-white leading-[1.1] mb-8 tracking-tighter">
            {t('landing.heroTitle')}<br />
            <span className="text-emerald-400">{t('landing.heroTitleHighlight')}</span>
          </h1>

          <p className="text-slate-200 text-base md:text-2xl max-w-3xl mx-auto mb-12 leading-relaxed font-medium opacity-90">
            {t('landing.heroDesc')}
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link
              to="/role-selection"
              className="group w-full sm:w-auto px-10 md:px-12 py-4 md:py-5 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-2xl transition-all shadow-2xl shadow-emerald-600/40 hover:-translate-y-1 active:scale-95 flex items-center justify-center gap-3 text-lg"
            >
              {t('landing.getStarted')}
              <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              to="/login"
              className="group w-full sm:w-auto px-10 md:px-12 py-4 md:py-5 bg-white/10 backdrop-blur-md hover:bg-white/20 text-white font-black rounded-2xl transition-all border border-white/20 hover:-translate-y-1 active:scale-95 flex items-center justify-center gap-3 text-lg"
            >
              {t('landing.logIn')}
            </Link>
          </div>
        </motion.div>
      </div>

      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-10">
        <motion.div
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="p-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-sm"
        >
          <ChevronDown className="w-5 h-5 md:w-6 md:h-6 text-white/50" />
        </motion.div>
      </div>
    </section>
  );

  const PipelineUI = () => {
    const steps = [
      { id: 'farm', label: t('landing.farm'), icon: Sprout, description: t('landing.farmDesc') },
      { id: 'transporter', label: t('roles.transporter'), icon: Truck, description: t('landing.transporterDesc') },
      { id: 'distributor', label: t('landing.distributor'), icon: Package, description: t('landing.distributorDesc') },
      { id: 'retailer', label: t('landing.retailer'), icon: ShoppingCart, description: t('landing.retailerDesc') },
      { id: 'consumer', label: t('landing.consumer'), icon: User, description: t('landing.consumerDesc') },
      { id: 'qr', label: t('landing.qrScan'), icon: QrCode, description: t('landing.qrScanDesc') },
    ];

    return (
      <section className="py-24 bg-white dark:bg-slate-950 transition-colors duration-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center mb-16">
          <span className="inline-block px-4 py-1.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 text-[10px] font-black uppercase tracking-[0.3em] rounded-full border border-emerald-200 dark:border-emerald-800/50 mb-6">
            {t('landing.supplyChainFlow')}
          </span>
          <h2 className="text-3xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tighter mb-4">
            {t('landing.transparencyPipeline')} <span className="text-emerald-600 dark:text-emerald-500">{t('landing.pipelineHighlight')}</span>
          </h2>
          <p className="text-slate-500 dark:text-slate-400 max-w-2xl mx-auto font-medium">
            {t('landing.pipelineDesc')}
          </p>
        </div>

        <div className="max-w-7xl mx-auto px-4 overflow-hidden py-12">
          <div className="flex animate-marquee whitespace-nowrap gap-12 py-10">
            {[...steps, ...steps, ...steps].map((step, idx) => (
              <div
                key={`${step.id}-${idx}`}
                className="flex flex-col items-center group min-w-[200px]"
              >
                <div className="w-20 h-20 rounded-2xl bg-white dark:bg-slate-900 border-2 border-emerald-500/20 dark:border-emerald-500/10 group-hover:border-emerald-500 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-xl dark:shadow-emerald-900/10 transition-all mb-4 group-hover:-translate-y-2">
                  <step.icon className="w-10 h-10" />
                </div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white mb-1 tracking-tight">{step.label}</h3>
                <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  };

  const VerticalTimeline = () => {
    const steps = [
      {
        title: t('landing.timelineSteps.step1.title'),
        role: t('landing.timelineSteps.step1.role'),
        icon: Sprout,
        desc: t('landing.timelineSteps.step1.desc'),
        color: 'bg-emerald-500',
        lightBg: 'bg-emerald-50',
        darkBg: 'bg-emerald-900/10'
      },
      {
        title: t('landing.timelineSteps.step2.title'),
        role: t('landing.timelineSteps.step2.role'),
        icon: Shield,
        desc: t('landing.timelineSteps.step2.desc'),
        color: 'bg-blue-500',
        lightBg: 'bg-blue-50',
        darkBg: 'bg-blue-900/10'
      },
      {
        title: t('landing.timelineSteps.step3.title'),
        role: t('landing.timelineSteps.step3.role'),
        icon: Truck,
        desc: t('landing.timelineSteps.step3.desc'),
        color: 'bg-amber-500',
        lightBg: 'bg-amber-50',
        darkBg: 'bg-amber-900/10'
      },
      {
        title: t('landing.timelineSteps.step4.title'),
        role: t('landing.timelineSteps.step4.role'),
        icon: Package,
        desc: t('landing.timelineSteps.step4.desc'),
        color: 'bg-purple-500',
        lightBg: 'bg-purple-50',
        darkBg: 'bg-purple-900/10'
      },
      {
        title: t('landing.timelineSteps.step5.title'),
        role: t('landing.timelineSteps.step5.role'),
        icon: ShoppingCart,
        desc: t('landing.timelineSteps.step5.desc'),
        color: 'bg-pink-500',
        lightBg: 'bg-pink-50',
        darkBg: 'bg-pink-900/10'
      },
      {
        title: t('landing.timelineSteps.step6.title'),
        role: t('landing.timelineSteps.step6.role'),
        icon: User,
        desc: t('landing.timelineSteps.step6.desc'),
        color: 'bg-indigo-500',
        lightBg: 'bg-indigo-50',
        darkBg: 'bg-indigo-900/10'
      }
    ];

    return (
      <section className="py-24 md:py-32 bg-[#F9F7F2] dark:bg-slate-950 relative transition-colors duration-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20 md:mb-32">
            <span className="inline-block px-4 py-1.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 text-[10px] font-black uppercase tracking-[0.3em] rounded-full border border-amber-200 dark:border-amber-800/50 mb-6">
              {t('landing.farmToForkJourney')}
            </span>
            <h2 className="text-4xl md:text-7xl font-black text-slate-900 dark:text-white leading-tight tracking-tighter">
              {t('landing.everyStepVerified')} <span className="text-amber-600 dark:text-amber-500">{t('landing.verifiedTrusted')}</span>
            </h2>
            <p className="mt-8 text-slate-600 dark:text-slate-400 text-base md:text-xl max-w-2xl mx-auto font-medium">
              {t('landing.journeyDesc')}
            </p>
          </div>

          <div className="relative">
            {/* Center Line */}
            <div className="absolute left-4 md:left-1/2 top-0 bottom-0 w-1 bg-amber-200 dark:bg-amber-900/30 md:-translate-x-1/2 rounded-full"></div>

            <div className="space-y-12 md:space-y-24 relative">
              {steps.map((step, idx) => {
                const isEven = idx % 2 === 0;
                const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.1 });

                return (
                  <div key={idx} ref={ref} className={`relative flex flex-col md:flex-row items-center ${isEven ? 'md:flex-row' : 'md:flex-row-reverse'}`}>
                    {/* Content Card */}
                    <motion.div
                      initial={{ opacity: 0, x: isEven ? -30 : 30 }}
                      animate={inView ? { opacity: 1, x: 0 } : {}}
                      transition={{ duration: 0.8, ease: "easeOut" }}
                      className={`w-full md:w-[45%] pl-12 md:pl-0 ${isEven ? 'md:text-left' : 'md:text-left text-left'}`}
                    >
                      <div className={`p-6 md:p-12 rounded-[2rem] md:rounded-[2.5rem] shadow-xl md:shadow-2xl transition-all duration-500 border border-slate-100 dark:border-slate-800/50 ${step.lightBg} dark:bg-slate-900/60 backdrop-blur-sm group hover:-translate-y-2`}>
                        <div className="flex items-start gap-4 md:gap-6 mb-6 md:mb-8">
                          <div className={`w-12 h-12 md:w-14 md:h-14 rounded-xl md:rounded-2xl ${step.color} text-white flex items-center justify-center shrink-0 shadow-lg group-hover:rotate-12 transition-transform`}>
                            <step.icon className="w-6 h-6 md:w-8 md:h-8" />
                          </div>
                          <div>
                            <span className="text-[10px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-widest bg-amber-100 dark:bg-amber-900/30 px-3 py-1 rounded-full border border-amber-200 dark:border-amber-800/50">{t('landing.step')} {formatNumber(idx + 1)}</span>
                            <h3 className="text-xl md:text-3xl font-black text-slate-900 dark:text-white mt-2 leading-tight">{step.title}</h3>
                          </div>
                        </div>
                        <p className="text-slate-600 dark:text-slate-400 text-base md:text-lg leading-relaxed font-medium mb-6">
                          {step.desc}
                        </p>
                        <div className="flex items-center gap-2 text-[10px] md:text-xs font-black text-slate-500 dark:text-slate-500 uppercase tracking-widest">
                          <User className="w-3 h-3 md:w-4 md:h-4" />
                          {t('landing.primaryActor')} {step.role}
                        </div>
                      </div>
                    </motion.div>

                    {/* Timeline Node */}
                    <div className="absolute left-4 md:left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-amber-500 border-4 border-white dark:border-slate-950 z-10 shadow-[0_0_15px_rgba(212,163,115,0.5)]"></div>

                    {/* Spacer for other side */}
                    <div className="hidden md:block w-[45%]"></div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>
    );
  };


  const StakeholdersSection = () => {
    const stakeholders = [
      { role: t('sidebar.farmer'), icon: Sprout, count: t('landing.stakeholderCounts.farmers'), desc: t('landing.stakeholderCounts.farmersDesc') },
      { role: t('sidebar.distributor'), icon: Building, count: t('landing.stakeholderCounts.distributors'), desc: t('landing.stakeholderCounts.distributorsDesc') },
      { role: t('sidebar.retailer'), icon: Store, count: t('landing.stakeholderCounts.retailers'), desc: t('landing.stakeholderCounts.retailersDesc') },
      { role: t('sidebar.transporter'), icon: Truck, count: t('landing.stakeholderCounts.transporters'), desc: t('landing.stakeholderCounts.transportersDesc') }
    ];

    return (
      <section className="py-24 bg-slate-50 dark:bg-slate-900/50 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="inline-block px-4 py-1.5 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 text-[10px] font-black uppercase tracking-[0.3em] rounded-full border border-indigo-200 dark:border-indigo-800/50 mb-6 font-display">
              {t('landing.networkStrength')}
            </span>
            <h2 className="text-4xl md:text-6xl font-black text-slate-900 dark:text-white tracking-tighter mb-4">
              {t('landing.ecosystemTitle')} <span className="text-emerald-600">{t('landing.ecosystemHighlight')}</span>
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {stakeholders.map((s, idx) => (
              <div key={idx} className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] border border-slate-100 dark:border-slate-800 hover:shadow-2xl dark:shadow-emerald-900/10 transition-all group hover:-translate-y-1">
                <div className="w-14 h-14 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-6 group-hover:scale-110 transition-transform">
                  <s.icon className="w-7 h-7" />
                </div>
                <h3 className="text-3xl font-black text-slate-900 dark:text-white mb-1 tracking-tighter">{s.count}</h3>
                <p className="text-sm font-black text-emerald-600 dark:text-emerald-500 mb-4 uppercase tracking-widest">{s.role}s</p>
                <p className="text-slate-500 dark:text-slate-400 text-sm font-medium leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  };

  const Footer = () => (
    <footer className="bg-slate-950 text-white py-24 border-t border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-16 mb-24">
          <div className="md:col-span-1">
            <Link to="/" className="flex items-center gap-3 mb-8 group">
              <div className="w-12 h-12 rounded-2xl bg-emerald-600 flex items-center justify-center text-white font-black text-xl group-hover:scale-110 transition-transform shadow-xl shadow-emerald-600/20">F2F</div>
              <span className="text-3xl font-black text-white tracking-tighter">{t('common.appName')}</span>
            </Link>
            <p className="text-slate-400 font-medium mb-10 leading-relaxed">
              {t('landing.footerTagline')}
            </p>
            <div className="flex gap-4">
              {[Github, Twitter].map((Icon, i) => (
                <button key={i} className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-emerald-500 hover:text-white transition-all">
                  <Icon className="w-5 h-5" />
                </button>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-white font-black mb-8 uppercase tracking-[0.2em] text-xs">{t('landing.platform')}</h4>
            <ul className="space-y-4 text-slate-400 font-bold text-sm">
              <li><Link to="/role-selection" className="hover:text-emerald-400 transition-colors">{t('landing.stakeholders')}</Link></li>
              <li><Link to="/consumer/portal" className="hover:text-emerald-400 transition-colors">{t('landing.marketplace')}</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-black mb-8 uppercase tracking-[0.2em] text-xs">{t('landing.legal')}</h4>
            <ul className="space-y-4 text-slate-400 font-bold text-sm">
              <li><Link to="#" className="hover:text-emerald-400 transition-colors">{t('landing.privacy')}</Link></li>
              <li><Link to="#" className="hover:text-emerald-400 transition-colors">{t('landing.terms')}</Link></li>
              <li><Link to="#" className="hover:text-emerald-400 transition-colors">{t('landing.blockchainEthics')}</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-black mb-8 uppercase tracking-[0.2em] text-xs">{t('landing.infrastructure')}</h4>
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-slate-400 text-sm font-bold">
                <Globe className="w-4 h-4 text-emerald-500" /> {t('landing.distributedMainnet')}
              </div>
              <div className="flex items-center gap-3 text-slate-400 text-sm font-bold">
                <Clock className="w-4 h-4 text-emerald-500" /> {t('landing.uptime')}
              </div>
              <div className="flex items-center gap-3 text-slate-400 text-sm font-bold">
                <Award className="w-4 h-4 text-emerald-500" /> {t('landing.certifiedSecure')}
              </div>
            </div>
          </div>
        </div>

        <div className="pt-12 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-8">
          <p className="text-slate-500 font-black text-sm tracking-tight italic">{t('landing.copyright')}</p>
          <div className="flex gap-10 text-[10px] font-black uppercase text-slate-600 tracking-widest">
            <Link to="#" className="hover:text-emerald-500">{t('landing.securityAudit')}</Link>
            <Link to="#" className="hover:text-emerald-400">{t('landing.nodeStatus')}</Link>
          </div>
        </div>
      </div>
    </footer>
  );

  return (
    <div className="bg-white dark:bg-slate-950 transition-colors duration-500 selection:bg-emerald-500 selection:text-white overflow-hidden">
      <PublicTopNav />
      <HeroSection />
      <PipelineUI />
      <VerticalTimeline />
      <StakeholdersSection />
      <Footer />
    </div>
  );
};

export default LandingPage;
