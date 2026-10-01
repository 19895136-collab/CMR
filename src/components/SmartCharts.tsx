/**
 * @file SmartCharts.tsx
 * @description Componentes de visualización y gráficos inteligentes interactivos.
 * Diseñados 100% en SVG responsivo sin librerías pesadas ni de pago.
 * Paleta adaptada: Morado y Negro. Cobro exclusivo en efectivo.
 * 
 * ATENCIÓN - PUNTOS DONDE ALGUIEN SUELE EQUIVOCARSE:
 * 1. División por cero en escalas SVG: Si el valor máximo calculado es 0 (ej. no hay ventas en el día),
 *    la fórmula `altura / max` produce Infinity o NaN, rompiendo los atributos SVG de los navegadores.
 *    Siempre asegurar: `const maximoSeguro = Math.max(maximoReal, 1);`
 * 2. Posicionamiento de Tooltips en pantallas táctiles de celulares:
 *    Los eventos 'hover' no existen en celulares táctiles. Se debe implementar 'onClick' o 'onTouchStart'
 *    para fijar el tooltip seleccionado y permitir deseleccionarlo al tocar de nuevo.
 * 3. Agrupación por días: Si se agrupan fechas usando cadenas arbitrarias,
 *    el orden puede invertirse. Siempre ordenar cronológicamente por timestamp.
 */

import React, { useState } from 'react';
import { Venta } from '../types';
import { formatearMoneda } from '../utils/storage';
import { TrendingUp, Banknote, Award, Clock } from 'lucide-react';

interface SmartChartsProps {
  ventas: Venta[];
}

