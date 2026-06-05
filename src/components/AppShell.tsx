import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { BookOpen, BarChart2, PieChart, Settings, Home } from 'lucide-react';
import { Tooltip } from '@mantine/core';

export const AppShell: React.FC = () => {
  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      {/* Primary Slim Navigation */}
      <nav className="w-16 flex flex-col items-center py-4 bg-slate-900 border-r border-slate-800 shrink-0 z-50">
        <div className="mb-6">
          <Tooltip label="Volver a Admin Panel" position="right">
            <NavLink to="/admin">
              <img 
                src="https://imettrics.com/wp-content/uploads/2023/12/Favicon.png" 
                alt="iMettrics" 
                className="h-8 w-8 object-contain hover:scale-105 transition-transform"
              />
            </NavLink>
          </Tooltip>
        </div>
        
        <div className="flex flex-col gap-3 flex-grow w-full px-2 mt-4">
          <Tooltip label="Guías de Medición" position="right">
            <NavLink 
              to="guides" 
              className={({isActive}) => `flex justify-center p-3 rounded-xl transition-colors ${isActive ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
            >
              <BookOpen size={20} />
            </NavLink>
          </Tooltip>
          
          <Tooltip label="Reportes (Próximamente)" position="right">
            <button className="flex justify-center p-3 rounded-xl text-slate-600 cursor-not-allowed">
              <BarChart2 size={20} />
            </button>
          </Tooltip>
          
          <Tooltip label="Dashboards (Próximamente)" position="right">
            <button className="flex justify-center p-3 rounded-xl text-slate-600 cursor-not-allowed">
              <PieChart size={20} />
            </button>
          </Tooltip>
        </div>

        <div className="mt-auto px-2 w-full flex flex-col gap-3">
          <Tooltip label="Admin Panel" position="right">
            <NavLink 
              to="/admin" 
              className="flex justify-center p-3 rounded-xl transition-colors text-slate-400 hover:text-white hover:bg-slate-800"
            >
              <Home size={20} />
            </NavLink>
          </Tooltip>
          
          <Tooltip label="Configuración del Workspace" position="right">
            <NavLink 
              to="settings" 
              className={({isActive}) => `flex justify-center p-3 rounded-xl transition-colors ${isActive ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
            >
              <Settings size={20} />
            </NavLink>
          </Tooltip>
        </div>
      </nav>
      
      {/* Workspace Module Content */}
      <main className="flex-grow flex overflow-hidden relative isolate">
         <Outlet />
      </main>
    </div>
  );
};
