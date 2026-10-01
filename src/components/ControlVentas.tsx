/**
 * @file ControlVentas.tsx
 * @description Módulo de control total y registro ágil de ventas para el negocio de comida de Mayeli.
 * Adaptado a: Cobro exclusivo en efectivo y paleta Morado y Negro.
 * 
 * ATENCIÓN - PUNTOS DONDE ALGUIEN SUELE EQUIVOCARSE:
 * 1. Mutación directa de arrays en React: Nunca hacer `items.push(...)` o `items[i].cantidad++`.
 *    Siempre retornar copias usando `.map()` o el operador spread `[...items]`. De lo contrario,
 *    React 19 no detecta el cambio de estado y la interfaz no se actualiza.
 * 2. Cálculo del vuelto / cambio: Al restar números flotantes en JavaScript (ej: 200 - 180.1),
 *    pueden aparecer imprecisiones binarias como 19.89999999999999. Redondear siempre
 *    usando `Math.round((recibido - total) * 100) / 100`.
 * 3. Ventas vacías: Evitar registrar una venta si el total es 0 o no hay ningún plato cargado,
 *    mostrando un mensaje claro para el usuario.
 */

import React, { useState } from 'react';
import { Venta, ItemVenta, ProductoComida } from '../types';
import { formatearMoneda, formatearFecha, formatearHora } from '../utils/storage';
import { TicketModal } from './TicketModal';
import { 
  Plus, Minus, Trash2, Search, CheckCircle2, 
  Banknote, Receipt, AlertCircle, Edit2, RotateCcw, UtensilsCrossed 
} from 'lucide-react';

interface ControlVentasProps {
  ventas: Venta[];
  productos: ProductoComida[];
  onAgregarVenta: (nuevaVenta: Venta) => void;
  onEditarVenta: (ventaEditada: Venta) => void;
  onEliminarVenta: (id: string) => void;
  vistaInicial?: 'registrar' | 'historial';
}

