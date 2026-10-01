/**
 * @file SmartCharts.tsx
 * @description Gráficos y métricas visuales adaptados a los 6 requisitos de accesibilidad:
 * 1. Ancho desde 320px sin zoom ni desborde.
 * 2. Alto contraste para leer bajo la luz del sol; tipografía de 16px o más.
 * 3. Etiquetas claras y descriptivas.
 * 4. Sin botones principales conflictivos (solo visualización táctil secundaria).
 * 5. Estado vacío explicativo con invitación a la acción cuando no hay datos.
 */

import React, { useState } from 'react';
import { Venta } from '../types';
import { formatearMoneda } from '../utils/storage';
import { TrendingUp, Banknote, Award, Clock, ShoppingCart } from 'lucide-react';

interface SmartChartsProps {
  ventas: Venta[];
  alIrAVender?: () => void;
}

export const SmartCharts: React.FC<SmartChartsProps> = ({ ventas, alIrAVender }) => {
  const [puntoSeleccionado, setPuntoSeleccionado] = useState<{
    etiqueta: string;
    total: number;
    cantidad: number;
  } | null>(null);

  const ventasActivas = ventas.filter(v => v.estado !== 'anulada');

  // ESTADO VACÍO (REQUISITO 5)
  if (ventasActivas.length === 0) {
    return (
      <div className="bg-white rounded-3xl p-6 border-2 border-neutral-900 text-center space-y-4 shadow-sm my-4">
        <div className="w-16 h-16 bg-purple-100 text-purple-900 rounded-full flex items-center justify-center mx-auto border-2 border-neutral-900">
          <ShoppingCart size={32} />
        </div>
        <div className="space-y-2">
          <h3 className="text-xl font-black text-neutral-950">
            Aún no hay ventas registradas
          </h3>
          <p className="text-base text-neutral-800 leading-relaxed font-medium max-w-sm mx-auto">
            Cuando anotes la primera comida del día, aquí vas a ver tus gráficos automáticos de ganancias, platos favoritos y horarios con más clientes.
          </p>
        </div>
        {alIrAVender && (
          <button
            type="button"
            onClick={alIrAVender}
            className="w-full py-4 px-6 bg-purple-700 hover:bg-purple-800 text-white font-extrabold text-base rounded-2xl border-2 border-neutral-950 shadow-md active:scale-95 transition-all"
          >
            Registrar mi primera venta ahora
          </button>
        )}
      </div>
    );
  }

  // 1. Tendencia de los últimos 7 días
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
  const granTotalVentas = ventasActivas.reduce((acc, curr) => acc + curr.total, 0) || 0;

  // 2. Ranking de platos más pedidos
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

  // 3. Franjas Horarias
  const turnos = {
    manana: { label: 'Mañana (8 a 12 hs)', count: 0, total: 0, emoji: '🌅' },
    almuerzo: { label: 'Almuerzo (12 a 16 hs)', count: 0, total: 0, emoji: '🍲' },
    merienda: { label: 'Tarde (16 a 20 hs)', count: 0, total: 0, emoji: '☕' },
    cena: { label: 'Noche (20 a 24 hs)', count: 0, total: 0, emoji: '🌙' },
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
      {/* GRÁFICO 1: TENDENCIA DIARIA (ALTO CONTRASTE Y TEXTO >= 16PX) */}
      <section className="bg-white rounded-3xl p-5 border-2 border-neutral-900 shadow-sm space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-neutral-950 text-white flex items-center justify-center shrink-0">
              <TrendingUp size={24} />
            </div>
            <div>
              <h3 className="font-black text-neutral-950 text-lg leading-tight">
                Ventas de los últimos 7 días
              </h3>
              <p className="text-base text-neutral-800 font-medium">
                Tocá una barra con el dedo para ver el total
              </p>
            </div>
          </div>
          {puntoSeleccionado && (
            <button
              type="button"
              onClick={() => setPuntoSeleccionado(null)}
              className="py-2 px-3 bg-neutral-100 hover:bg-neutral-200 text-neutral-950 text-base font-bold rounded-xl border border-neutral-400"
            >
              Ocultar detalle
            </button>
          )}
        </div>

        {puntoSeleccionado && (
          <div className="bg-neutral-950 text-white rounded-2xl p-4 border-2 border-purple-500 space-y-1">
            <span className="text-base text-purple-300 font-bold block">{puntoSeleccionado.etiqueta}</span>
            <div className="flex justify-between items-baseline flex-wrap gap-1">
              <span className="text-base text-neutral-200 font-medium">
                {puntoSeleccionado.cantidad} {puntoSeleccionado.cantidad === 1 ? 'comida cobrada' : 'comidas cobradas'}
              </span>
              <span className="text-2xl font-black text-white">
                {formatearMoneda(puntoSeleccionado.total)}
              </span>
            </div>
          </div>
        )}

        {/* Barras verticales representadas en HTML con alto contraste y soporte de 320px */}
        <div className="pt-2">
          <div className="grid grid-cols-7 gap-1.5 items-end h-52 pb-2 border-b-2 border-neutral-900">
            {datosTendencia.map((dato) => {
              const porcentaje = Math.round((dato.total / maxVentaDia) * 100);
              const estaSeleccionado = puntoSeleccionado?.etiqueta === dato.etiqueta;

              return (
                <button
                  type="button"
                  key={dato.clave}
                  onClick={() => setPuntoSeleccionado(dato)}
                  className="flex flex-col items-center justify-end h-full group focus:outline-none"
                  title={`${dato.etiqueta}: ${formatearMoneda(dato.total)}`}
                >
                  <span className="text-base font-extrabold text-neutral-950 mb-1 leading-none">
                    {dato.total > 0 ? `$${dato.total}` : ''}
                  </span>
                  <div
                    style={{ height: `${Math.max(porcentaje, 8)}%` }}
                    className={`w-full max-w-[36px] rounded-t-xl transition-all ${
                      estaSeleccionado
                        ? 'bg-neutral-950 ring-4 ring-purple-600'
                        : dato.total > 0
                          ? 'bg-purple-700 hover:bg-purple-800'
                          : 'bg-neutral-300'
                    }`}
                  />
                </button>
              );
            })}
          </div>

          {/* Días en texto >= 16px */}
          <div className="grid grid-cols-7 gap-1.5 pt-2 text-center">
            {datosTendencia.map((dato) => {
              const estaSeleccionado = puntoSeleccionado?.etiqueta === dato.etiqueta;
              return (
                <span
                  key={dato.clave}
                  className={`text-base block truncate font-black ${
                    estaSeleccionado ? 'text-purple-900 underline' : 'text-neutral-950'
                  }`}
                >
                  {dato.etiqueta.split(' ')[0]}
                </span>
              );
            })}
          </div>
        </div>
      </section>

      {/* GRÁFICO 2: COBRO EN EFECTIVO */}
      <section className="bg-white rounded-3xl p-5 border-2 border-neutral-900 shadow-sm space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-neutral-950 text-white flex items-center justify-center shrink-0">
            <Banknote size={24} />
          </div>
          <div>
            <h3 className="font-black text-neutral-950 text-lg leading-tight">
              Efectivo cobrado en mano
            </h3>
            <p className="text-base text-neutral-800 font-medium">
              Dinero disponible en la caja física
            </p>
          </div>
        </div>

        <div className="bg-neutral-950 text-white rounded-2xl p-4 border border-neutral-900 flex flex-col sm:flex-row justify-between sm:items-center gap-2">
          <div>
            <span className="text-base text-neutral-300 font-bold block">Total en caja hoy</span>
            <span className="text-3xl font-black text-purple-300">{formatearMoneda(granTotalVentas)}</span>
          </div>
          <span className="text-base font-extrabold bg-purple-800 text-white px-3 py-1.5 rounded-xl border border-purple-500 self-start sm:self-center">
            {ventasActivas.length} cobros en efectivo
          </span>
        </div>
      </section>

      {/* GRÁFICO 3: PLATOS ESTRELLA */}
      <section className="bg-white rounded-3xl p-5 border-2 border-neutral-900 shadow-sm space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-900 border border-neutral-900 flex items-center justify-center shrink-0">
            <Award size={24} />
          </div>
          <div>
            <h3 className="font-black text-neutral-950 text-lg leading-tight">
              Comidas más vendidas
            </h3>
            <p className="text-base text-neutral-800 font-medium">
              Los platos preferidos de los vecinos
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {rankingPlatos.map((plato, idx) => {
            const porcentaje = Math.round((plato.unidades / maxUnidades) * 100);
            return (
              <div key={plato.nombre} className="space-y-1.5">
                <div className="flex justify-between items-baseline flex-wrap gap-1">
                  <span className="text-base font-black text-neutral-950">
                    #{idx + 1} {plato.nombre}
                  </span>
                  <span className="text-base font-black text-purple-900">
                    {plato.unidades} vendidos • {formatearMoneda(plato.recaudado)}
                  </span>
                </div>
                <div className="w-full bg-neutral-200 rounded-full h-4 overflow-hidden border border-neutral-400">
                  <div
                    style={{ width: `${porcentaje}%` }}
                    className="bg-purple-700 h-full rounded-full transition-all duration-300"
                  />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* GRÁFICO 4: HORARIOS DE MÁS TRABAJO */}
      <section className="bg-white rounded-3xl p-5 border-2 border-neutral-900 shadow-sm space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-neutral-950 text-white flex items-center justify-center shrink-0">
            <Clock size={24} />
          </div>
          <div>
            <h3 className="font-black text-neutral-950 text-lg leading-tight">
              Horarios con más gente
            </h3>
            <p className="text-base text-neutral-800 font-medium">
              Movimiento de ventas por momento del día
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          {Object.entries(turnos).map(([clave, t]) => (
            <div
              key={clave}
              className="p-4 bg-neutral-50 rounded-2xl border-2 border-neutral-900 flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <span className="text-3xl">{t.emoji}</span>
                <div>
                  <span className="text-base font-bold text-neutral-950 block">{t.label}</span>
                  <span className="text-base text-neutral-800 font-medium">{t.count} pedidos</span>
                </div>
              </div>
              <span className="text-lg font-black text-purple-900">{formatearMoneda(t.total)}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
