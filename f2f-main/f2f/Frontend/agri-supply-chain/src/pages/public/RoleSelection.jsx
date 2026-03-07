import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Sprout, Truck, Store, ShoppingCart, User, ArrowRight } from 'lucide-react';
import PublicTopNav from '../../components/layout/PublicTopNav';

const RoleSelection = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const roles = [
    {
      id: 'farmer',
      icon: <Sprout className="w-12 h-12" />,
      title: t('roleSelection.roles.farmer.title'),
      subtitle: t('roleSelection.roles.farmer.subtitle'),
      description: t('roleSelection.roles.farmer.desc'),
      features: t('roleSelection.roles.farmer.features', { returnObjects: true }),
      color: 'from-green-500 to-emerald-600',
    },
    {
      id: 'distributor',
      icon: <Store className="w-12 h-12" />,
      title: t('roleSelection.roles.distributor.title'),
      subtitle: t('roleSelection.roles.distributor.subtitle'),
      description: t('roleSelection.roles.distributor.desc'),
      features: t('roleSelection.roles.distributor.features', { returnObjects: true }),
      color: 'from-blue-500 to-cyan-600',
    },
    {
      id: 'transporter',
      icon: <Truck className="w-12 h-12" />,
      title: t('roleSelection.roles.transporter.title'),
      subtitle: t('roleSelection.roles.transporter.subtitle'),
      description: t('roleSelection.roles.transporter.desc'),
      features: t('roleSelection.roles.transporter.features', { returnObjects: true }),
      color: 'from-orange-500 to-amber-600',
    },
    {
      id: 'retailer',
      icon: <ShoppingCart className="w-12 h-12" />,
      title: t('roleSelection.roles.retailer.title'),
      subtitle: t('roleSelection.roles.retailer.subtitle'),
      description: t('roleSelection.roles.retailer.desc'),
      features: t('roleSelection.roles.retailer.features', { returnObjects: true }),
      color: 'from-purple-500 to-violet-600',
    },
    {
      id: 'consumer',
      icon: <User className="w-12 h-12" />,
      title: t('roleSelection.roles.consumer.title'),
      subtitle: t('roleSelection.roles.consumer.subtitle'),
      description: t('roleSelection.roles.consumer.desc'),
      features: t('roleSelection.roles.consumer.features', { returnObjects: true }),
      color: 'from-rose-500 to-pink-600',
    },
  ];

  const handleRoleSelect = (roleId) => {
    navigate(`/register/${roleId}`);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <PublicTopNav />
      <div className="h-16"></div> {/* Spacer for fixed nav */}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            {t('roleSelection.title')}
          </h1>
          <p className="text-xl text-gray-600">
            {t('roleSelection.subtitle')}
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {roles.map((role) => (
            <div
              key={role.id}
              onClick={() => handleRoleSelect(role.id)}
              className="group cursor-pointer bg-white rounded-2xl shadow-sm border border-gray-200 hover:shadow-xl hover:border-primary/30 transition-all duration-300 overflow-hidden"
            >
              {/* Top Gradient Bar */}
              <div className={`h-2 bg-gradient-to-r ${role.color}`}></div>

              <div className="p-6">
                {/* Icon */}
                <div className={`inline-flex p-4 rounded-xl bg-gradient-to-br ${role.color} text-white mb-4 group-hover:scale-110 transition-transform`}>
                  {role.icon}
                </div>

                {/* Title */}
                <h3 className="text-2xl font-bold text-gray-900 mb-1">{role.title}</h3>
                <p className="text-sm text-gray-500 mb-3">{role.subtitle}</p>
                <p className="text-gray-600 mb-4">{role.description}</p>

                {/* Features */}
                <ul className="space-y-2 mb-6">
                  {role.features.map((feature, idx) => (
                    <li key={idx} className="flex items-center gap-2 text-sm text-gray-600">
                      <span className="w-1.5 h-1.5 bg-primary rounded-full"></span>
                      {feature}
                    </li>
                  ))}
                </ul>

                {/* CTA Button */}
                <button className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-gray-50 hover:bg-primary hover:text-white text-gray-700 rounded-xl font-medium transition-colors group-hover:bg-primary group-hover:text-white">
                  <span>{t('roleSelection.register')}</span>
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom Info */}
        <div className="mt-12 text-center">
          <p className="text-gray-600 mb-4">
            {t('roleSelection.alreadyPart')}
          </p>
          <Link
            to="/login"
            className="inline-flex items-center gap-2 text-primary font-semibold hover:underline"
          >
            <span>{t('roleSelection.logIn')}</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </main>
    </div>
  );
};

export default RoleSelection;