export const ControlVentas: React.FC<ControlVentasProps> = ({
  ventas,
  productos,
  onAgregarVenta,
  onEditarVenta,
  onEliminarVenta,
  vistaInicial = 'registrar'
}) => {
  const [seccion, setSeccion] = useState<'registrar' | 'historial'>(vistaInicial);

  const [itemsActuales, setItemsActuales] = useState<ItemVenta[]>([]);
  // Cobro exclusivo en efectivo
  const metodoPago = 'efectivo';
  const [montoRecibido, setMontoRecibido] = useState<string>('');
  const [nota, setNota] = useState<string>('');
  const [platoPersonalizadoNombre, setPlatoPersonalizadoNombre] = useState('');
  const [platoPersonalizadoPrecio, setPlatoPersonalizadoPrecio] = useState('');
  const [mostrarPlatoLibre, setMostrarPlatoLibre] = useState(false);

  const [ventaEnEdicion, setVentaEnEdicion] = useState<Venta | null>(null);

  const [busqueda, setBusqueda] = useState('');
  const [ventaParaTicket, setVentaParaTicket] = useState<Venta | null>(null);

  const [mensajeExito, setMensajeExito] = useState<string | null>(null);

  const totalActual = itemsActuales.reduce((acc, curr) => acc + curr.subtotal, 0);
  const valorRecibidoNum = parseFloat(montoRecibido) || 0;
  const vueltoCalculado = Math.max(0, Math.round((valorRecibidoNum - totalActual) * 100) / 100);

  const agregarProductoAlTicket = (prod: ProductoComida) => {
    setItemsActuales(prevItems => {
      const existe = prevItems.find(i => i.nombre === prod.nombre);
      if (existe) {
        return prevItems.map(i =>
          i.nombre === prod.nombre
            ? { ...i, cantidad: i.cantidad + 1, subtotal: (i.cantidad + 1) * i.precioUnitario }
            : i
        );
      }
      return [
        ...prevItems,
        {
          id: `item_${Date.now()}_${Math.random()}`,
          nombre: prod.nombre,
          precioUnitario: prod.precio,
          cantidad: 1,
          subtotal: prod.precio
        }
      ];
    });
  };

  const agregarPlatoLibre = (e: React.FormEvent) => {
    e.preventDefault();
    const precio = parseFloat(platoPersonalizadoPrecio);
    if (!platoPersonalizadoNombre.trim() || isNaN(precio) || precio <= 0) return;

    setItemsActuales(prev => [
      ...prev,
      {
        id: `libre_${Date.now()}`,
        nombre: platoPersonalizadoNombre.trim(),
        precioUnitario: precio,
        cantidad: 1,
        subtotal: precio
      }
    ]);

    setPlatoPersonalizadoNombre('');
    setPlatoPersonalizadoPrecio('');
    setMostrarPlatoLibre(false);
  };

  const modificarCantidad = (nombre: string, delta: number) => {
    setItemsActuales(prev => {
      return prev
        .map(item => {
          if (item.nombre === nombre) {
            const nuevaCantidad = item.cantidad + delta;
            return {
              ...item,
              cantidad: nuevaCantidad,
              subtotal: nuevaCantidad * item.precioUnitario
            };
          }
          return item;
        })
        .filter(item => item.cantidad > 0);
    });
  };

  const removerItem = (nombre: string) => {
    setItemsActuales(prev => prev.filter(i => i.nombre !== nombre));
  };

  const limpiarFormulario = () => {
    setItemsActuales([]);
    setMontoRecibido('');
    setNota('');
    setVentaEnEdicion(null);
  };

  const registrarVenta = () => {
    if (itemsActuales.length === 0 || totalActual <= 0) {
      alert('Por favor selecciona al menos un plato o comida para registrar la venta.');
      return;
    }

    if (ventaEnEdicion) {
      const ventaActualizada: Venta = {
        ...ventaEnEdicion,
        items: itemsActuales,
        total: totalActual,
        metodoPago: 'efectivo',
        montoRecibido: valorRecibidoNum > 0 ? valorRecibidoNum : undefined,
        vuelto: valorRecibidoNum >= totalActual ? vueltoCalculado : undefined,
        clienteONota: nota.trim() || undefined
      };

      onEditarVenta(ventaActualizada);
      setMensajeExito(`¡Venta #${ventaEnEdicion.id.slice(-4)} actualizada con éxito!`);
      limpiarFormulario();
      setSeccion('historial');
    } else {
      const nuevaVenta: Venta = {
        id: `v_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        fecha: new Date().toISOString(),
        items: itemsActuales,
        total: totalActual,
        metodoPago: 'efectivo',
        montoRecibido: valorRecibidoNum > 0 ? valorRecibidoNum : undefined,
        vuelto: valorRecibidoNum >= totalActual ? vueltoCalculado : undefined,
        clienteONota: nota.trim() || undefined,
        estado: 'completada',
        creadaEn: Date.now()
      };

      onAgregarVenta(nuevaVenta);
      setMensajeExito(`¡Venta por ${formatearMoneda(totalActual)} en efectivo registrada!`);
      limpiarFormulario();
    }

    setTimeout(() => setMensajeExito(null), 3500);
  };

  const iniciarEdicion = (v: Venta) => {
    setVentaEnEdicion(v);
    setItemsActuales([...v.items]);
    setMontoRecibido(v.montoRecibido ? v.montoRecibido.toString() : '');
    setNota(v.clienteONota || '');
    setSeccion('registrar');
  };

  const ventasFiltradas = ventas.filter(v => {
    if (busqueda.trim()) {
      const q = busqueda.toLowerCase().trim();
      const coincidePlato = v.items.some(i => i.nombre.toLowerCase().includes(q));
      const coincideNota = (v.clienteONota || '').toLowerCase().includes(q);
      const coincideId = v.id.toLowerCase().includes(q);
      return coincidePlato || coincideNota || coincideId;
    }

    return true;
  });

  return (
    <div className="space-y-4 pb-24">
      {/* SELECTOR DE MODO */}
      <div className="flex bg-neutral-200 p-1 rounded-2xl">
        <button
          onClick={() => {
            setSeccion('registrar');
          }}
          className={`flex-1 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-all ${
            seccion === 'registrar'
              ? 'bg-neutral-950 text-white shadow-sm'
              : 'text-neutral-600 hover:text-neutral-900'
          }`}
        >
          <Plus size={16} className="text-purple-400" />
          <span>{ventaEnEdicion ? '✏️ Editando Venta' : 'Registrar Venta'}</span>
        </button>

        <button
          onClick={() => setSeccion('historial')}
          className={`flex-1 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-all ${
            seccion === 'historial'
              ? 'bg-neutral-950 text-white shadow-sm'
              : 'text-neutral-600 hover:text-neutral-900'
          }`}
        >
          <Receipt size={16} className="text-purple-400" />
          <span>Historial & Control ({ventas.length})</span>
        </button>
      </div>

      {mensajeExito && (
        <div className="bg-purple-950 text-white border border-purple-800 font-semibold text-xs sm:text-sm p-3 rounded-2xl shadow-md flex items-center justify-between animate-fadeIn">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={18} className="text-purple-400" />
            <span>{mensajeExito}</span>
          </div>
          <button onClick={() => setMensajeExito(null)} className="text-neutral-400 hover:text-white">
            ✕
          </button>
        </div>
      )}

      {/* REGISTRAR VENTA */}
      {seccion === 'registrar' && (
        <div className="space-y-4">
          {ventaEnEdicion && (
            <div className="bg-purple-50 border border-purple-300 p-3 rounded-2xl flex items-center justify-between text-xs text-purple-950">
              <span className="font-semibold">
                Modificando venta #{ventaEnEdicion.id.slice(-6).toUpperCase()}
              </span>
              <button
                onClick={limpiarFormulario}
                className="text-neutral-500 hover:text-neutral-900 underline font-medium"
              >
                Cancelar edición
              </button>
            </div>
          )}

          <div className="bg-white p-4 rounded-2xl border border-neutral-200 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <UtensilsCrossed size={16} className="text-purple-600" />
                <h3 className="font-bold text-neutral-900 text-sm">Menú de Platos de Mayeli</h3>
              </div>
              <button
                onClick={() => setMostrarPlatoLibre(!mostrarPlatoLibre)}
                className="text-xs text-purple-700 hover:text-purple-900 font-bold bg-purple-50 px-2.5 py-1 rounded-lg"
              >
                {mostrarPlatoLibre ? 'Ocultar' : '+ Plato libre'}
              </button>
            </div>

            {mostrarPlatoLibre && (
              <form onSubmit={agregarPlatoLibre} className="bg-neutral-50 p-3 rounded-xl mb-3 border border-neutral-200 space-y-2">
                <p className="text-xs font-semibold text-neutral-700">Agregar comida con precio personalizado</p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Nombre del plato (ej: Picada)"
                    value={platoPersonalizadoNombre}
                    onChange={e => setPlatoPersonalizadoNombre(e.target.value)}
                    className="flex-1 bg-white border border-neutral-300 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-purple-600"
                  />
                  <input
                    type="number"
                    placeholder="Precio $"
                    value={platoPersonalizadoPrecio}
                    onChange={e => setPlatoPersonalizadoPrecio(e.target.value)}
                    className="w-24 bg-white border border-neutral-300 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-purple-600"
                  />
                  <button
                    type="submit"
                    className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs px-3 py-2 rounded-xl"
                  >
                    Agregar
                  </button>
                </div>
              </form>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {productos.map(prod => {
                const enTicket = itemsActuales.find(i => i.nombre === prod.nombre);
                return (
                  <button
                    key={prod.id}
                    onClick={() => agregarProductoAlTicket(prod)}
                    className={`p-2.5 rounded-xl border text-left flex flex-col justify-between transition-all active:scale-[0.97] relative ${
                      enTicket
                        ? 'border-purple-600 bg-purple-50/70 shadow-xs'
                        : 'border-neutral-200 hover:border-neutral-300 bg-neutral-50/50'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="text-lg">{prod.icono || '🍽️'}</span>
                      {enTicket && (
                        <span className="bg-purple-600 text-white font-extrabold text-[10px] w-5 h-5 rounded-full flex items-center justify-center">
                          {enTicket.cantidad}
                        </span>
                      )}
                    </div>
                    <div className="mt-1.5">
                      <span className="font-bold text-neutral-800 text-xs block leading-tight truncate">
                        {prod.nombre}
                      </span>
                      <span className="text-xs font-extrabold text-purple-700 block mt-0.5">
                        {formatearMoneda(prod.precio)}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-neutral-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-neutral-100">
              <h3 className="font-bold text-neutral-900 text-sm">
                Pedido en curso ({itemsActuales.length} {itemsActuales.length === 1 ? 'ítem' : 'ítems'})
              </h3>
              {itemsActuales.length > 0 && (
                <button
                  onClick={() => setItemsActuales([])}
                  className="text-neutral-400 hover:text-red-500 text-xs flex items-center gap-1 font-medium"
                >
                  <RotateCcw size={13} />
                  Vaciar
                </button>
              )}
            </div>

            {itemsActuales.length === 0 ? (
              <div className="text-center py-6 px-4 bg-neutral-50 rounded-xl border border-dashed border-neutral-200">
                <UtensilsCrossed size={28} className="mx-auto text-neutral-300 mb-1.5" />
                <p className="text-xs text-neutral-500 font-medium">Toca los platos arriba para cargarlos a la venta</p>
              </div>
            ) : (
              <div className="space-y-2">
                {itemsActuales.map(item => (
                  <div
                    key={item.nombre}
                    className="flex items-center justify-between p-2.5 bg-neutral-50 rounded-xl border border-neutral-100"
                  >
                    <div className="flex-1 pr-2">
                      <span className="text-xs font-bold text-neutral-900 block truncate">{item.nombre}</span>
                      <span className="text-[11px] text-neutral-500 font-medium">
                        {formatearMoneda(item.precioUnitario)} c/u
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex items-center bg-white rounded-lg border border-neutral-200 shadow-xs">
                        <button
                          onClick={() => modificarCantidad(item.nombre, -1)}
                          className="w-7 h-7 flex items-center justify-center text-neutral-600 hover:bg-neutral-100 rounded-l-lg active:scale-95"
                        >
                          <Minus size={13} />
                        </button>
                        <span className="w-6 text-center text-xs font-extrabold text-neutral-900">
                          {item.cantidad}
                        </span>
                        <button
                          onClick={() => modificarCantidad(item.nombre, 1)}
                          className="w-7 h-7 flex items-center justify-center text-neutral-600 hover:bg-neutral-100 rounded-r-lg active:scale-95"
                        >
                          <Plus size={13} />
                        </button>
                      </div>

                      <span className="text-xs font-extrabold text-neutral-900 w-16 text-right">
                        {formatearMoneda(item.subtotal)}
                      </span>

                      <button
                        onClick={() => removerItem(item.nombre)}
                        className="text-neutral-300 hover:text-red-500 p-1"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* MÉTODO DE PAGO: COBRO EN EFECTIVO EXCLUSIVO */}
            <div className="pt-1">
              <div className="flex items-center justify-between p-3 bg-neutral-950 text-white rounded-2xl border border-purple-900/60 shadow-sm">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-purple-900 text-purple-200 flex items-center justify-center">
                    <Banknote size={18} />
                  </div>
                  <div>
                    <span className="text-xs font-bold block">Cobro en Efectivo</span>
                    <span className="text-[10px] text-purple-300">Pago directo en mano</span>
                  </div>
                </div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider bg-purple-600 text-white px-2.5 py-1 rounded-full">
                  Exclusivo
                </span>
              </div>
            </div>

            {/* CALCULADORA DE VUELTO RÁPIDA */}
            {totalActual > 0 && (
              <div className="bg-purple-50/70 border border-purple-200 rounded-2xl p-3.5 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-purple-950">Calculadora de Vuelto</span>
                  <span className="text-[11px] text-purple-700 font-semibold">Total a cobrar: {formatearMoneda(totalActual)}</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] font-semibold text-neutral-600 block mb-1">Paga con:</label>
                    <input
                      type="number"
                      placeholder="$ Monto recibido"
                      value={montoRecibido}
                      onChange={e => setMontoRecibido(e.target.value)}
                      className="w-full bg-white border border-purple-300 rounded-lg px-2.5 py-1.5 text-xs font-bold text-neutral-900 focus:outline-none focus:ring-1 focus:ring-purple-600"
                    />
                  </div>
                  <div className="flex flex-col justify-end">
                    <span className="text-[11px] font-semibold text-neutral-600 block mb-1">Vuelto a dar:</span>
                    <div className="bg-white border border-purple-300 rounded-lg px-2.5 py-1.5 text-xs font-extrabold text-purple-900">
                      {valorRecibidoNum >= totalActual
                        ? formatearMoneda(vueltoCalculado)
                        : '$ 0'}
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div>
              <label className="text-xs font-bold text-neutral-700 block mb-1">
                Nota o Cliente <span className="text-neutral-400 font-normal">(Opcional)</span>
              </label>
              <input
                type="text"
                placeholder="Ej: Mesa 2, Don Pedro, Para llevar sin mayonesa"
                value={nota}
                onChange={e => setNota(e.target.value)}
                className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-purple-600"
              />
            </div>

            <div className="pt-2">
              <button
                type="button"
                disabled={itemsActuales.length === 0}
                onClick={registrarVenta}
                className={`w-full py-4 rounded-2xl font-extrabold text-base flex items-center justify-between px-6 shadow-md transition-all active:scale-[0.98] ${
                  itemsActuales.length > 0
                    ? 'bg-neutral-950 hover:bg-black text-white border border-purple-600 shadow-purple-950/20'
                    : 'bg-neutral-200 text-neutral-400 cursor-not-allowed'
                }`}
              >
                <span>{ventaEnEdicion ? 'Guardar Cambios' : 'Confirmar Venta'}</span>
                <span className="bg-purple-900/90 text-purple-200 px-3 py-1 rounded-xl text-lg font-black border border-purple-700/50">
                  {formatearMoneda(totalActual)}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* HISTORIAL Y AUDITORÍA */}
      {seccion === 'historial' && (
        <div className="space-y-3">
          <div className="bg-white p-3 rounded-2xl border border-neutral-200 shadow-sm space-y-2">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-2.5 text-neutral-400" />
              <input
                type="text"
                placeholder="Buscar por plato, cliente o nota..."
                value={busqueda}
                onChange={e => setBusqueda(e.target.value)}
                className="w-full bg-neutral-50 border border-neutral-200 rounded-xl pl-9 pr-3 py-2 text-xs focus:outline-none focus:border-purple-600"
              />
            </div>

            <div className="flex items-center justify-between pt-1 text-xs">
              <span className="font-semibold text-neutral-600">Cobros registrados:</span>
              <span className="bg-purple-100 text-purple-800 px-2.5 py-0.5 rounded-full font-bold text-[11px] flex items-center gap-1">
                <Banknote size={13} />
                Efectivo
              </span>
            </div>
          </div>

          {ventasFiltradas.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 text-center border border-neutral-200 shadow-sm">
              <AlertCircle size={32} className="mx-auto text-neutral-300 mb-2" />
              <p className="font-bold text-neutral-700 text-sm">No se encontraron ventas</p>
              <p className="text-xs text-neutral-400 mt-0.5">Prueba cambiando la búsqueda.</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {ventasFiltradas.map(v => {
                const esAnulada = v.estado === 'anulada';
                return (
                  <div
                    key={v.id}
                    className={`bg-white rounded-2xl p-3.5 border transition-all ${
                      esAnulada ? 'border-red-200 bg-red-50/30 opacity-70' : 'border-neutral-200 shadow-xs'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-neutral-900">
                            #{v.id.slice(-6).toUpperCase()}
                          </span>
                          <span className="text-[11px] text-neutral-500">
                            {formatearFecha(v.fecha)} • {formatearHora(v.fecha)}
                          </span>
                          {esAnulada && (
                            <span className="bg-red-100 text-red-700 text-[10px] font-bold px-1.5 py-0.5 rounded">
                              ANULADA
                            </span>
                          )}
                        </div>

                        <div className="mt-1 text-xs text-neutral-700">
                          {v.items.map(item => `${item.cantidad}x ${item.nombre}`).join(', ')}
                        </div>

                        {v.clienteONota && (
                          <div className="text-[11px] text-purple-900 bg-purple-50 px-2 py-0.5 rounded mt-1.5 inline-block font-medium border border-purple-100">
                            📝 {v.clienteONota}
                          </div>
                        )}
                      </div>

                      <div className="text-right">
                        <span className={`text-base font-extrabold block ${esAnulada ? 'line-through text-neutral-400' : 'text-neutral-900'}`}>
                          {formatearMoneda(v.total)}
                        </span>
                        <span className="text-[10px] font-semibold text-purple-700 uppercase tracking-wider block mt-0.5">
                          Efectivo
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-neutral-100 text-xs">
                      <button
                        onClick={() => setVentaParaTicket(v)}
                        className="text-neutral-700 hover:text-black font-semibold flex items-center gap-1"
                      >
                        <Receipt size={14} className="text-neutral-400" />
                        <span>Ver Ticket</span>
                      </button>

                      <div className="flex items-center gap-3">
                        {!esAnulada && (
                          <button
                            onClick={() => iniciarEdicion(v)}
                            className="text-purple-700 hover:text-purple-900 font-semibold flex items-center gap-1"
                          >
                            <Edit2 size={13} />
                            <span>Editar</span>
                          </button>
                        )}

                        <button
                          onClick={() => {
                            if (window.confirm(`¿Seguro que deseas eliminar la venta #${v.id.slice(-6).toUpperCase()} por ${formatearMoneda(v.total)}?`)) {
                              onEliminarVenta(v.id);
                            }
                          }}
                          className="text-neutral-400 hover:text-red-600 font-semibold flex items-center gap-1"
                        >
                          <Trash2 size={13} />
                          <span>Eliminar</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      <TicketModal
        venta={ventaParaTicket}
        alCerrar={() => setVentaParaTicket(null)}
      />
    </div>
  );
};
