/**
 * @file ControlVentas.tsx
 * @description Módulo de control total y registro ágil de ventas para el negocio de comida de Mayeli.
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
import { Venta, ItemVenta, ProductoComida, MetodoPago } from '../types';
import { formatearMoneda, formatearFecha, formatearHora } from '../utils/storage';
import { TicketModal } from './TicketModal';
import { 
  Plus, Minus, Trash2, Search, CheckCircle2, 
  Banknote, QrCode, CreditCard, Receipt, 
  AlertCircle, Edit2, RotateCcw, UtensilsCrossed 
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
  // Pestaña activa dentro del módulo de control: 'registrar' o 'historial'
  const [seccion, setSeccion] = useState<'registrar' | 'historial'>(vistaInicial);

  // Estados del formulario de nueva venta
  const [itemsActuales, setItemsActuales] = useState<ItemVenta[]>([]);
  const [metodoPago, setMetodoPago] = useState<MetodoPago>('efectivo');
  const [montoRecibido, setMontoRecibido] = useState<string>('');
  const [nota, setNota] = useState<string>('');
  const [platoPersonalizadoNombre, setPlatoPersonalizadoNombre] = useState('');
  const [platoPersonalizadoPrecio, setPlatoPersonalizadoPrecio] = useState('');
  const [mostrarPlatoLibre, setMostrarPlatoLibre] = useState(false);

  // Estados de edición de venta
  const [ventaEnEdicion, setVentaEnEdicion] = useState<Venta | null>(null);

  // Estados del historial: búsqueda y filtros
  const [busqueda, setBusqueda] = useState('');
  const [filtroMetodo, setFiltroMetodo] = useState<string>('todos');
  const [ventaParaTicket, setVentaParaTicket] = useState<Venta | null>(null);

  // Mensaje de éxito temporal tras registrar
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);

  // Cálculo del total actual
  const totalActual = itemsActuales.reduce((acc, curr) => acc + curr.subtotal, 0);

  // Cálculo del vuelto en efectivo
  const valorRecibidoNum = parseFloat(montoRecibido) || 0;
  const vueltoCalculado = Math.max(0, Math.round((valorRecibidoNum - totalActual) * 100) / 100);

  // AGREGAR UN PLATO DEL CATÁLOGO RÁPIDO
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

  // AGREGAR UN PLATO LIBRE O PERSONALIZADO
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

  // MODIFICAR CANTIDAD DE UN ITEM (+ / -)
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
        .filter(item => item.cantidad > 0); // Si baja de 1, se remueve automáticamente
    });
  };

  // QUITAR UN ITEM POR COMPLETO
  const removerItem = (nombre: string) => {
    setItemsActuales(prev => prev.filter(i => i.nombre !== nombre));
  };

  // LIMPIAR FORMULARIO
  const limpiarFormulario = () => {
    setItemsActuales([]);
    setMontoRecibido('');
    setNota('');
    setMetodoPago('efectivo');
    setVentaEnEdicion(null);
  };

  // CONFIRMAR Y GUARDAR VENTA
  const registrarVenta = () => {
    if (itemsActuales.length === 0 || totalActual <= 0) {
      alert('Por favor selecciona al menos un plato o comida para registrar la venta.');
      return;
    }

    if (ventaEnEdicion) {
      // Estamos editando una venta existente
      const ventaActualizada: Venta = {
        ...ventaEnEdicion,
        items: itemsActuales,
        total: totalActual,
        metodoPago,
        montoRecibido: metodoPago === 'efectivo' && valorRecibidoNum > 0 ? valorRecibidoNum : undefined,
        vuelto: metodoPago === 'efectivo' && valorRecibidoNum >= totalActual ? vueltoCalculado : undefined,
        clienteONota: nota.trim() || undefined
      };

      onEditarVenta(ventaActualizada);
      setMensajeExito(`¡Venta #${ventaEnEdicion.id.slice(-4)} actualizada con éxito!`);
      limpiarFormulario();
      setSeccion('historial');
    } else {
      // Nueva venta
      const nuevaVenta: Venta = {
        id: `v_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        fecha: new Date().toISOString(),
        items: itemsActuales,
        total: totalActual,
        metodoPago,
        montoRecibido: metodoPago === 'efectivo' && valorRecibidoNum > 0 ? valorRecibidoNum : undefined,
        vuelto: metodoPago === 'efectivo' && valorRecibidoNum >= totalActual ? vueltoCalculado : undefined,
        clienteONota: nota.trim() || undefined,
        estado: 'completada',
        creadaEn: Date.now()
      };

      onAgregarVenta(nuevaVenta);
      setMensajeExito(`¡Venta por ${formatearMoneda(totalActual)} registrada correctamente!`);
      limpiarFormulario();
    }

    setTimeout(() => setMensajeExito(null), 3500);
  };

  // INICIAR EDICIÓN DE UNA VENTA PREVIA
  const iniciarEdicion = (v: Venta) => {
    setVentaEnEdicion(v);
    setItemsActuales([...v.items]);
    setMetodoPago(v.metodoPago);
    setMontoRecibido(v.montoRecibido ? v.montoRecibido.toString() : '');
    setNota(v.clienteONota || '');
    setSeccion('registrar');
  };

  // FILTRADO DEL HISTORIAL DE VENTAS
  const ventasFiltradas = ventas.filter(v => {
    // Filtro por método de pago
    if (filtroMetodo !== 'todos' && v.metodoPago !== filtroMetodo) {
      return false;
    }

    // Filtro por búsqueda de texto
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
      {/* SELECTOR DE MODO: REGISTRAR VENTA VS HISTORIAL DE CONTROL */}
      <div className="flex bg-stone-200/80 p-1 rounded-2xl">
        <button
          onClick={() => {
            setSeccion('registrar');
          }}
          className={`flex-1 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-all ${
            seccion === 'registrar'
              ? 'bg-white text-stone-900 shadow-sm'
              : 'text-stone-600 hover:text-stone-900'
          }`}
        >
          <Plus size={16} className="text-orange-500" />
          <span>{ventaEnEdicion ? '✏️ Editando Venta' : 'Registrar Venta'}</span>
        </button>

        <button
          onClick={() => setSeccion('historial')}
          className={`flex-1 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-all ${
            seccion === 'historial'
              ? 'bg-white text-stone-900 shadow-sm'
              : 'text-stone-600 hover:text-stone-900'
          }`}
        >
          <Receipt size={16} className="text-blue-500" />
          <span>Historial & Control ({ventas.length})</span>
        </button>
      </div>

      {/* AVISO TOAST DE ÉXITO */}
      {mensajeExito && (
        <div className="bg-emerald-500 text-white font-semibold text-xs sm:text-sm p-3 rounded-2xl shadow-md flex items-center justify-between animate-fadeIn">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={18} />
            <span>{mensajeExito}</span>
          </div>
          <button onClick={() => setMensajeExito(null)} className="text-white/80 hover:text-white">
            ✕
          </button>
        </div>
      )}

      {/* -------------------- VISTA 1: REGISTRAR VENTA RÁPIDA -------------------- */}
      {seccion === 'registrar' && (
        <div className="space-y-4">
          {ventaEnEdicion && (
            <div className="bg-amber-50 border border-amber-300 p-3 rounded-2xl flex items-center justify-between text-xs text-amber-900">
              <span className="font-semibold">
                Modificando venta #{ventaEnEdicion.id.slice(-6).toUpperCase()}
              </span>
              <button
                onClick={limpiarFormulario}
                className="text-stone-500 hover:text-stone-800 underline font-medium"
              >
                Cancelar edición
              </button>
            </div>
          )}

          {/* MENÚ DE PLATOS RÁPIDOS PARA TOCAR CON UN DEDO */}
          <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <UtensilsCrossed size={16} className="text-orange-500" />
                <h3 className="font-bold text-stone-900 text-sm">Menú de Platos de Mayeli</h3>
              </div>
              <button
                onClick={() => setMostrarPlatoLibre(!mostrarPlatoLibre)}
                className="text-xs text-orange-600 hover:text-orange-700 font-bold bg-orange-50 px-2.5 py-1 rounded-lg"
              >
                {mostrarPlatoLibre ? 'Ocultar' : '+ Plato libre'}
              </button>
            </div>

            {/* Formulario desplegable para agregar plato libre no catalogado */}
            {mostrarPlatoLibre && (
              <form onSubmit={agregarPlatoLibre} className="bg-stone-50 p-3 rounded-xl mb-3 border border-stone-200 space-y-2">
                <p className="text-xs font-semibold text-stone-700">Agregar comida con precio personalizado</p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Nombre del plato (ej: Picada)"
                    value={platoPersonalizadoNombre}
                    onChange={e => setPlatoPersonalizadoNombre(e.target.value)}
                    className="flex-1 bg-white border border-stone-300 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-orange-500"
                  />
                  <input
                    type="number"
                    placeholder="Precio $"
                    value={platoPersonalizadoPrecio}
                    onChange={e => setPlatoPersonalizadoPrecio(e.target.value)}
                    className="w-24 bg-white border border-stone-300 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-orange-500"
                  />
                  <button
                    type="submit"
                    className="bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs px-3 py-2 rounded-xl"
                  >
                    Agregar
                  </button>
                </div>
              </form>
            )}

            {/* Botones táctiles de platos rápidos */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {productos.map(prod => {
                const enTicket = itemsActuales.find(i => i.nombre === prod.nombre);
                return (
                  <button
                    key={prod.id}
                    onClick={() => agregarProductoAlTicket(prod)}
                    className={`p-2.5 rounded-xl border text-left flex flex-col justify-between transition-all active:scale-[0.97] relative ${
                      enTicket
                        ? 'border-orange-400 bg-orange-50/60 shadow-xs'
                        : 'border-stone-200 hover:border-stone-300 bg-stone-50/50'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="text-lg">{prod.icono || '🍽️'}</span>
                      {enTicket && (
                        <span className="bg-orange-500 text-white font-extrabold text-[10px] w-5 h-5 rounded-full flex items-center justify-center">
                          {enTicket.cantidad}
                        </span>
                      )}
                    </div>
                    <div className="mt-1.5">
                      <span className="font-bold text-stone-800 text-xs block leading-tight truncate">
                        {prod.nombre}
                      </span>
                      <span className="text-xs font-extrabold text-orange-600 block mt-0.5">
                        {formatearMoneda(prod.precio)}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* DETALLE DE LA COMANDA / VENTA ACTUAL */}
          <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-stone-100">
              <h3 className="font-bold text-stone-900 text-sm">
                Pedido en curso ({itemsActuales.length} {itemsActuales.length === 1 ? 'ítem' : 'ítems'})
              </h3>
              {itemsActuales.length > 0 && (
                <button
                  onClick={() => setItemsActuales([])}
                  className="text-stone-400 hover:text-red-500 text-xs flex items-center gap-1 font-medium"
                >
                  <RotateCcw size={13} />
                  Vaciar
                </button>
              )}
            </div>

            {itemsActuales.length === 0 ? (
              <div className="text-center py-6 px-4 bg-stone-50 rounded-xl border border-dashed border-stone-200">
                <UtensilsCrossed size={28} className="mx-auto text-stone-300 mb-1.5" />
                <p className="text-xs text-stone-500 font-medium">Toca los platos arriba para cargarlos a la venta</p>
              </div>
            ) : (
              <div className="space-y-2">
                {itemsActuales.map(item => (
                  <div
                    key={item.nombre}
                    className="flex items-center justify-between p-2.5 bg-stone-50 rounded-xl border border-stone-100"
                  >
                    <div className="flex-1 pr-2">
                      <span className="text-xs font-bold text-stone-900 block truncate">{item.nombre}</span>
                      <span className="text-[11px] text-stone-500 font-medium">
                        {formatearMoneda(item.precioUnitario)} c/u
                      </span>
                    </div>

                    {/* Controles de cantidad táctiles */}
                    <div className="flex items-center gap-2">
                      <div className="flex items-center bg-white rounded-lg border border-stone-200 shadow-xs">
                        <button
                          onClick={() => modificarCantidad(item.nombre, -1)}
                          className="w-7 h-7 flex items-center justify-center text-stone-600 hover:bg-stone-100 rounded-l-lg active:scale-95"
                        >
                          <Minus size={13} />
                        </button>
                        <span className="w-6 text-center text-xs font-extrabold text-stone-900">
                          {item.cantidad}
                        </span>
                        <button
                          onClick={() => modificarCantidad(item.nombre, 1)}
                          className="w-7 h-7 flex items-center justify-center text-stone-600 hover:bg-stone-100 rounded-r-lg active:scale-95"
                        >
                          <Plus size={13} />
                        </button>
                      </div>

                      <span className="text-xs font-extrabold text-stone-900 w-16 text-right">
                        {formatearMoneda(item.subtotal)}
                      </span>

                      <button
                        onClick={() => removerItem(item.nombre)}
                        className="text-stone-300 hover:text-red-500 p-1"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* SELECCIÓN DE MÉTODO DE PAGO */}
            <div className="pt-2">
              <label className="text-xs font-bold text-stone-700 block mb-2">Forma de Cobro</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setMetodoPago('efectivo')}
                  className={`py-2 px-3 rounded-xl border flex flex-col items-center gap-1 font-semibold text-xs transition-all ${
                    metodoPago === 'efectivo'
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-900 shadow-xs font-bold'
                      : 'border-stone-200 text-stone-600 bg-stone-50'
                  }`}
                >
                  <Banknote size={18} className={metodoPago === 'efectivo' ? 'text-emerald-600' : 'text-stone-400'} />
                  <span>Efectivo</span>
                </button>

                <button
                  type="button"
                  onClick={() => setMetodoPago('transferencia')}
                  className={`py-2 px-3 rounded-xl border flex flex-col items-center gap-1 font-semibold text-xs transition-all ${
                    metodoPago === 'transferencia'
                      ? 'border-blue-500 bg-blue-50 text-blue-900 shadow-xs font-bold'
                      : 'border-stone-200 text-stone-600 bg-stone-50'
                  }`}
                >
                  <QrCode size={18} className={metodoPago === 'transferencia' ? 'text-blue-600' : 'text-stone-400'} />
                  <span>Transf. / QR</span>
                </button>

                <button
                  type="button"
                  onClick={() => setMetodoPago('tarjeta')}
                  className={`py-2 px-3 rounded-xl border flex flex-col items-center gap-1 font-semibold text-xs transition-all ${
                    metodoPago === 'tarjeta'
                      ? 'border-purple-500 bg-purple-50 text-purple-900 shadow-xs font-bold'
                      : 'border-stone-200 text-stone-600 bg-stone-50'
                  }`}
                >
                  <CreditCard size={18} className={metodoPago === 'tarjeta' ? 'text-purple-600' : 'text-stone-400'} />
                  <span>Tarjeta</span>
                </button>
              </div>
            </div>

            {/* CALCULADORA DE VUELTO RÁPIDA PARA EFECTIVO */}
            {metodoPago === 'efectivo' && totalActual > 0 && (
              <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-emerald-950">Calculadora de Vuelto</span>
                  <span className="text-[11px] text-emerald-700">Total a cobrar: {formatearMoneda(totalActual)}</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] font-semibold text-stone-600 block mb-1">Paga con:</label>
                    <input
                      type="number"
                      placeholder="$ Monto recibido"
                      value={montoRecibido}
                      onChange={e => setMontoRecibido(e.target.value)}
                      className="w-full bg-white border border-emerald-300 rounded-lg px-2.5 py-1.5 text-xs font-bold text-stone-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                  <div className="flex flex-col justify-end">
                    <span className="text-[11px] font-semibold text-stone-600 block mb-1">Vuelto a dar:</span>
                    <div className="bg-white border border-emerald-300 rounded-lg px-2.5 py-1.5 text-xs font-extrabold text-emerald-700">
                      {valorRecibidoNum >= totalActual
                        ? formatearMoneda(vueltoCalculado)
                        : '$ 0'}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* NOTA O CLIENTE OPCIONAL */}
            <div>
              <label className="text-xs font-bold text-stone-700 block mb-1">
                Nota o Cliente <span className="text-stone-400 font-normal">(Opcional)</span>
              </label>
              <input
                type="text"
                placeholder="Ej: Mesa 2, Don Pedro, Para llevar sin mayonesa"
                value={nota}
                onChange={e => setNota(e.target.value)}
                className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-stone-400"
              />
            </div>

            {/* BOTÓN PRINCIPAL DE COBRAR */}
            <div className="pt-2">
              <button
                type="button"
                disabled={itemsActuales.length === 0}
                onClick={registrarVenta}
                className={`w-full py-4 rounded-2xl font-extrabold text-base flex items-center justify-between px-6 shadow-md transition-all active:scale-[0.98] ${
                  itemsActuales.length > 0
                    ? 'bg-orange-500 hover:bg-orange-600 text-white shadow-orange-500/25'
                    : 'bg-stone-200 text-stone-400 cursor-not-allowed'
                }`}
              >
                <span>{ventaEnEdicion ? 'Guardar Cambios' : 'Confirmar Venta'}</span>
                <span className="bg-black/20 px-3 py-1 rounded-xl text-lg">
                  {formatearMoneda(totalActual)}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* -------------------- VISTA 2: HISTORIAL Y AUDITORÍA DE VENTAS -------------------- */}
      {seccion === 'historial' && (
        <div className="space-y-3">
          {/* BUSCADOR Y FILTROS */}
          <div className="bg-white p-3 rounded-2xl border border-stone-200 shadow-sm space-y-2">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-2.5 text-stone-400" />
              <input
                type="text"
                placeholder="Buscar por plato, cliente o nota..."
                value={busqueda}
                onChange={e => setBusqueda(e.target.value)}
                className="w-full bg-stone-50 border border-stone-200 rounded-xl pl-9 pr-3 py-2 text-xs focus:outline-none focus:border-orange-500"
              />
            </div>

            {/* Filtros de método de pago */}
            <div className="flex gap-1.5 overflow-x-auto no-scrollbar pt-1">
              {[
                { id: 'todos', label: 'Todos' },
                { id: 'efectivo', label: '💵 Efectivo' },
                { id: 'transferencia', label: '📱 Transferencia' },
                { id: 'tarjeta', label: '💳 Tarjeta' }
              ].map(filtro => (
                <button
                  key={filtro.id}
                  onClick={() => setFiltroMetodo(filtro.id)}
                  className={`text-xs px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap transition-all ${
                    filtroMetodo === filtro.id
                      ? 'bg-stone-900 text-white'
                      : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                  }`}
                >
                  {filtro.label}
                </button>
              ))}
            </div>
          </div>

          {/* LISTADO DE VENTAS */}
          {ventasFiltradas.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 text-center border border-stone-200 shadow-sm">
              <AlertCircle size={32} className="mx-auto text-stone-300 mb-2" />
              <p className="font-bold text-stone-700 text-sm">No se encontraron ventas</p>
              <p className="text-xs text-stone-400 mt-0.5">Prueba cambiando los filtros o la búsqueda.</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {ventasFiltradas.map(v => {
                const esAnulada = v.estado === 'anulada';
                return (
                  <div
                    key={v.id}
                    className={`bg-white rounded-2xl p-3.5 border transition-all ${
                      esAnulada ? 'border-red-200 bg-red-50/30 opacity-70' : 'border-stone-200 shadow-xs'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-stone-900">
                            #{v.id.slice(-6).toUpperCase()}
                          </span>
                          <span className="text-[11px] text-stone-500">
                            {formatearFecha(v.fecha)} • {formatearHora(v.fecha)}
                          </span>
                          {esAnulada && (
                            <span className="bg-red-100 text-red-700 text-[10px] font-bold px-1.5 py-0.5 rounded">
                              ANULADA
                            </span>
                          )}
                        </div>

                        {/* Platos incluidos */}
                        <div className="mt-1 text-xs text-stone-700">
                          {v.items.map(item => `${item.cantidad}x ${item.nombre}`).join(', ')}
                        </div>

                        {/* Nota de cliente */}
                        {v.clienteONota && (
                          <div className="text-[11px] text-amber-800 bg-amber-50 px-2 py-0.5 rounded mt-1.5 inline-block font-medium">
                            📝 {v.clienteONota}
                          </div>
                        )}
                      </div>

                      <div className="text-right">
                        <span className={`text-base font-extrabold block ${esAnulada ? 'line-through text-stone-400' : 'text-stone-900'}`}>
                          {formatearMoneda(v.total)}
                        </span>
                        <span className="text-[10px] font-semibold text-stone-500 uppercase tracking-wider block mt-0.5">
                          {v.metodoPago}
                        </span>
                      </div>
                    </div>

                    {/* BOTONES DE ACCIÓN Y CONTROL */}
                    <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-stone-100 text-xs">
                      <button
                        onClick={() => setVentaParaTicket(v)}
                        className="text-stone-600 hover:text-stone-900 font-semibold flex items-center gap-1"
                      >
                        <Receipt size={14} className="text-stone-400" />
                        <span>Ver Ticket</span>
                      </button>

                      <div className="flex items-center gap-3">
                        {!esAnulada && (
                          <button
                            onClick={() => iniciarEdicion(v)}
                            className="text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1"
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
                          className="text-stone-400 hover:text-red-600 font-semibold flex items-center gap-1"
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

      {/* MODAL DE TICKET DIGITAL */}
      <TicketModal
        venta={ventaParaTicket}
        alCerrar={() => setVentaParaTicket(null)}
      />
    </div>
  );
};