export const SmartCharts: React.FC<SmartChartsProps> = ({ ventas }) => {
  const [puntoSeleccionado, setPuntoSeleccionado] = useState<{
    etiqueta: string;
    total: number;
    cantidad: number;
  } | null>(null);

  const ventasActivas = ventas.filter(v => v.estado !== 'anulada');

  // Construir mapa de los últimos 7 días
  const diasMap = new Map<string, { total: number; cantidad: number; fechaObj: Date; etiquetaCorta: string }>();
  
  const hoy = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(hoy);
    d.setDate(d.getDate() - i);
    const clave = d.toISOString().slice(0, 10);
    const nombresDias = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const etiquetaCorta = `${nombresDias[d.getDay()]} ${d.getDate()}`;
    diasMap.set(clave, { total: 0, cantidad: 0, fechaObj: d, etiquetaCorta });
  }

  ventasActivas.forEach(v => {
    const clave = v.fecha.slice(0, 10);
    if (diasMap.has(clave)) {
      const entrada = diasMap.get(clave)!;
      entrada.total += v.total;
      entrada.cantidad += 1;
    }
  });

  const datosTendencia = Array.from(diasMap.entries()).map(([clave, val]) => ({
    clave,
    etiqueta: val.etiquetaCorta,
    total: val.total,
    cantidad: val.cantidad
  }));

  const maxVentaDia = Math.max(...datosTendencia.map(d => d.total), 100);

  // Total efectivo recaudado
  const granTotalVentas = ventasActivas.reduce((acc, curr) => acc + curr.total, 0) || 0;

  // Procesar Top Platos Más Vendidos
  const platosMap = new Map<string, { unidades: number; recaudado: number }>();
  ventasActivas.forEach(v => {
    v.items.forEach(item => {
      const actual = platosMap.get(item.nombre) || { unidades: 0, recaudado: 0 };
      platosMap.set(item.nombre, {
        unidades: actual.unidades + item.cantidad,
        recaudado: actual.recaudado + item.subtotal
      });
    });
  });

  const rankingPlatos = Array.from(platosMap.entries())
    .map(([nombre, stats]) => ({ nombre, ...stats }))
    .sort((a, b) => b.unidades - a.unidades)
    .slice(0, 5);

  const maxUnidades = Math.max(...rankingPlatos.map(p => p.unidades), 1);

  // Franjas Horarias
  const turnos = {
    manana: { label: 'Mañana (8 - 12hs)', count: 0, total: 0, emoji: '🌅' },
    almuerzo: { label: 'Almuerzo (12 - 16hs)', count: 0, total: 0, emoji: '🍲' },
    merienda: { label: 'Tarde (16 - 20hs)', count: 0, total: 0, emoji: '☕' },
    cena: { label: 'Cena / Noche (20 - 24hs)', count: 0, total: 0, emoji: '🌙' },
  };

  ventasActivas.forEach(v => {
    const hora = new Date(v.fecha).getHours();
    if (hora >= 8 && hora < 12) {
      turnos.manana.count++;
      turnos.manana.total += v.total;
    } else if (hora >= 12 && hora < 16) {
      turnos.almuerzo.count++;
      turnos.almuerzo.total += v.total;
    } else if (hora >= 16 && hora < 20) {
      turnos.merienda.count++;
      turnos.merienda.total += v.total;
    } else {
      turnos.cena.count++;
      turnos.cena.total += v.total;
    }
  });

  return (
    <div className="space-y-6">
      {/* GRÁFICO 1: TENDENCIA DIARIA DE VENTAS EN MORADO Y NEGRO */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-sm border border-neutral-200">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center">
              <TrendingUp size={18} />
            </div>
            <div>
              <h3 className="font-bold text-neutral-900 text-base">Tendencia de Ventas (7 días)</h3>
              <p className="text-xs text-neutral-500">Toca cualquier barra para ver el detalle</p>
            </div>
          </div>
          {puntoSeleccionado && (
            <button
              onClick={() => setPuntoSeleccionado(null)}
              className="text-xs text-purple-700 bg-purple-50 hover:bg-purple-100 px-2 py-1 rounded font-medium"
            >
              Cerrar detalle
            </button>
          )}
        </div>

        {puntoSeleccionado ? (
          <div className="bg-gradient-to-r from-neutral-950 to-purple-950 border border-purple-900 rounded-xl p-3 my-3 flex items-center justify-between text-xs sm:text-sm text-white animate-fadeIn">
            <div>
              <span className="font-bold text-purple-200 block">{puntoSeleccionado.etiqueta}</span>
              <span className="text-neutral-300">{puntoSeleccionado.cantidad} {puntoSeleccionado.cantidad === 1 ? 'pedido atendido' : 'pedidos atendidos'}</span>
            </div>
            <div className="text-right">
              <span className="text-xs text-neutral-400 block">Total en Caja</span>
              <span className="font-extrabold text-white text-base">{formatearMoneda(puntoSeleccionado.total)}</span>
            </div>
          </div>
        ) : (
          <div className="h-2 my-1" />
        )}

        <div className="w-full h-48 sm:h-56 mt-2 relative">
          <svg className="w-full h-full overflow-visible" viewBox="0 0 350 160" preserveAspectRatio="none">
            <line x1="0" y1="20" x2="350" y2="20" stroke="#f5f5f5" strokeDasharray="3 3" strokeWidth="1" />
            <line x1="0" y1="60" x2="350" y2="60" stroke="#f5f5f5" strokeDasharray="3 3" strokeWidth="1" />
            <line x1="0" y1="100" x2="350" y2="100" stroke="#f5f5f5" strokeDasharray="3 3" strokeWidth="1" />
            <line x1="0" y1="135" x2="350" y2="135" stroke="#e5e5e5" strokeWidth="1.5" />

            {datosTendencia.map((dato, index) => {
              const anchoBarra = 24;
              const espaciado = 350 / datosTendencia.length;
              const xCentro = espaciado * index + espaciado / 2;
              const xInicio = xCentro - anchoBarra / 2;
              const alturaBarra = Math.round((dato.total / maxVentaDia) * 105);
              const yInicio = 135 - (alturaBarra > 0 ? alturaBarra : 3);
              const estaSeleccionado = puntoSeleccionado?.etiqueta === dato.etiqueta;

              return (
                <g
                  key={dato.clave}
                  className="cursor-pointer transition-all duration-200"
                  onClick={() => setPuntoSeleccionado(dato)}
                >
                  <rect
                    x={xInicio - 8}
                    y={10}
                    width={anchoBarra + 16}
                    height={130}
                    fill="transparent"
                  />
                  <rect
                    x={xInicio}
                    y={yInicio}
                    width={anchoBarra}
                    height={alturaBarra > 0 ? alturaBarra : 3}
                    rx="6"
                    className={`transition-colors duration-200 ${
                      estaSeleccionado 
                        ? 'fill-neutral-950' 
                        : dato.total > 0 
                          ? 'fill-purple-600 hover:fill-purple-700' 
                          : 'fill-neutral-200'
                    }`}
                  />
                  {dato.total > 0 && (
                    <text
                      x={xCentro}
                      y={Math.max(yInicio - 5, 14)}
                      textAnchor="middle"
                      className="text-[9px] fill-neutral-700 font-semibold"
                    >
                      ${dato.total}
                    </text>
                  )}
                  <text
                    x={xCentro}
                    y="152"
                    textAnchor="middle"
                    className={`text-[10px] ${estaSeleccionado ? 'fill-purple-700 font-bold' : 'fill-neutral-500 font-medium'}`}
                  >
                    {dato.etiqueta.split(' ')[0]}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      </div>

      {/* GRÁFICO 2: FLUJO DE EFECTIVO EN CAJA (100% EFECTIVO) */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-sm border border-neutral-200">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-neutral-950 text-purple-400 flex items-center justify-center">
              <Banknote size={18} />
            </div>
            <div>
              <h3 className="font-bold text-neutral-900 text-base">Cobros en Caja</h3>
              <p className="text-xs text-neutral-500">100% en Efectivo directo</p>
            </div>
          </div>
          <span className="text-[11px] font-bold bg-purple-100 text-purple-800 px-2.5 py-1 rounded-full">
            Efectivo Único
          </span>
        </div>

        <div className="w-full h-3 bg-neutral-100 rounded-full overflow-hidden my-3">
          <div className="bg-purple-600 h-full w-full rounded-full" />
        </div>

        <div className="bg-neutral-950 text-white rounded-xl p-3.5 flex items-center justify-between">
          <div>
            <span className="text-xs text-neutral-400 block font-medium">Total Efectivo Físico</span>
            <span className="text-lg font-black text-purple-300">{formatearMoneda(granTotalVentas)}</span>
          </div>
          <div className="text-right">
            <span className="text-xs text-neutral-400 block font-medium">Transacciones</span>
            <span className="text-sm font-bold text-white">{ventasActivas.length} cobros</span>
          </div>
        </div>
      </div>

      {/* GRÁFICO 3: RANKING DE PLATOS MÁS VENDIDOS */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-sm border border-neutral-200">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center">
            <Award size={18} />
          </div>
          <div>
            <h3 className="font-bold text-neutral-900 text-base">Platos Estrella de Mayeli</h3>
            <p className="text-xs text-neutral-500">Los platos más pedidos por los vecinos del barrio</p>
          </div>
        </div>

        {rankingPlatos.length === 0 ? (
          <p className="text-neutral-400 text-xs py-4 text-center">Aún no hay platos registrados en las ventas.</p>
        ) : (
          <div className="space-y-3 mt-2">
            {rankingPlatos.map((plato, index) => {
              const porcentajeBarra = Math.round((plato.unidades / maxUnidades) * 100);
              const insignias = ['🥇 1°', '🥈 2°', '🥉 3°', '4°', '5°'];
              
              return (
                <div key={plato.nombre} className="space-y-1">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-semibold text-neutral-800 flex items-center gap-1.5 truncate max-w-[210px] sm:max-w-none">
                      <span className="text-[11px] font-bold text-purple-900 bg-purple-100 px-1.5 py-0.5 rounded">
                        {insignias[index]}
                      </span>
                      {plato.nombre}
                    </span>
                    <span className="font-bold text-neutral-900 ml-2 whitespace-nowrap">
                      {plato.unidades} {plato.unidades === 1 ? 'vendido' : 'vendidos'} • <span className="text-purple-700">{formatearMoneda(plato.recaudado)}</span>
                    </span>
                  </div>

                  <div className="w-full bg-neutral-100 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-purple-600 h-full rounded-full transition-all duration-500"
                      style={{ width: `${porcentajeBarra}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* GRÁFICO 4: HORARIOS PICO */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-sm border border-neutral-200">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-lg bg-neutral-950 text-purple-400 flex items-center justify-center">
            <Clock size={18} />
          </div>
          <div>
            <h3 className="font-bold text-neutral-900 text-base">Horarios con más movimiento</h3>
            <p className="text-xs text-neutral-500">¿A qué hora se llena el local de Mayeli?</p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {Object.entries(turnos).map(([clave, turno]) => (
            <div key={clave} className="bg-neutral-50 border border-neutral-200/80 rounded-xl p-3 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xl">{turno.emoji}</span>
                <span className="text-[11px] font-bold px-1.5 py-0.5 rounded bg-neutral-200 text-neutral-800">
                  {turno.count} {turno.count === 1 ? 'venta' : 'ventas'}
                </span>
              </div>
              <div>
                <span className="text-[11px] font-medium text-neutral-500 block truncate">{turno.label}</span>
                <span className="text-sm font-extrabold text-neutral-900 block mt-0.5">{formatearMoneda(turno.total)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
