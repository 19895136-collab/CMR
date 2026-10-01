/**
 * @file ResumenVentas.tsx
 * @description Pestaña principal que muestra el resumen de todas las ventas con KPIs y gráficos inteligentes.
 * Paleta: Morado y Negro. Sistema configurado para cobro exclusivo en efectivo.
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
import { DollarSign, Utensils, Calendar, ArrowUpRight, PlusCircle, Banknote } from 'lucide-react';

interface ResumenVentasProps {
  ventas: Venta[];
  alIrARegistrar: () => void;
}

export const ResumenVentas: React.FC<ResumenVentasProps> = ({ ventas, alIrARegistrar }) => {
  const [periodo, setPeriodo] = useState<PeriodoFiltro>('hoy');

  const ventasFiltradas = ventas.filter(v => {
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

    return true;
  });

  const totalRecaudado = ventasFiltradas.reduce((acc, curr) => acc + curr.total, 0);
  const totalPedidos = ventasFiltradas.length;
  const ticketPromedio = totalPedidos > 0 ? totalRecaudado / totalPedidos : 0;

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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-4 rounded-2xl border border-neutral-200 shadow-sm">
        <div>
          <span className="text-xs font-semibold text-purple-700 uppercase tracking-wider flex items-center gap-1">
            <Calendar size={13} />
            Período de análisis
          </span>
          <h2 className="text-lg font-bold text-neutral-900">Resumen del Negocio</h2>
        </div>

        <div className="flex bg-neutral-100 p-1 rounded-xl text-xs font-semibold overflow-x-auto no-scrollbar">
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
                    ? 'bg-neutral-950 text-white shadow-xs font-bold'
                    : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                {etiquetas[p]}
              </button>
            );
          })}
        </div>
      </div>

      {/* TARJETA DESTACADA MORADO Y NEGRO: TOTAL VENDIDO EN EFECTIVO */}
      <div className="bg-gradient-to-br from-neutral-950 via-purple-950 to-neutral-900 rounded-3xl p-5 text-white shadow-xl shadow-purple-950/20 border border-purple-900/50 relative overflow-hidden">
        <div className="absolute -right-6 -bottom-6 w-36 h-36 bg-purple-600/20 rounded-full blur-2xl pointer-events-none" />
        
        <div className="flex items-center justify-between text-purple-200 text-xs font-medium">
          <span>Ventas Totales • {periodo === 'hoy' ? 'Hoy' : periodo === '7dias' ? 'Últimos 7 días' : periodo === 'mes' ? 'Mes actual' : 'Histórico'}</span>
          <span className="bg-purple-900/80 border border-purple-700/60 px-2.5 py-0.5 rounded-full text-[11px] font-semibold flex items-center gap-1 text-purple-200">
            <ArrowUpRight size={13} />
            Efectivo
          </span>
        </div>

        <div className="mt-3 mb-4">
          <div className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
            {formatearMoneda(totalRecaudado)}
          </div>
          <p className="text-xs text-purple-200/90 mt-1">
            Cobrado en {totalPedidos} {totalPedidos === 1 ? 'ticket o comanda' : 'tickets o comandas'}
          </p>
        </div>

        {/* Desglose de control de caja física (100% Efectivo) */}
        <div className="grid grid-cols-2 gap-2 pt-3 border-t border-purple-900/60 text-xs">
          <div className="bg-black/40 border border-purple-900/40 rounded-xl p-2.5">
            <span className="text-purple-300 block text-[11px]">Efectivo en Caja Físico</span>
            <span className="font-bold text-sm sm:text-base text-white">{formatearMoneda(totalRecaudado)}</span>
          </div>
          <div className="bg-black/40 border border-purple-900/40 rounded-xl p-2.5">
            <span className="text-purple-300 block text-[11px]">Modalidad de Pago</span>
            <span className="font-bold text-sm sm:text-base text-white flex items-center gap-1">
              <Banknote size={15} className="text-purple-400" />
              100% Efectivo
            </span>
          </div>
        </div>
      </div>

      {/* KPIS */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-neutral-200 shadow-sm flex flex-col justify-between">
          <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center mb-2">
            <DollarSign size={18} />
          </div>
          <div>
            <span className="text-xs text-neutral-500 font-medium block">Ticket Promedio</span>
            <span className="text-lg sm:text-xl font-extrabold text-neutral-900 block mt-0.5">
              {formatearMoneda(ticketPromedio)}
            </span>
            <span className="text-[10px] text-neutral-400">Por comensal / pedido</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-neutral-200 shadow-sm flex flex-col justify-between">
          <div className="w-8 h-8 rounded-xl bg-neutral-950 text-purple-400 flex items-center justify-center mb-2">
            <Utensils size={18} />
          </div>
          <div>
            <span className="text-xs text-neutral-500 font-medium block">Plato Más Vendido</span>
            <span className="text-sm sm:text-base font-bold text-neutral-900 block mt-0.5 truncate" title={platoEstrella}>
              {platoEstrella}
            </span>
            <span className="text-[10px] text-neutral-400">El favorito del barrio</span>
          </div>
        </div>
      </div>

      {/* BOTÓN RÁPIDO PARA REGISTRAR VENTA */}
      <button
        onClick={alIrARegistrar}
        className="w-full bg-neutral-950 hover:bg-black text-white rounded-2xl p-4 flex items-center justify-center gap-3 font-bold text-sm sm:text-base shadow-sm border border-neutral-800 active:scale-[0.98] transition-all"
      >
        <PlusCircle size={20} className="text-purple-400" />
        <span>Registrar Nueva Venta Ahora</span>
      </button>

      {/* SECCIÓN DE GRÁFICOS INTELIGENTES */}
      <div>
        <div className="mb-2">
          <h3 className="font-bold text-neutral-800 text-sm">Análisis Gráfico Inteligente</h3>
          <p className="text-xs text-neutral-500">Visualización de comportamiento y tendencias para Mayeli</p>
        </div>
        <SmartCharts ventas={ventasFiltradas.length > 0 ? ventasFiltradas : ventas} />
      </div>
    </div>
  );
};
