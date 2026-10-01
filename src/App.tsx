/**
 * @file App.tsx
 * @description Componente raíz de la aplicación CMR para Mayeli (Negocio de comida de barrio).
 * Cumple con los tres requisitos funcionales requeridos:
 * 1. Resumen de todas las ventas con gráficos inteligentes.
 * 2. Control total de ventas (registro ágil, buscador, filtros, tickets, edición y anulación).
 * 3. Persistencia de datos al cerrar la aplicación (LocalStorage seguro + respaldo).
 * 
 * ATENCIÓN - PUNTOS DONDE ALGUIEN SUELE EQUIVOCARSE:
 * 1. Efectos de sincronización con LocalStorage: Si se actualiza el estado en un hook y no se
 *    sincroniza inmediatamente o se crea un bucle infinito en useEffect, la aplicación puede congelarse.
 *    Aquí usamos useEffect escuchando exclusivamente `[ventas]` y `[productos]`.
 * 2. Scroll en dispositivos móviles: Asegurar `pb-28` en el contenedor principal para que
 *    la barra de navegación inferior fija no tape los botones o gráficos del final de pantalla.
 * 3. Renderizado inicial: Inicializar el estado de React llamando directamente a `cargarVentas()`
 *    dentro del useState (lazy initialization `useState(() => cargarVentas())`) para evitar
 *    leer del disco en cada renderizado secundario.
 */

import { useState, useEffect } from 'react';
import { Venta, ProductoComida } from './types';
import { cargarVentas, guardarVentas, cargarProductos, guardarProductos, formatearMoneda } from './utils/storage';
import { ResumenVentas } from './components/ResumenVentas';
import { ControlVentas } from './components/ControlVentas';
import { AjustesRespaldo } from './components/AjustesRespaldo';
import { 
  BarChart3, PlusCircle, History, 
  ShieldCheck, ChefHat, Sparkles
} from 'lucide-react';

type TabActivo = 'resumen' | 'vender' | 'control' | 'respaldo';

