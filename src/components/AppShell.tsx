import React, { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { BookOpen, BarChart2, PieChart, Settings, ChevronLeft, ChevronRight, LogOut } from 'lucide-react';
import { Tooltip } from '@mantine/core';
import { signOut } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { useClientContext } from '../contexts/ClientContext';
import { useAuth } from './AuthProvider';

const NAV_ITEMS = [
  { to: 'guides', label: 'Guías de Medición', icon: BookOpen, active: true },
  { to: null, label: 'Reportes', icon: BarChart2, active: false },
  { to: null, label: 'Dashboards', icon: PieChart, active: false },
];

export const AppShell: React.FC = () => {
  const { clients, selectedClientId } = useClientContext();
  const { user } = useAuth();
  const isAdmin = user?.customRole === 'admin';
  const workspace = clients?.find((c) => c.id === selectedClientId);

  const [isCollapsed, setIsCollapsed] = useState(() => {
    return localStorage.getItem('workspace_sidebar_collapsed') === 'true';
  });
  const [isHovered, setIsHovered] = useState(false);

  const toggleCollapsed = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem('workspace_sidebar_collapsed', String(next));
      return next;
    });
  };

  const handleSignOut = () => signOut(auth);

  return (
    <div className="flex h-screen overflow-hidden bg-slate-100">
      {/* Sidebar Wrapper to prevent layout shift */}
      <div 
        className={`shrink-0 transition-all duration-300 ease-in-out ${
          isCollapsed ? 'w-16' : 'w-60'
        }`}
      >
        {/* Sidebar */}
        <nav 
          onMouseEnter={() => { if (isCollapsed) setIsHovered(true); }}
          onMouseLeave={() => { setIsHovered(false); }}
          className={`h-screen flex flex-col bg-slate-950 border-r border-slate-800 z-50 transition-all duration-300 ease-in-out ${
            isCollapsed && !isHovered ? 'w-16' : 'w-60'
          } ${isCollapsed ? 'absolute shadow-xl shadow-slate-950/50' : ''}`}
        >
          
          {/* Logo & Workspace Name */}
          <div className="px-4 pt-5 pb-4 border-b border-slate-800 flex flex-col gap-3 relative">
            <div className="flex items-center justify-between gap-3 min-h-7">
              {(!isCollapsed || isHovered) ? (
                <img
                  src="https://imettrics.com/wp-content/uploads/elementor/thumbs/Logo-iMettrics-sticky-ro55wralkc88s4fvi5tu9l2jqo274cystymc231vli.png"
                  alt="iMettrics"
                  className="h-7 w-auto object-contain shrink-0 max-h-7"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
              ) : (
                <div className="h-7 w-7 bg-blue-600 rounded flex items-center justify-center font-bold text-white text-xs shrink-0 select-none">
                  iM
                </div>
              )}
              
              {/* Collapse Button */}
              <button 
                onClick={toggleCollapsed}
                className={`text-slate-400 hover:text-white p-1 hover:bg-slate-800 rounded transition-colors no-print ${
                  isCollapsed && !isHovered ? 'mx-auto' : ''
                }`}
                title={isCollapsed ? 'Expandir barra lateral' : 'Contraer barra lateral'}
              >
                {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
              </button>
            </div>
            
            {workspace && (!isCollapsed || isHovered) && (
              <div className="bg-slate-800/60 rounded-lg px-3 py-2 transition-all duration-200">
                <p className="text-slate-500 text-xs mb-0.5">Workspace</p>
                <p className="text-white text-sm font-semibold truncate">{workspace.name}</p>
              </div>
            )}
          </div>

          {/* Main Navigation */}
          <div className="flex-1 px-3 py-4 flex flex-col gap-1 overflow-x-hidden">
            {(!isCollapsed || isHovered) && (
              <p className="text-slate-600 text-xs font-semibold uppercase tracking-wider px-2 mb-2">Módulos</p>
            )}
            {NAV_ITEMS.map(({ to, label, icon: Icon, active }) =>
              active && to ? (
                <NavLink
                  key={label}
                  to={to}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800'
                    } ${isCollapsed && !isHovered ? 'justify-center px-0' : ''}`
                  }
                  title={isCollapsed && !isHovered ? label : undefined}
                >
                  <Icon size={18} className="shrink-0" />
                  {(!isCollapsed || isHovered) && <span className="truncate">{label}</span>}
                </NavLink>
              ) : (
                <Tooltip key={label} label="Próximamente" position="right" withArrow disabled={!isCollapsed || isHovered}>
                  <button 
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-700 cursor-not-allowed w-full text-left select-none ${
                      isCollapsed && !isHovered ? 'justify-center px-0' : ''
                    }`}
                    title={isCollapsed && !isHovered ? `${label} (Próximamente)` : undefined}
                  >
                    <Icon size={18} className="shrink-0" />
                    {(!isCollapsed || isHovered) && (
                      <>
                        <span className="truncate">{label}</span>
                        <span className="ml-auto text-[10px] bg-slate-800 text-slate-500 px-1.5 py-0.5 rounded-full font-normal">pronto</span>
                      </>
                    )}
                  </button>
                </Tooltip>
              )
            )}
          </div>

          {/* Bottom Actions */}
          <div className="px-3 pb-4 flex flex-col gap-1 border-t border-slate-800 pt-3 overflow-x-hidden">
            {isAdmin && (
              <NavLink
                to="/admin"
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-all duration-150 ${
                  isCollapsed && !isHovered ? 'justify-center px-0' : ''
                }`}
                title={isCollapsed && !isHovered ? 'Panel de Admin' : undefined}
              >
                <ChevronLeft size={18} className="shrink-0 rotate-180" />
                {(!isCollapsed || isHovered) && <span className="truncate">Panel de Admin</span>}
              </NavLink>
            )}
            {isAdmin && (
              <NavLink
                to="settings"
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                    isActive
                      ? 'bg-slate-700 text-white'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  } ${isCollapsed && !isHovered ? 'justify-center px-0' : ''}`
                }
                title={isCollapsed && !isHovered ? 'Configuración' : undefined}
              >
                <Settings size={18} className="shrink-0" />
                {(!isCollapsed || isHovered) && <span className="truncate">Configuración</span>}
              </NavLink>
            )}
            <button
              onClick={handleSignOut}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-500/70 hover:text-red-400 hover:bg-red-950/40 transition-all duration-150 w-full text-left ${
                isCollapsed && !isHovered ? 'justify-center px-0' : ''
              }`}
              title={isCollapsed && !isHovered ? 'Cerrar Sesión' : undefined}
            >
              <LogOut size={18} className="shrink-0" />
              {(!isCollapsed || isHovered) && <span className="truncate">Cerrar Sesión</span>}
            </button>
          </div>
        </nav>
      </div>

      {/* Main content */}
      <main className="flex-grow flex overflow-hidden relative">
        <Outlet />
      </main>
    </div>
  );
};

