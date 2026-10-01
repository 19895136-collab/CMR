/**
 * @file ResumenVentas.tsx
 * @description Pantalla de Resumen de Ventas adaptada a las 6 reglas de diseño:
 * - Compatible con pantallas desde 320px y uso a una mano.
 * - Texto nunca menor a 16px (text-base) y alto contraste para leer bajo la luz solar.
 * - Etiquetas visibles.
 * - Un solo botón principal destacado ("Registrar Venta Ahora"); los demás son secundarios.
 * - Estado vacío con invitación cálida cuando no hay ventas.
 */

import React, { useState } from 'react';
import { Venta, PeriodoFiltro } from '../types';
import { formatearMoneda } from '../utils/storage';
import { SmartCharts } from './SmartCharts';
import { DollarSign, Utensils, Calendar, PlusCircle, ShoppingCart } from 'lucide-react';

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

  // Plato estrella
  const contadorPlatos: { [nombre: string]: number } = {};
  ventasFiltradas.forEach(v => {
    v.items.forEach(item => {
      contadorPlatos[item.nombre] = (contadorPlatos[item.nombre] || 0) + item.cantidad;
    });
  });

  let platoEstrella = 'Aún sin platos';
  let maxPlatoCantidad = 0;
  for (const [nombre, cant] of Object.entries(contadorPlatos)) {
    if (cant > maxPlatoCantidad) {
      maxPlatoCantidad = cant;
      platoEstrella = `${nombre} (${cant} u.)`;
    }
  }

  return (
    <div className="space-y-6 pb-28">
      {/* 4. UN SOLO BOTÓN PRINCIPAL DESTACADO POR PANTALLA */}
      <button
        type="button"
        onClick={alIrARegistrar}
        className="w-full min-h-[56px] bg-purple-700 hover:bg-purple-800 active:bg-purple-900 text-white rounded-2xl p-4 flex items-center justify-center gap-3 font-black text-lg border-2 border-neutral-950 shadow-lg active:scale-98 transition-all"
      >
        <PlusCircle size={24} className="text-white shrink-0" />
        <span>Registrar Nueva Venta Ahora</span>
      </button>

      {/* 3. ETIQUETA VISIBLE PARA EL FILTRO DE TIEMPO */}
      <div className="bg-white p-4 rounded-3xl border-2 border-neutral-900 shadow-sm space-y-2">
        <label className="text-base font-black text-neutral-950 flex items-center gap-2">
          <Calendar size={18} className="text-purple-700" />
          <span>Elegí el período para ver tus números:</span>
        </label>

        {/* Botones secundarios de filtro (mínimo 44px de alto para uso con una sola mano) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
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
                type="button"
                key={p}
                onClick={() => setPeriodo(p)}
                className={`min-h-[48px] py-2 px-3 rounded-xl text-base font-black transition-all border-2 text-center flex items-center justify-center ${
                  activo
                    ? 'bg-neutral-950 text-white border-neutral-950 shadow-sm'
                    : 'bg-neutral-100 text-neutral-900 border-neutral-300 hover:bg-neutral-200'
                }`}
              >
                {etiquetas[p]}
              </button>
            );
          })}
        </div>
      </div>

      {/* 5. ESTADO VACÍO CUANDO NO HAY VENTAS EN EL PERÍODO */}
      {ventasFiltradas.length === 0 ? (
        <div className="bg-white rounded-3xl p-6 border-2 border-neutral-900 text-center space-y-3 shadow-sm">
          <div className="w-14 h-14 bg-purple-100 text-purple-900 rounded-full flex items-center justify-center mx-auto border-2 border-neutral-900">
            <ShoppingCart size={28} />
          </div>
          <h3 className="text-xl font-black text-neutral-950">
            {periodo === 'hoy'
              ? 'Todavía no anotaste ventas hoy'
              : 'No hay ventas en este período'}
          </h3>
          <p className="text-base text-neutral-800 font-medium leading-relaxed max-w-sm mx-auto">
            Empezá tu día tocando el botón morado de arriba para sumar tu primer plato vendido.
          </p>
        </div>
      ) : (
        <>
          {/* TARJETA DESTACADA: TOTAL VENDIDO (ALTO CONTRASTE PARA LEER AL SOL) */}
          <div className="bg-neutral-950 text-white rounded-3xl p-5 border-2 border-purple-600 shadow-xl space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-base font-bold text-purple-300">
                Total cobrado en efectivo
              </span>
              <span className="text-base font-extrabold bg-purple-900 text-white px-3 py-1 rounded-xl border border-purple-500">
                {periodo === 'hoy' ? 'Hoy' : periodo === '7dias' ? '7 Días' : periodo === 'mes' ? 'Este Mes' : 'Histórico'}
              </span>
            </div>

            <div>
              <div className="text-4xl sm:text-5xl font-black text-white tracking-tight">
                {formatearMoneda(totalRecaudado)}
              </div>
              <p className="text-base text-neutral-300 font-bold mt-1">
                {totalPedidos} {totalPedidos === 1 ? 'comida cobrada' : 'comidas cobradas'} en mano
              </p>
            </div>
          </div>

          {/* INDICADORES SECUNDARIOS (PROMEDIO Y PLATO ESTRELLA) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="bg-white p-5 rounded-3xl border-2 border-neutral-900 shadow-sm flex items-start gap-3">
              <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-900 flex items-center justify-center shrink-0 border border-neutral-900">
                <DollarSign size={24} />
              </div>
              <div>
                <span className="text-base font-bold text-neutral-700 block">Promedio por pedido</span>
                <span className="text-2xl font-black text-neutral-950 block">
                  {formatearMoneda(ticketPromedio)}
                </span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-3xl border-2 border-neutral-900 shadow-sm flex items-start gap-3">
              <div className="w-12 h-12 rounded-2xl bg-neutral-950 text-white flex items-center justify-center shrink-0">
                <Utensils size={24} />
              </div>
              <div>
                <span className="text-base font-bold text-neutral-700 block">Plato preferido</span>
                <span className="text-xl font-black text-neutral-950 block truncate">
                  {platoEstrella}
                </span>
              </div>
            </div>
          </div>
        </>
      )}

      {/* SECCIÓN DE GRÁFICOS INTELIGENTES */}
      <div>
        <h3 className="font-black text-neutral-950 text-lg mb-2">
          Gráficos automáticos del negocio
        </h3>
        <SmartCharts
          ventas={ventasFiltradas.length > 0 ? ventasFiltradas : ventas}
          alIrAVender={alIrARegistrar}
        />
      </div>
    </div>
  );
};
