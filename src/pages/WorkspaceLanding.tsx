import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useClientContext } from '../contexts/ClientContext';
import { BookOpen, BarChart2, PieChart, ArrowRight, Settings } from 'lucide-react';
import { useAuth } from '../components/AuthProvider';

export const WorkspaceLanding: React.FC = () => {
  const { clients, selectedClientId } = useClientContext();
  const { user } = useAuth();
  const navigate = useNavigate();
  const workspace = clients?.find((c) => c.id === selectedClientId);
  const isAdmin = user?.customRole === 'admin';

  if (!workspace) return null;

  const MODULES = [
    {
      id: 'guides',
      title: 'Guías de Medición',
      description: 'Documentación técnica, eventos, parámetros y dataLayer de tus implementaciones.',
      icon: BookOpen,
      color: 'from-blue-500 to-indigo-600',
      bgLight: 'bg-blue-50',
      iconColor: 'text-blue-600',
      onClick: () => navigate('guides'),
      disabled: false,
    },
    {
      id: 'reports',
      title: 'Reportes',
      description: 'Análisis de rendimiento, KPIs y visualizaciones detalladas de negocio.',
      icon: BarChart2,
      color: 'from-emerald-500 to-teal-600',
      bgLight: 'bg-emerald-50',
      iconColor: 'text-emerald-600',
      onClick: () => {},
      disabled: true,
    },
    {
      id: 'dashboards',
      title: 'Dashboards',
      description: 'Paneles en tiempo real con integración directa a tus plataformas de datos.',
      icon: PieChart,
      color: 'from-amber-500 to-orange-600',
      bgLight: 'bg-amber-50',
      iconColor: 'text-amber-600',
      onClick: () => {},
      disabled: true,
    },
  ];

  return (
    <div className="flex-1 overflow-auto bg-slate-50 relative h-full">
      {/* Decorative Background */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[20%] -right-[10%] w-[70%] h-[70%] rounded-full bg-gradient-to-br from-blue-100/40 to-indigo-100/40 blur-3xl" />
        <div className="absolute top-[40%] -left-[10%] w-[50%] h-[50%] rounded-full bg-gradient-to-tr from-teal-50/50 to-emerald-100/30 blur-3xl" />
        {/* Subtle grid pattern */}
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAwIDQwIEwgNDAgNDAgTCA0MCAwIiBmaWxsPSJub25lIiBzdHJva2U9InJnYmEoMTUsIDIzLCA0MiwgMC4wMykiIHN0cm9rZS13aWR0aD0iMSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNncmlkKSIvPjwvc3ZnPg==')] opacity-60" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-8 py-16 min-h-full flex flex-col justify-center">
        
        {/* Header Section */}
        <div className="mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-100 text-blue-700 text-xs font-bold tracking-wide uppercase mb-6 shadow-sm border border-blue-200">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
            </span>
            Workspace Activo
          </div>
          
          <h1 className="text-4xl md:text-5xl font-semibold text-slate-800 tracking-tight leading-tight mb-6 flex flex-col md:flex-row items-center justify-start gap-3 md:gap-4 flex-wrap">
            <span>Bienvenido a tu plataforma</span>
            <img 
              src="https://imettrics.com/wp-content/uploads/elementor/thumbs/Logo-iMettrics-sticky-ro55wralkc88s4fvi5tu9l2jqo274cystymc231vli.png" 
              alt="iMettrics" 
              className="h-10 md:h-14 w-auto object-contain"
            />
          </h1>
          
          <p className="text-xl text-slate-600 max-w-4xl leading-relaxed">
            Este es el espacio de trabajo colaborativo de <strong>{workspace.name}</strong> en iMettrics. 
            Aquí centralizamos toda la documentación, definiciones de datos y reportes analíticos para potenciar el rendimiento de tus plataformas digitales. 
            Nuestro objetivo es transformar la información en insights accionables, garantizando una gestión de datos sólida y transparente que te brinde la seguridad necesaria para la toma de decisiones estratégicas y el crecimiento continuo de tu negocio.
          </p>
        </div>

        {/* Modules Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
          {MODULES.map((module) => (
            <div 
              key={module.id}
              onClick={!module.disabled ? module.onClick : undefined}
              className={`group relative bg-white rounded-3xl p-8 border ${
                module.disabled 
                  ? 'border-slate-200 opacity-80 cursor-not-allowed' 
                  : 'border-slate-200/60 shadow-xl shadow-slate-200/40 hover:shadow-2xl hover:shadow-blue-900/10 hover:-translate-y-1 cursor-pointer'
              } transition-all duration-300 overflow-hidden flex flex-col`}
            >
              {/* Card accent gradient */}
              <div className={`absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r ${module.color} opacity-80 group-hover:opacity-100 transition-opacity`} />
              
              <div className="flex items-center justify-between mb-6">
                <div className={`w-14 h-14 rounded-2xl ${module.bgLight} flex items-center justify-center ${
                  !module.disabled ? 'group-hover:scale-110 transition-transform duration-300' : ''
                }`}>
                  <module.icon className={module.iconColor} size={28} />
                </div>
                {module.disabled && (
                  <span className="px-2.5 py-1 bg-slate-100 text-slate-500 text-[10px] font-bold uppercase tracking-wider rounded-lg border border-slate-200">
                    Pronto
                  </span>
                )}
              </div>
              
              <h3 className="text-2xl font-bold text-slate-800 mb-3">{module.title}</h3>
              <p className="text-slate-500 leading-relaxed flex-1 mb-8">
                {module.description}
              </p>
              
              <div className="mt-auto">
                {!module.disabled ? (
                  <div className={`inline-flex items-center gap-2 text-sm font-semibold ${module.iconColor} group-hover:gap-3 transition-all`}>
                    Acceder al módulo <ArrowRight size={16} />
                  </div>
                ) : (
                  <div className="text-sm font-medium text-slate-400">
                    En desarrollo
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Admin Quick Actions */}
        {isAdmin && (
          <div className="pt-8 border-t border-slate-200/60 flex items-center justify-between text-slate-500 text-sm">
            <p>¿Necesitas ajustar permisos o detalles del cliente?</p>
            <button 
              onClick={() => navigate('settings')}
              className="flex items-center gap-2 hover:text-blue-600 font-medium transition-colors bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm hover:border-blue-200"
            >
              <Settings size={16} />
              Ir a Configuración
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
