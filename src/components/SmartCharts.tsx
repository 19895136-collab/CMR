/**
 * @file SmartCharts.tsx
 * @description Componentes de visualización y gráficos inteligentes interactivos.
 * Diseñados 100% en SVG responsivo sin librerías pesadas ni de pago.
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
import { TrendingUp, PieChart, Award, Clock } from 'lucide-react';

interface SmartChartsProps {
  ventas: Venta[];
}

export const SmartCharts: React.FC<SmartChartsProps> = ({ ventas }) => {
  // Estado para la barra seleccionada en el gráfico interactivo de tendencia
  const [puntoSeleccionado, setPuntoSeleccionado] = useState<{
    etiqueta: string;
    total: number;
    cantidad: number;
  } | null>(null);

  // 1. Procesar datos para la tendencia diaria (últimos 7 días con actividad o ventas)
  const ventasActivas = ventas.filter(v => v.estado !== 'anulada');

  // Construir mapa de los últimos 7 días
  const diasMap = new Map<string, { total: number; cantidad: number; fechaObj: Date; etiquetaCorta: string }>();
  
  // Generar claves para los últimos 7 días correlativos
  const hoy = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(hoy);
    d.setDate(d.getDate() - i);
    const clave = d.toISOString().slice(0, 10);
    const nombresDias = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const etiquetaCorta = `${nombresDias[d.getDay()]} ${d.getDate()}`;
    diasMap.set(clave, { total: 0, cantidad: 0, fechaObj: d, etiquetaCorta });
  }

  // Acumular ventas en los días correspondientes
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

  // Calcular valor máximo para la escala (evitando división por cero)
  const maxVentaDia = Math.max(...datosTendencia.map(d => d.total), 100);

  // 2. Procesar Métodos de Pago
  const metodosTotales = {
    efectivo: { total: 0, count: 0, label: 'Efectivo', color: 'bg-emerald-500', fill: '#10b981' },
    transferencia: { total: 0, count: 0, label: 'Transferencia / QR', color: 'bg-blue-500', fill: '#3b82f6' },
    tarjeta: { total: 0, count: 0, label: 'Tarjeta Débito/Crédito', color: 'bg-purple-500', fill: '#a855f7' }
  };

  ventasActivas.forEach(v => {
    if (metodosTotales[v.metodoPago]) {
      metodosTotales[v.metodoPago].total += v.total;
      metodosTotales[v.metodoPago].count += 1;
    }
  });

  const granTotalVentas = ventasActivas.reduce((acc, curr) => acc + curr.total, 0) || 1;

  // 3. Procesar Top Platos Más Vendidos
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

  // 4. Procesar Franjas Horarias (Almuerzo vs Tarde vs Noche)
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
      {/* GRÁFICO 1: TENDENCIA DIARIA DE VENTAS */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-sm border border-stone-200">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center">
              <TrendingUp size={18} />
            </div>
            <div>
              <h3 className="font-bold text-stone-900 text-base">Tendencia de Ventas (7 días)</h3>
              <p className="text-xs text-stone-500">Toca cualquier barra para ver el detalle</p>
            </div>
          </div>
          {puntoSeleccionado && (
            <button
              onClick={() => setPuntoSeleccionado(null)}
              className="text-xs text-orange-600 bg-orange-50 hover:bg-orange-100 px-2 py-1 rounded font-medium"
            >
              Cerrar detalle
            </button>
          )}
        </div>

        {/* Banner de información al tocar una barra en el celular */}
        {puntoSeleccionado ? (
          <div className="bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 rounded-xl p-3 my-3 flex items-center justify-between text-xs sm:text-sm animate-fadeIn">
            <div>
              <span className="font-bold text-orange-950 block">{puntoSeleccionado.etiqueta}</span>
              <span className="text-orange-700">{puntoSeleccionado.cantidad} {puntoSeleccionado.cantidad === 1 ? 'pedido atendido' : 'pedidos atendidos'}</span>
            </div>
            <div className="text-right">
              <span className="text-xs text-stone-500 block">Total Vendido</span>
              <span className="font-extrabold text-orange-900 text-base">{formatearMoneda(puntoSeleccionado.total)}</span>
            </div>
          </div>
        ) : (
          <div className="h-2 my-1" />
        )}

        {/* Lienzo SVG interactivo optimizado para móviles */}
        <div className="w-full h-48 sm:h-56 mt-2 relative">
          <svg className="w-full h-full overflow-visible" viewBox="0 0 350 160" preserveAspectRatio="none">
            {/* Líneas de guía horizontales */}
            <line x1="0" y1="20" x2="350" y2="20" stroke="#f1f5f9" strokeDasharray="3 3" strokeWidth="1" />
            <line x1="0" y1="60" x2="350" y2="60" stroke="#f1f5f9" strokeDasharray="3 3" strokeWidth="1" />
            <line x1="0" y1="100" x2="350" y2="100" stroke="#f1f5f9" strokeDasharray="3 3" strokeWidth="1" />
            <line x1="0" y1="135" x2="350" y2="135" stroke="#e2e8f0" strokeWidth="1.5" />

            {/* Barras de ventas */}
            {datosTendencia.map((dato, index) => {
              const anchoBarra = 24;
              const espaciado = 350 / datosTendencia.length;
              const xCentro = espaciado * index + espaciado / 2;
              const xInicio = xCentro - anchoBarra / 2;
              
              // Altura máxima proporcional: 110px de altura disponible
              const alturaBarra = Math.round((dato.total / maxVentaDia) * 105);
              const yInicio = 135 - (alturaBarra > 0 ? alturaBarra : 3);
              const estaSeleccionado = puntoSeleccionado?.etiqueta === dato.etiqueta;

              return (
                <g
                  key={dato.clave}
                  className="cursor-pointer transition-all duration-200"
                  onClick={() => setPuntoSeleccionado(dato)}
                >
                  {/* Área táctil extendida para dedos en celulares */}
                  <rect
                    x={xInicio - 8}
                    y={10}
                    width={anchoBarra + 16}
                    height={130}
                    fill="transparent"
                  />

                  {/* Barra visual con esquinas redondeadas superiores */}
                  <rect
                    x={xInicio}
                    y={yInicio}
                    width={anchoBarra}
                    height={alturaBarra > 0 ? alturaBarra : 3}
                    rx="6"
                    className={`transition-colors duration-200 ${
                      estaSeleccionado 
                        ? 'fill-orange-600' 
                        : dato.total > 0 
                          ? 'fill-amber-500 hover:fill-amber-600' 
                          : 'fill-stone-200'
                    }`}
                  />

                  {/* Valor en la punta si hay venta */}
                  {dato.total > 0 && (
                    <text
                      x={xCentro}
                      y={Math.max(yInicio - 5, 14)}
                      textAnchor="middle"
                      className="text-[9px] fill-stone-600 font-semibold"
                    >
                      ${dato.total}
                    </text>
                  )}

                  {/* Etiqueta del día en el eje X */}
                  <text
                    x={xCentro}
                    y="152"
                    textAnchor="middle"
                    className={`text-[10px] ${estaSeleccionado ? 'fill-orange-600 font-bold' : 'fill-stone-500 font-medium'}`}
                  >
                    {dato.etiqueta.split(' ')[0]}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      </div>

      {/* GRÁFICO 2: DISTRIBUCIÓN POR MÉTODO DE PAGO */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-sm border border-stone-200">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center">
            <PieChart size={18} />
          </div>
          <div>
            <h3 className="font-bold text-stone-900 text-base">¿Cómo te pagan tus clientes?</h3>
            <p className="text-xs text-stone-500">Distribución de ingresos por método</p>
          </div>
        </div>

        {/* Barra de progreso multicolor segmentada */}
        <div className="w-full h-4 bg-stone-100 rounded-full overflow-hidden flex my-3">
          {Object.entries(metodosTotales).map(([clave, m]) => {
            const porcentaje = Math.round((m.total / granTotalVentas) * 100);
            if (porcentaje === 0) return null;
            return (
              <div
                key={clave}
                style={{ width: `${porcentaje}%` }}
                className={`${m.color} h-full transition-all duration-500 relative group`}
                title={`${m.label}: ${porcentaje}%`}
              />
            );
          })}
        </div>

        {/* Desglose de cada método con cifras y porcentajes */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mt-4">
          {Object.entries(metodosTotales).map(([clave, m]) => {
            const porcentaje = Math.round((m.total / granTotalVentas) * 100);
            return (
              <div key={clave} className="bg-stone-50 rounded-xl p-3 border border-stone-100 flex items-center justify-between sm:flex-col sm:items-start">
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${m.color}`} />
                  <span className="text-xs font-semibold text-stone-700">{m.label}</span>
                </div>
                <div className="text-right sm:text-left sm:mt-1">
                  <span className="text-sm font-extrabold text-stone-900 block">{formatearMoneda(m.total)}</span>
                  <span className="text-[11px] text-stone-500">{porcentaje}% ({m.count} cobros)</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* GRÁFICO 3: RANKING DE PLATOS MÁS VENDIDOS */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-sm border border-stone-200">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-lg bg-yellow-100 text-yellow-600 flex items-center justify-center">
            <Award size={18} />
          </div>
          <div>
            <h3 className="font-bold text-stone-900 text-base">Platos Estrella de Mayeli</h3>
            <p className="text-xs text-stone-500">Los platos más pedidos por los vecinos del barrio</p>
          </div>
        </div>

        {rankingPlatos.length === 0 ? (
          <p className="text-stone-400 text-xs py-4 text-center">Aún no hay platos registrados en las ventas.</p>
        ) : (
          <div className="space-y-3 mt-2">
            {rankingPlatos.map((plato, index) => {
              const porcentajeBarra = Math.round((plato.unidades / maxUnidades) * 100);
              const insignias = ['🥇 1°', '🥈 2°', '🥉 3°', '4°', '5°'];
              
              return (
                <div key={plato.nombre} className="space-y-1">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-semibold text-stone-800 flex items-center gap-1.5 truncate max-w-[210px] sm:max-w-none">
                      <span className="text-[11px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">
                        {insignias[index]}
                      </span>
                      {plato.nombre}
                    </span>
                    <span className="font-bold text-stone-900 ml-2 whitespace-nowrap">
                      {plato.unidades} {plato.unidades === 1 ? 'vendido' : 'vendidos'} • <span className="text-emerald-600">{formatearMoneda(plato.recaudado)}</span>
                    </span>
                  </div>

                  {/* Barra de progreso visual */}
                  <div className="w-full bg-stone-100 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-amber-500 h-full rounded-full transition-all duration-500"
                      style={{ width: `${porcentajeBarra}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* GRÁFICO 4: HORAS PICO DE VENTAS (ALMUERZO VS CENA) */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-sm border border-stone-200">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center">
            <Clock size={18} />
          </div>
          <div>
            <h3 className="font-bold text-stone-900 text-base">Horarios con más movimiento</h3>
            <p className="text-xs text-stone-500">¿A qué hora se llena el local de Mayeli?</p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {Object.entries(turnos).map(([clave, turno]) => (
            <div key={clave} className="bg-stone-50 border border-stone-200/60 rounded-xl p-3 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xl">{turno.emoji}</span>
                <span className="text-[11px] font-bold px-1.5 py-0.5 rounded bg-stone-200/70 text-stone-700">
                  {turno.count} {turno.count === 1 ? 'venta' : 'ventas'}
                </span>
              </div>
              <div>
                <span className="text-[11px] font-medium text-stone-500 block truncate">{turno.label}</span>
                <span className="text-sm font-extrabold text-stone-900 block mt-0.5">{formatearMoneda(turno.total)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