export default function App() {
  // Inicialización perezosa (lazy init) para rendimiento óptimo
  const [ventas, setVentas] = useState<Venta[]>(() => cargarVentas());
  const [productos, setProductos] = useState<ProductoComida[]>(() => cargarProductos());
  const [tabActivo, setTabActivo] = useState<TabActivo>('resumen');

  // REQUISITO 3: Mantener los datos al cerrar o recargar la aplicación
  useEffect(() => {
    guardarVentas(ventas);
  }, [ventas]);

  useEffect(() => {
    guardarProductos(productos);
  }, [productos]);

  // CÁLCULO DE VENTAS DE HOY PARA EL ENCABEZADO
  const ahora = new Date();
  const ventasHoy = ventas.filter(v => {
    if (v.estado === 'anulada') return false;
    const f = new Date(v.fecha);
    return (
      f.getDate() === ahora.getDate() &&
      f.getMonth() === ahora.getMonth() &&
      f.getFullYear() === ahora.getFullYear()
    );
  });
  const totalHoy = ventasHoy.reduce((acc, curr) => acc + curr.total, 0);

  // MANEJADORES DE ESTADO DE VENTAS
  const handleAgregarVenta = (nuevaVenta: Venta) => {
    setVentas(prev => [nuevaVenta, ...prev]);
  };

  const handleEditarVenta = (ventaEditada: Venta) => {
    setVentas(prev => prev.map(v => (v.id === ventaEditada.id ? ventaEditada : v)));
  };

  const handleEliminarVenta = (id: string) => {
    setVentas(prev => prev.filter(v => v.id !== id));
  };

  const handleRestablecerVentas = (nuevasVentas: Venta[]) => {
    setVentas(nuevasVentas);
    guardarVentas(nuevasVentas);
  };

  const handleActualizarProductos = (nuevos: ProductoComida[]) => {
    setProductos(nuevos);
    guardarProductos(nuevos);
  };

  return (
    <div className="min-h-screen bg-neutral-100 text-neutral-900 flex flex-col font-sans">
      {/* -------------------- ENCABEZADO SUPERIOR MÓVIL -------------------- */}
      <header className="sticky top-0 z-40 bg-neutral-950 text-white border-b border-purple-950 px-4 py-3 shadow-md">
        <div className="max-w-xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-purple-600 to-neutral-900 border border-purple-500/40 text-white flex items-center justify-center shadow-sm">
              <ChefHat size={22} className="text-purple-300" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="font-extrabold text-white text-base tracking-tight leading-none">
                  CMR • Mayeli
                </h1>
                <span className="text-[10px] font-bold bg-purple-900/80 text-purple-200 border border-purple-700/60 px-1.5 py-0.5 rounded-full">
                  Efectivo
                </span>
              </div>
              <p className="text-[11px] text-neutral-400 mt-0.5">Control de Ventas de Barrio</p>
            </div>
          </div>

          {/* Badge informativo de ventas del día */}
          <div className="text-right">
            <span className="text-[10px] font-semibold text-neutral-400 block uppercase tracking-wider">
              Hoy en Caja
            </span>
            <span className="text-xs sm:text-sm font-extrabold text-purple-300 block">
              {formatearMoneda(totalHoy)}
            </span>
          </div>
        </div>
      </header>

      {/* -------------------- CONTENIDO PRINCIPAL DE LA APP -------------------- */}
      <main className="flex-1 max-w-xl w-full mx-auto p-4 sm:p-5">
        {/* PESTAÑA 1: RESUMEN DE VENTAS CON GRÁFICOS INTELIGENTES */}
        {tabActivo === 'resumen' && (
          <ResumenVentas
            ventas={ventas}
            alIrARegistrar={() => setTabActivo('vender')}
          />
        )}

        {/* PESTAÑA 2: VENDER (REGISTRO RÁPIDO) */}
        {tabActivo === 'vender' && (
          <ControlVentas
            ventas={ventas}
            productos={productos}
            onAgregarVenta={handleAgregarVenta}
            onEditarVenta={handleEditarVenta}
            onEliminarVenta={handleEliminarVenta}
            vistaInicial="registrar"
          />
        )}

        {/* PESTAÑA 3: CONTROL E HISTORIAL DE TODAS LAS VENTAS */}
        {tabActivo === 'control' && (
          <ControlVentas
            ventas={ventas}
            productos={productos}
            onAgregarVenta={handleAgregarVenta}
            onEditarVenta={handleEditarVenta}
            onEliminarVenta={handleEliminarVenta}
            vistaInicial="historial"
          />
        )}

        {/* PESTAÑA 4: RESPALDO Y PERSISTENCIA (FUNCIÓN 3) */}
        {tabActivo === 'respaldo' && (
          <AjustesRespaldo
            ventas={ventas}
            productos={productos}
            onRestablecerVentas={handleRestablecerVentas}
            onActualizarProductos={handleActualizarProductos}
          />
        )}
      </main>

      {/* -------------------- BARRA DE NAVEGACIÓN INFERIOR (MOBILE FIRST) -------------------- */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-neutral-950/95 backdrop-blur-lg border-t border-purple-950/80 py-1.5 px-3 shadow-lg">
        <div className="max-w-xl mx-auto flex items-center justify-around">
          {/* TAB 1: RESUMEN */}
          <button
            onClick={() => setTabActivo('resumen')}
            className={`flex flex-col items-center py-1 px-3 rounded-2xl transition-all ${
              tabActivo === 'resumen'
                ? 'text-purple-400 font-bold scale-105'
                : 'text-neutral-400 hover:text-neutral-200 font-medium'
            }`}
          >
            <BarChart3 size={20} />
            <span className="text-[10px] mt-1">Resumen</span>
          </button>

          {/* TAB 2: VENDER (BOTÓN DESTACADO CENTRAL) */}
          <button
            onClick={() => setTabActivo('vender')}
            className={`flex flex-col items-center py-1 px-3 rounded-2xl transition-all ${
              tabActivo === 'vender'
                ? 'text-purple-400 font-bold scale-105'
                : 'text-neutral-300 hover:text-white font-medium'
            }`}
          >
            <div className={`w-9 h-9 rounded-full flex items-center justify-center shadow-md transition-all ${
              tabActivo === 'vender'
                ? 'bg-purple-600 text-white scale-110 shadow-purple-600/40 border border-purple-400'
                : 'bg-neutral-800 text-purple-400 border border-neutral-700'
            }`}>
              <PlusCircle size={22} />
            </div>
            <span className="text-[10px] mt-0.5">Vender</span>
          </button>

          {/* TAB 3: CONTROL & HISTORIAL */}
          <button
            onClick={() => setTabActivo('control')}
            className={`flex flex-col items-center py-1 px-3 rounded-2xl transition-all relative ${
              tabActivo === 'control'
                ? 'text-purple-400 font-bold scale-105'
                : 'text-neutral-400 hover:text-neutral-200 font-medium'
            }`}
          >
            <History size={20} />
            <span className="text-[10px] mt-1">Historial</span>
            {ventas.length > 0 && (
              <span className="absolute top-1 right-2 w-2 h-2 bg-purple-500 rounded-full" />
            )}
          </button>

          {/* TAB 4: RESPALDO (FUNCIÓN 3) */}
          <button
            onClick={() => setTabActivo('respaldo')}
            className={`flex flex-col items-center py-1 px-3 rounded-2xl transition-all ${
              tabActivo === 'respaldo'
                ? 'text-purple-400 font-bold scale-105'
                : 'text-neutral-400 hover:text-neutral-200 font-medium'
            }`}
          >
            <ShieldCheck size={20} />
            <span className="text-[10px] mt-1">Respaldo</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
