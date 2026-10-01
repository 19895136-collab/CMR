/**
 * @file ResumenVentas.tsx
 * @description Pestaña principal que muestra el resumen de todas las ventas con KPIs y gráficos inteligentes.
 * 
 * ATENCIÓN - PUNTOS DONDE ALGUIEN SUELE EQUIVOCARSE:
 * 1. Filtrado de fechas locales vs UTC: Comparar fechas usando cadenas completas ISO suele fallar
 *    debido a la diferencia de husos horarios (ej: UTC medianoche vs hora local). Siempre normalizar
 *    las fechas usando `getFullYear()`, `getMonth()`, `getDate()` para que el filtro "Hoy"
 *    refleje exactamente las ventas del día del usuario y no de ayer o mañana.
 * 2. Cálculo del Ticket Promedio: Si no hay ventas, `total / cantidad` produce NaN.
 *    Siempre validar: `cantidad > 0 ? total / cantidad : 0`.
 * 3. Ventas Anuladas: Excluir explícitamente las ventas anuladas de las sumatorias de ingresos
 *    y del dinero en caja para no descuadrar el arqueo.
 */

import React, { useState } from 'react';
import { Venta, PeriodoFiltro } from '../types';
import { formatearMoneda } from '../utils/storage';
import { SmartCharts } from './SmartCharts';
import { DollarSign, ShoppingBag, Utensils, Coins, Calendar, ArrowUpRight, PlusCircle } from 'lucide-react';

interface ResumenVentasProps {
  ventas: Venta[];
  alIrARegistrar: () => void;
}

