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
import { 
  inicializarSQLite, 
  guardarVentaSQLite, 
  leerVentasSQLite, 
  borrarVentaSQLite, 
  guardarProductoSQLite, 
  leerProductosSQLite 
} from './services/sqliteDb';
import { ResumenVentas } from './components/ResumenVentas';
import { ControlVentas } from './components/ControlVentas';
import { AjustesRespaldo } from './components/AjustesRespaldo';
import { 
  BarChart3, PlusCircle, History, 
  ShieldCheck, ChefHat
} from 'lucide-react';

type TabActivo = 'resumen' | 'vender' | 'control' | 'respaldo';

export default function App() {
  // Inicialización con cache local y sincronización con SQLite
  const [ventas, setVentas] = useState<Venta[]>(() => cargarVentas());
  const [productos, setProductos] = useState<ProductoComida[]>(() => cargarProductos());
  const [tabActivo, setTabActivo] = useState<TabActivo>('resumen');

  // Cargar datos persistentes desde SQLite al iniciar la aplicación
  useEffect(() => {
    async function sincronizarSQLite() {
      try {
        await inicializarSQLite();
        const ventasSql = await leerVentasSQLite();
        const prodsSql = await leerProductosSQLite();
        if (ventasSql.length > 0) {
          setVentas(ventasSql);
          guardarVentas(ventasSql);
        }
        if (prodsSql.length > 0) {
          setProductos(prodsSql);
          guardarProductos(prodsSql);
        }
      } catch (err) {
        console.error('Error cargando SQLite:', err);
      }
    }
    sincronizarSQLite();
  }, []);

  // Guardado de respaldo en localStorage
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

  // MANEJADORES DE ESTADO DE VENTAS CON SQLITE
  const handleAgregarVenta = async (nuevaVenta: Venta) => {
    setVentas(prev => [nuevaVenta, ...prev]);
    await guardarVentaSQLite(nuevaVenta);
  };

  const handleEditarVenta = async (ventaEditada: Venta) => {
    setVentas(prev => prev.map(v => (v.id === ventaEditada.id ? ventaEditada : v)));
    await guardarVentaSQLite(ventaEditada);
  };

  const handleEliminarVenta = async (id: string) => {
    setVentas(prev => prev.filter(v => v.id !== id));
    await borrarVentaSQLite(id);
  };

  const handleRestablecerVentas = async (nuevasVentas: Venta[]) => {
    setVentas(nuevasVentas);
    guardarVentas(nuevasVentas);
    for (const v of nuevasVentas) {
      await guardarVentaSQLite(v, false);
    }
    await inicializarSQLite();
  };

  const handleActualizarProductos = async (nuevos: ProductoComida[]) => {
    setProductos(nuevos);
    guardarProductos(nuevos);
    for (const p of nuevos) {
      await guardarProductoSQLite(p, false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-100 text-neutral-900 flex flex-col font-sans">
      {/* -------------------- ENCABEZADO SUPERIOR MÓVIL -------------------- */}
      <header className="sticky top-0 z-40 bg-neutral-950 text-white border-b-2 border-purple-600 px-4 py-3 shadow-md">
        <div className="max-w-xl mx-auto flex items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-purple-700 text-white flex items-center justify-center shrink-0 border border-purple-400">
              <ChefHat size={26} />
            </div>
            <div>
              <h1 className="font-black text-white text-lg tracking-tight leading-tight">
                CMR • Mayeli
              </h1>
              <p className="text-base text-purple-200 font-bold">Comida en Efectivo</p>
            </div>
          </div>

          {/* Badge de ventas del día */}
          <div className="text-right">
            <span className="text-base font-bold text-neutral-300 block leading-tight">
              Hoy en Caja
            </span>
            <span className="text-xl font-black text-purple-300 block">
              {formatearMoneda(totalHoy)}
            </span>
          </div>
        </div>
      </header>

      {/* -------------------- CONTENIDO PRINCIPAL DE LA APP -------------------- */}
      <main className="flex-1 max-w-xl w-full mx-auto p-3 sm:p-5">
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

      {/* -------------------- BARRA DE NAVEGACIÓN INFERIOR (TEXTO >= 16PX) -------------------- */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-neutral-950 border-t-2 border-purple-600 py-2 px-2 shadow-2xl">
        <div className="max-w-xl mx-auto grid grid-cols-4 gap-1">
          {/* TAB 1: RESUMEN */}
          <button
            type="button"
            onClick={() => setTabActivo('resumen')}
            className={`min-h-[54px] py-1 px-1 rounded-2xl flex flex-col items-center justify-center transition-all ${
              tabActivo === 'resumen'
                ? 'bg-purple-900 text-white font-black border border-purple-400'
                : 'text-neutral-300 hover:text-white font-bold'
            }`}
          >
            <BarChart3 size={22} />
            <span className="text-base leading-tight mt-0.5">Resumen</span>
          </button>

          {/* TAB 2: VENDER */}
          <button
            type="button"
            onClick={() => setTabActivo('vender')}
            className={`min-h-[54px] py-1 px-1 rounded-2xl flex flex-col items-center justify-center transition-all ${
              tabActivo === 'vender'
                ? 'bg-purple-700 text-white font-black border border-purple-300 shadow-md'
                : 'text-neutral-300 hover:text-white font-bold'
            }`}
          >
            <PlusCircle size={22} className="text-purple-300" />
            <span className="text-base leading-tight mt-0.5">Vender</span>
          </button>

          {/* TAB 3: HISTORIAL */}
          <button
            type="button"
            onClick={() => setTabActivo('control')}
            className={`min-h-[54px] py-1 px-1 rounded-2xl flex flex-col items-center justify-center transition-all relative ${
              tabActivo === 'control'
                ? 'bg-purple-900 text-white font-black border border-purple-400'
                : 'text-neutral-300 hover:text-white font-bold'
            }`}
          >
            <History size={22} />
            <span className="text-base leading-tight mt-0.5">Ventas</span>
            {ventas.length > 0 && (
              <span className="absolute top-1.5 right-2 w-2.5 h-2.5 bg-purple-400 rounded-full" />
            )}
          </button>

          {/* TAB 4: RESPALDO */}
          <button
            type="button"
            onClick={() => setTabActivo('respaldo')}
            className={`min-h-[54px] py-1 px-1 rounded-2xl flex flex-col items-center justify-center transition-all ${
              tabActivo === 'respaldo'
                ? 'bg-purple-900 text-white font-black border border-purple-400'
                : 'text-neutral-300 hover:text-white font-bold'
            }`}
          >
            <ShieldCheck size={22} />
            <span className="text-base leading-tight mt-0.5">Copia</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