export const ResumenVentas: React.FC<ResumenVentasProps> = ({ ventas, alIrARegistrar }) => {
  const [periodo, setPeriodo] = useState<PeriodoFiltro>('hoy');

  // Filtrado confiable de ventas según el período seleccionado
  const ventasFiltradas = ventas.filter(v => {
    // Si la venta está anulada, se excluye de las métricas de ingresos
    if (v.estado === 'anulada') return false;

    const fechaVenta = new Date(v.fecha);
    const ahora = new Date();

    if (periodo === 'hoy') {
      return (
        fechaVenta.getDate() === ahora.getDate() &&
        fechaVenta.getMonth() === ahora.getMonth() &&
        fechaVenta.getFullYear() === ahora.getFullYear()
      );
    }

    if (periodo === '7dias') {
      const hace7Dias = new Date(ahora);
      hace7Dias.setDate(ahora.getDate() - 7);
      return fechaVenta >= hace7Dias;
    }

    if (periodo === 'mes') {
      return (
        fechaVenta.getMonth() === ahora.getMonth() &&
        fechaVenta.getFullYear() === ahora.getFullYear()
      );
    }

    // 'todos'
    return true;
  });

  // Métricas principales
  const totalRecaudado = ventasFiltradas.reduce((acc, curr) => acc + curr.total, 0);
  const totalPedidos = ventasFiltradas.length;
  const ticketPromedio = totalPedidos > 0 ? totalRecaudado / totalPedidos : 0;

  // Efectivo en caja (crítico para el arqueo diario en el negocio de comida de Mayeli)
  const efectivoEnCaja = ventasFiltradas
    .filter(v => v.metodoPago === 'efectivo')
    .reduce((acc, curr) => acc + curr.total, 0);

  // Transferencias / Digitales
  const transferencias = ventasFiltradas
    .filter(v => v.metodoPago === 'transferencia')
    .reduce((acc, curr) => acc + curr.total, 0);

  // Encontrar el plato estrella del período
  const contadorPlatos: { [nombre: string]: number } = {};
  ventasFiltradas.forEach(v => {
    v.items.forEach(item => {
      contadorPlatos[item.nombre] = (contadorPlatos[item.nombre] || 0) + item.cantidad;
    });
  });

  let platoEstrella = 'Sin ventas aún';
  let maxPlatoCantidad = 0;
  for (const [nombre, cant] of Object.entries(contadorPlatos)) {
    if (cant > maxPlatoCantidad) {
      maxPlatoCantidad = cant;
      platoEstrella = `${nombre} (${cant} u.)`;
    }
  }

  return (
    <div className="space-y-5 pb-24">
      {/* CABECERA CON SELECTOR DE PERÍODO */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-4 rounded-2xl border border-stone-200 shadow-sm">
        <div>
          <span className="text-xs font-semibold text-orange-600 uppercase tracking-wider flex items-center gap-1">
            <Calendar size={13} />
            Período de análisis
          </span>
          <h2 className="text-lg font-bold text-stone-900">Resumen del Negocio</h2>
        </div>

        {/* Botones de filtro rápido adaptados para toques con el pulgar */}
        <div className="flex bg-stone-100 p-1 rounded-xl text-xs font-semibold overflow-x-auto no-scrollbar">
          {(['hoy', '7dias', 'mes', 'todos'] as PeriodoFiltro[]).map(p => {
            const etiquetas: Record<PeriodoFiltro, string> = {
              hoy: 'Hoy',
              '7dias': '7 Días',
              mes: 'Este Mes',
              todos: 'Histórico'
            };
            const activo = periodo === p;
            return (
              <button
                key={p}
                onClick={() => setPeriodo(p)}
                className={`px-3 py-1.5 rounded-lg transition-all flex-1 whitespace-nowrap text-center ${
                  activo
                    ? 'bg-white text-orange-600 shadow-xs font-bold'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                {etiquetas[p]}
              </button>
            );
          })}
        </div>
      </div>

      {/* TARJETA DESTACADA: TOTAL VENDIDO */}
      <div className="bg-gradient-to-br from-orange-500 via-amber-600 to-amber-700 rounded-3xl p-5 text-white shadow-lg shadow-orange-500/20 relative overflow-hidden">
        <div className="absolute -right-4 -bottom-4 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none" />
        
        <div className="flex items-center justify-between text-orange-100 text-xs font-medium">
          <span>Ventas Totales • {periodo === 'hoy' ? 'Hoy' : periodo === '7dias' ? 'Últimos 7 días' : periodo === 'mes' ? 'Mes actual' : 'Histórico'}</span>
          <span className="bg-white/20 backdrop-blur-xs px-2.5 py-0.5 rounded-full text-[11px] font-semibold flex items-center gap-1">
            <ArrowUpRight size={13} />
            Activo
          </span>
        </div>

        <div className="mt-3 mb-4">
          <div className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            {formatearMoneda(totalRecaudado)}
          </div>
          <p className="text-xs text-orange-100/90 mt-1">
            Cobrado en {totalPedidos} {totalPedidos === 1 ? 'ticket o pedido' : 'tickets o pedidos'}
          </p>
        </div>

        {/* Desglose rápido para control de caja física */}
        <div className="grid grid-cols-2 gap-2 pt-3 border-t border-white/20 text-xs">
          <div className="bg-black/15 backdrop-blur-xs rounded-xl p-2.5">
            <span className="text-orange-200 block text-[11px]">Efectivo en Caja</span>
            <span className="font-bold text-sm sm:text-base text-white">{formatearMoneda(efectivoEnCaja)}</span>
          </div>
          <div className="bg-black/15 backdrop-blur-xs rounded-xl p-2.5">
            <span className="text-orange-200 block text-[11px]">Transferencia / QR</span>
            <span className="font-bold text-sm sm:text-base text-white">{formatearMoneda(transferencias)}</span>
          </div>
        </div>
      </div>

      {/* TARJETAS DE INDICADORES CLAVE (KPIS) */}
      <div className="grid grid-cols-2 gap-3">
        {/* Ticket Promedio */}
        <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-sm flex flex-col justify-between">
          <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-2">
            <DollarSign size={18} />
          </div>
          <div>
            <span className="text-xs text-stone-500 font-medium block">Ticket Promedio</span>
            <span className="text-lg sm:text-xl font-extrabold text-stone-900 block mt-0.5">
              {formatearMoneda(ticketPromedio)}
            </span>
            <span className="text-[10px] text-stone-400">Por comensal / pedido</span>
          </div>
        </div>

        {/* Plato Estrella */}
        <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-sm flex flex-col justify-between">
          <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mb-2">
            <Utensils size={18} />
          </div>
          <div>
            <span className="text-xs text-stone-500 font-medium block">Plato Más Vendido</span>
            <span className="text-sm sm:text-base font-bold text-stone-900 block mt-0.5 truncate" title={platoEstrella}>
              {platoEstrella}
            </span>
            <span className="text-[10px] text-stone-400">El favorito del barrio</span>
          </div>
        </div>
      </div>

      {/* BOTÓN RÁPIDO PARA REGISTRAR VENTA */}
      <button
        onClick={alIrARegistrar}
        className="w-full bg-stone-900 hover:bg-stone-800 text-white rounded-2xl p-4 flex items-center justify-center gap-3 font-bold text-sm sm:text-base shadow-sm active:scale-[0.98] transition-all"
      >
        <PlusCircle size={20} className="text-amber-400" />
        <span>Registrar Nueva Venta Ahora</span>
      </button>

      {/* SECCIÓN DE GRÁFICOS INTELIGENTES */}
      <div>
        <div className="mb-2">
          <h3 className="font-bold text-stone-800 text-sm">Análisis Gráfico Inteligente</h3>
          <p className="text-xs text-stone-500">Visualización de comportamiento y tendencias para Mayeli</p>
        </div>
        <SmartCharts ventas={ventasFiltradas.length > 0 ? ventasFiltradas : ventas} />
      </div>
    </div>
  );
};
