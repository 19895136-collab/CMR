/**
 * @file ControlVentas.tsx
 * @description Pantalla de registro y control de ventas adaptada a los 6 requisitos de interfaz:
 * 1. Compatible con pantallas de 320px de ancho, botones táctiles de 48px+ para una sola mano.
 * 2. Texto nunca menor a 16px (text-base), contraste elevado para ver bajo el sol.
 * 3. Todos los campos de entrada tienen etiquetas visibles.
 * 4. Un solo botón principal destacado ("Cobrar Venta"); los demás son botones secundarios.
 * 5. Estados vacíos explicativos con invitación a la acción.
 * 6. Mensajes de éxito y error visibles, en español coloquial sin términos técnicos.
 */

import React, { useState } from 'react';
import { Venta, ItemVenta, ProductoComida } from '../types';
import { formatearMoneda, formatearFecha, formatearHora } from '../utils/storage';
import { TicketModal } from './TicketModal';
import { 
  Plus, Minus, Trash2, Search, CheckCircle2, 
  Banknote, Receipt, AlertCircle, Edit2, RotateCcw, 
  UtensilsCrossed, AlertTriangle, ShoppingCart
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
  const [montoRecibido, setMontoRecibido] = useState<string>('');
  const [nota, setNota] = useState<string>('');
  const [platoPersonalizadoNombre, setPlatoPersonalizadoNombre] = useState('');
  const [platoPersonalizadoPrecio, setPlatoPersonalizadoPrecio] = useState('');
  const [mostrarPlatoLibre, setMostrarPlatoLibre] = useState(false);

  const [ventaEnEdicion, setVentaEnEdicion] = useState<Venta | null>(null);
  const [busqueda, setBusqueda] = useState('');
  const [ventaParaTicket, setVentaParaTicket] = useState<Venta | null>(null);
  const [guardando, setGuardando] = useState(false);

  // 6. MENSAJES CLAROS DE ÉXITO Y ERROR EN ESPAÑOL SIMPLE
  const [notificacion, setNotificacion] = useState<{
    tipo: 'exito' | 'error';
    mensaje: string;
  } | null>(null);

  const totalActual = itemsActuales.reduce((acc, curr) => acc + (curr.subtotal || 0), 0);
  const valorRecibidoNum = parseFloat(montoRecibido) || 0;
  const vueltoCalculado = Math.max(0, Math.round((valorRecibidoNum - totalActual) * 100) / 100);

  const mostrarMensaje = (tipo: 'exito' | 'error', mensaje: string) => {
    setNotificacion({ tipo, mensaje });
    setTimeout(() => setNotificacion(null), 4000);
  };

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
    const nombreLimpio = platoPersonalizadoNombre.replace(/[\u200B-\u200D\uFEFF]/g, '').trim().slice(0, 45);
    const precio = parseFloat(platoPersonalizadoPrecio);

    if (nombreLimpio.length < 2) {
      mostrarMensaje('error', 'Escribí un nombre de comida válido (al menos 2 letras).');
      return;
    }
    if (isNaN(precio) || precio <= 0 || precio > 500000) {
      mostrarMensaje('error', 'El precio debe ser un número entre $1 y $500.000.');
      return;
    }

    setItemsActuales(prev => [
      ...prev,
      {
        id: `libre_${Date.now()}`,
        nombre: nombreLimpio,
        precioUnitario: precio,
        cantidad: 1,
        subtotal: precio
      }
    ]);

    setPlatoPersonalizadoNombre('');
    setPlatoPersonalizadoPrecio('');
    setMostrarPlatoLibre(false);
    mostrarMensaje('exito', 'Comida agregada al pedido actual.');
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

  const registrarVenta = async () => {
    if (guardando) return;

    if (itemsActuales.length === 0 || totalActual <= 0) {
      mostrarMensaje('error', 'Elegí al menos una comida de la lista para poder cobrar.');
      return;
    }

    setGuardando(true);

    try {
      const notaLimpia = nota.replace(/[\u200B-\u200D\uFEFF]/g, '').trim().slice(0, 60);

      if (ventaEnEdicion) {
        const ventaActualizada: Venta = {
          ...ventaEnEdicion,
          items: itemsActuales,
          total: totalActual,
          metodoPago: 'efectivo',
          montoRecibido: valorRecibidoNum > 0 ? valorRecibidoNum : undefined,
          vuelto: valorRecibidoNum >= totalActual ? vueltoCalculado : undefined,
          clienteONota: notaLimpia || undefined
        };

        onEditarVenta(ventaActualizada);
        mostrarMensaje('exito', `¡Venta #${ventaEnEdicion.id.slice(-4)} actualizada con éxito!`);
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
          clienteONota: notaLimpia || undefined,
          estado: 'completada',
          creadaEn: Date.now()
        };

        onAgregarVenta(nuevaVenta);
        mostrarMensaje('exito', `¡Cobro de ${formatearMoneda(totalActual)} guardado en tu caja!`);
        limpiarFormulario();
      }
    } finally {
      setGuardando(false);
    }
  };

  const iniciarEdicion = (v: Venta) => {
    setVentaEnEdicion(v);
    setItemsActuales([...v.items]);
    setMontoRecibido(v.montoRecibido ? v.montoRecibido.toString() : '');
    setNota(v.clienteONota || '');
    setSeccion('registrar');
  };

  const ventasFiltradas = ventas.filter(v => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return true;
    if (!v) return false;
    const items = Array.isArray(v.items) ? v.items : [];
    const coincidePlato = items.some(i => (i?.nombre || '').toLowerCase().includes(q));
    const coincideNota = (v.clienteONota || '').toLowerCase().includes(q);
    const coincideId = (v.id || '').toLowerCase().includes(q);
    return coincidePlato || coincideNota || coincideId;
  });

  return (
    <div className="space-y-5 pb-28">
      {/* SELECTOR SECUNDARIO: REGISTRAR VS HISTORIAL */}
      <div className="grid grid-cols-2 gap-2 bg-neutral-200 p-1.5 rounded-2xl border border-neutral-300">
        <button
          type="button"
          onClick={() => setSeccion('registrar')}
          className={`min-h-[48px] py-2.5 px-3 rounded-xl font-black text-base flex items-center justify-center gap-2 transition-all ${
            seccion === 'registrar'
              ? 'bg-neutral-950 text-white shadow-md'
              : 'text-neutral-800 hover:text-black'
          }`}
        >
          <Plus size={20} className={seccion === 'registrar' ? 'text-purple-400' : 'text-neutral-700'} />
          <span>{ventaEnEdicion ? 'Editando' : 'Anotar Venta'}</span>
        </button>

        <button
          type="button"
          onClick={() => setSeccion('historial')}
          className={`min-h-[48px] py-2.5 px-3 rounded-xl font-black text-base flex items-center justify-center gap-2 transition-all ${
            seccion === 'historial'
              ? 'bg-neutral-950 text-white shadow-md'
              : 'text-neutral-800 hover:text-black'
          }`}
        >
          <Receipt size={20} className={seccion === 'historial' ? 'text-purple-400' : 'text-neutral-700'} />
          <span>Ver Ventas ({ventas.length})</span>
        </button>
      </div>

      {/* 6. AVISO DE ÉXITO O ERROR VISIBLE (SIN PALABRAS TÉCNICAS) */}
      {notificacion && (
        <div
          className={`p-4 rounded-2xl flex items-center justify-between gap-3 text-base font-black shadow-lg border-2 animate-fadeIn ${
            notificacion.tipo === 'exito'
              ? 'bg-emerald-700 text-white border-neutral-950'
              : 'bg-red-700 text-white border-neutral-950'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {notificacion.tipo === 'exito' ? (
              <CheckCircle2 size={24} className="shrink-0" />
            ) : (
              <AlertTriangle size={24} className="shrink-0" />
            )}
            <span>{notificacion.mensaje}</span>
          </div>
          <button
            type="button"
            onClick={() => setNotificacion(null)}
            className="text-white hover:text-neutral-200 text-lg font-bold px-2 py-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* -------------------- VISTA 1: REGISTRAR VENTA -------------------- */}
      {seccion === 'registrar' && (
        <div className="space-y-5">
          {ventaEnEdicion && (
            <div className="bg-purple-100 border-2 border-purple-900 p-4 rounded-2xl flex items-center justify-between text-base text-purple-950 font-bold">
              <span>Modificando venta #{ventaEnEdicion.id.slice(-6).toUpperCase()}</span>
              <button
                type="button"
                onClick={limpiarFormulario}
                className="underline text-purple-900 hover:text-black"
              >
                Cancelar
              </button>
            </div>
          )}

          {/* CATÁLOGO DE PLATOS PARA TOCAR CON EL DEDO */}
          <section className="bg-white p-5 rounded-3xl border-2 border-neutral-900 shadow-sm space-y-3">
            <div className="flex justify-between items-center flex-wrap gap-2">
              <label className="text-lg font-black text-neutral-950 flex items-center gap-2">
                <UtensilsCrossed size={20} className="text-purple-700" />
                <span>Elegí las comidas vendidas:</span>
              </label>

              <button
                type="button"
                onClick={() => setMostrarPlatoLibre(!mostrarPlatoLibre)}
                className="min-h-[44px] py-2 px-3 bg-neutral-100 hover:bg-neutral-200 text-neutral-950 text-base font-black rounded-xl border-2 border-neutral-800"
              >
                {mostrarPlatoLibre ? 'Cerrar plato libre' : '+ Agregar otro plato'}
              </button>
            </div>

            {/* Formulario de plato libre con etiquetas visibles */}
            {mostrarPlatoLibre && (
              <form onSubmit={agregarPlatoLibre} className="bg-neutral-100 p-4 rounded-2xl border-2 border-neutral-900 space-y-3">
                <p className="text-base font-black text-neutral-950">Anotar plato que no está en el menú:</p>
                
                <div>
                  <label htmlFor="nombre-libre" className="text-base font-bold text-neutral-950 block mb-1">
                    Nombre del plato o comida:
                  </label>
                  <input
                    id="nombre-libre"
                    type="text"
                    maxLength={45}
                    placeholder="Ej: Empanada de verdura"
                    value={platoPersonalizadoNombre}
                    onChange={e => setPlatoPersonalizadoNombre(e.target.value.slice(0, 45))}
                    className="w-full min-h-[48px] bg-white border-2 border-neutral-900 rounded-xl px-4 py-3 text-base font-bold text-neutral-950 focus:outline-none focus:ring-2 focus:ring-purple-600"
                  />
                </div>

                <div>
                  <label htmlFor="precio-libre" className="text-base font-bold text-neutral-950 block mb-1">
                    Precio a cobrar ($):
                  </label>
                  <input
                    id="precio-libre"
                    type="number"
                    min="1"
                    max="500000"
                    placeholder="Ej: 150"
                    value={platoPersonalizadoPrecio}
                    onKeyDown={e => {
                      if (['-', '+', 'e', 'E'].includes(e.key)) e.preventDefault();
                    }}
                    onChange={e => setPlatoPersonalizadoPrecio(e.target.value.slice(0, 7))}
                    className="w-full min-h-[48px] bg-white border-2 border-neutral-900 rounded-xl px-4 py-3 text-base font-bold text-neutral-950 focus:outline-none focus:ring-2 focus:ring-purple-600"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full min-h-[48px] bg-neutral-950 hover:bg-black text-white font-black text-base py-3 rounded-xl border border-neutral-950 shadow-sm"
                >
                  Sumar este plato al pedido
                </button>
              </form>
            )}

            {/* Botones táctiles de platos (mínimo 48px de alto para uso con una mano) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
              {productos.map(prod => {
                const enTicket = itemsActuales.find(i => i.nombre === prod.nombre);
                return (
                  <button
                    type="button"
                    key={prod.id}
                    onClick={() => agregarProductoAlTicket(prod)}
                    className={`min-h-[58px] p-3 rounded-2xl border-2 text-left flex items-center justify-between transition-all active:scale-[0.98] ${
                      enTicket
                        ? 'border-purple-800 bg-purple-100 ring-2 ring-purple-600'
                        : 'border-neutral-900 bg-neutral-50 hover:bg-neutral-100'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <span className="text-2xl">{prod.icono || '🍽️'}</span>
                      <div className="truncate">
                        <span className="font-black text-neutral-950 text-base block truncate">
                          {prod.nombre}
                        </span>
                        <span className="text-base font-extrabold text-purple-900 block">
                          {formatearMoneda(prod.precio)}
                        </span>
                      </div>
                    </div>

                    {enTicket ? (
                      <span className="bg-purple-800 text-white font-black text-base px-3 py-1 rounded-full border border-neutral-900 shrink-0">
                        {enTicket.cantidad} u.
                      </span>
                    ) : (
                      <span className="text-base font-bold text-neutral-700 bg-neutral-200 px-2.5 py-1 rounded-lg shrink-0">
                        + Sumar
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </section>

          {/* DETALLE DEL PEDIDO / CANASTA */}
          <section className="bg-white p-5 rounded-3xl border-2 border-neutral-900 shadow-sm space-y-4">
            <div className="flex justify-between items-center border-b-2 border-neutral-200 pb-2">
              <label className="text-lg font-black text-neutral-950">
                Lista del pedido actual:
              </label>
              {itemsActuales.length > 0 && (
                <button
                  type="button"
                  onClick={() => setItemsActuales([])}
                  className="text-base font-bold text-red-700 hover:text-red-900 flex items-center gap-1"
                >
                  <RotateCcw size={16} />
                  <span>Vaciar</span>
                </button>
              )}
            </div>

            {/* 5. ESTADO VACÍO CUANDO AÚN NO SE ELIGIÓ NINGÚN PLATO */}
            {itemsActuales.length === 0 ? (
              <div className="text-center py-8 px-4 bg-neutral-50 rounded-2xl border-2 border-dashed border-neutral-400 space-y-2">
                <ShoppingCart size={36} className="mx-auto text-neutral-600" />
                <h4 className="text-lg font-black text-neutral-950">
                  Tu canasta de cobro está vacía
                </h4>
                <p className="text-base text-neutral-800 font-medium max-w-xs mx-auto">
                  Tocá cualquiera de los platos de arriba para sumarlo a la venta.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {itemsActuales.map(item => (
                  <div
                    key={item.nombre}
                    className="p-3.5 bg-neutral-50 rounded-2xl border-2 border-neutral-900 flex items-center justify-between flex-wrap gap-2"
                  >
                    <div className="flex-1 min-w-[140px]">
                      <span className="text-base font-black text-neutral-950 block truncate">
                        {item.nombre}
                      </span>
                      <span className="text-base font-bold text-neutral-700">
                        {formatearMoneda(item.precioUnitario)} cada uno
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Botones táctiles de cantidad de al menos 48px */}
                      <div className="flex items-center bg-white rounded-xl border-2 border-neutral-900 overflow-hidden">
                        <button
                          type="button"
                          onClick={() => modificarCantidad(item.nombre, -1)}
                          className="w-12 h-12 flex items-center justify-center text-neutral-950 hover:bg-neutral-100 text-lg font-black active:scale-95"
                          title="Restar 1"
                        >
                          <Minus size={18} />
                        </button>
                        <span className="w-10 text-center text-base font-black text-neutral-950">
                          {item.cantidad}
                        </span>
                        <button
                          type="button"
                          onClick={() => modificarCantidad(item.nombre, 1)}
                          className="w-12 h-12 flex items-center justify-center text-neutral-950 hover:bg-neutral-100 text-lg font-black active:scale-95"
                          title="Sumar 1"
                        >
                          <Plus size={18} />
                        </button>
                      </div>

                      <span className="text-base font-black text-neutral-950 w-20 text-right">
                        {formatearMoneda(item.subtotal)}
                      </span>

                      <button
                        type="button"
                        onClick={() => removerItem(item.nombre)}
                        className="w-11 h-11 flex items-center justify-center text-neutral-600 hover:text-red-700 active:scale-95"
                        title="Eliminar plato"
                      >
                        <Trash2 size={20} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* FORMA DE COBRO: EFECTIVO */}
            <div className="bg-neutral-950 text-white p-4 rounded-2xl border-2 border-purple-500 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Banknote size={24} className="text-purple-400 shrink-0" />
                <div>
                  <span className="text-base font-black block">Cobro en Efectivo</span>
                  <span className="text-base text-neutral-300">Pago directo en mano</span>
                </div>
              </div>
              <span className="text-base font-black bg-purple-700 text-white px-3 py-1 rounded-xl">
                Efectivo
              </span>
            </div>

            {/* 3. CALCULADORA DE VUELTO CON ETIQUETAS VISIBLES */}
            {totalActual > 0 && (
              <div className="bg-purple-50 border-2 border-purple-800 rounded-2xl p-4 space-y-3">
                <label className="text-base font-black text-purple-950 block">
                  Calculadora de Vuelto para el Cliente:
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="paga-con" className="text-base font-bold text-neutral-950 block mb-1">
                      ¿Con cuánta plata te paga el cliente?
                    </label>
                    <input
                      id="paga-con"
                      type="number"
                      min="0"
                      max="10000000"
                      placeholder="Ej: 500"
                      value={montoRecibido}
                      onKeyDown={e => {
                        if (['-', '+', 'e', 'E'].includes(e.key)) e.preventDefault();
                      }}
                      onChange={e => setMontoRecibido(e.target.value.slice(0, 8))}
                      className="w-full min-h-[50px] bg-white border-2 border-neutral-900 rounded-xl px-4 py-2.5 text-lg font-black text-neutral-950 focus:outline-none focus:ring-2 focus:ring-purple-600"
                    />
                  </div>

                  <div>
                    <label className="text-base font-bold text-neutral-950 block mb-1">
                      Vuelto exacto a entregar:
                    </label>
                    <div className="w-full min-h-[50px] bg-white border-2 border-neutral-900 rounded-xl px-4 py-2.5 text-xl font-black text-purple-950 flex items-center">
                      {valorRecibidoNum >= totalActual ? formatearMoneda(vueltoCalculado) : '$ 0'}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 3. NOTA CON ETIQUETA VISIBLE */}
            <div>
              <label htmlFor="nota-cliente" className="text-base font-bold text-neutral-950 block mb-1">
                Nota o número de mesa (Opcional):
              </label>
              <input
                id="nota-cliente"
                type="text"
                maxLength={60}
                placeholder="Ej: Mesa 2, Don Pedro, Para llevar"
                value={nota}
                onChange={e => setNota(e.target.value.slice(0, 60))}
                className="w-full min-h-[50px] bg-white border-2 border-neutral-900 rounded-xl px-4 py-2.5 text-base font-bold text-neutral-950 focus:outline-none focus:ring-2 focus:ring-purple-600"
              />
            </div>

            {/* 4. UN SOLO BOTÓN PRINCIPAL DESTACADO */}
            <div className="pt-2">
              <button
                type="button"
                disabled={guardando || itemsActuales.length === 0 || totalActual <= 0}
                onClick={registrarVenta}
                className={`w-full min-h-[58px] py-4 rounded-2xl font-black text-lg flex items-center justify-between px-6 border-2 border-neutral-950 shadow-xl active:scale-[0.98] transition-all ${
                  !guardando && itemsActuales.length > 0 && totalActual > 0
                    ? 'bg-purple-700 hover:bg-purple-800 text-white cursor-pointer'
                    : 'bg-neutral-300 text-neutral-600 cursor-not-allowed border-neutral-400'
                }`}
              >
                <span>{guardando ? 'Guardando venta...' : ventaEnEdicion ? 'Guardar Cambios' : 'Confirmar y Cobrar Venta'}</span>
                <span className="bg-neutral-950 text-white px-4 py-1.5 rounded-xl text-xl font-black border border-purple-400">
                  {formatearMoneda(totalActual)}
                </span>
              </button>
            </div>
          </section>
        </div>
      )}

      {/* -------------------- VISTA 2: HISTORIAL Y AUDITORÍA -------------------- */}
      {seccion === 'historial' && (
        <div className="space-y-4">
          {/* BUSCADOR CON ETIQUETA VISIBLE */}
          <div className="bg-white p-5 rounded-3xl border-2 border-neutral-900 shadow-sm space-y-2">
            <label htmlFor="buscador-ventas" className="text-base font-black text-neutral-950 block">
              Buscar entre tus ventas:
            </label>
            <div className="relative">
              <Search size={22} className="absolute left-3.5 top-3.5 text-neutral-900 pointer-events-none" />
              <input
                id="buscador-ventas"
                type="text"
                placeholder="Escribí comida, cliente o nota..."
                value={busqueda}
                onChange={e => setBusqueda(e.target.value)}
                className="w-full min-h-[50px] bg-neutral-100 border-2 border-neutral-900 rounded-xl pl-11 pr-4 py-2 text-base font-bold text-neutral-950 focus:outline-none focus:ring-2 focus:ring-purple-600"
              />
            </div>
          </div>

          {/* 5. ESTADO VACÍO CUANDO NO HAY RESULTADOS */}
          {ventasFiltradas.length === 0 ? (
            <div className="bg-white rounded-3xl p-8 text-center border-2 border-neutral-900 shadow-sm space-y-3">
              <AlertCircle size={36} className="mx-auto text-neutral-700" />
              <h3 className="font-black text-neutral-950 text-lg">
                {ventas.length === 0
                  ? 'Todavía no registraste ninguna venta'
                  : 'No se encontró ninguna venta con esa búsqueda'}
              </h3>
              <p className="text-base text-neutral-800 font-medium max-w-xs mx-auto">
                {ventas.length === 0
                  ? 'Pasá a la pestaña Anotar Venta para cargar el primer pedido del negocio.'
                  : 'Probá borrando el texto del buscador para ver todas las ventas de la lista.'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {ventasFiltradas.map(v => {
                const esAnulada = v.estado === 'anulada';
                return (
                  <div
                    key={v.id}
                    className={`bg-white rounded-3xl p-5 border-2 transition-all ${
                      esAnulada
                        ? 'border-red-500 bg-red-50 opacity-80'
                        : 'border-neutral-900 shadow-sm'
                    }`}
                  >
                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-black text-base text-neutral-950">
                            Ticket #{v.id.slice(-6).toUpperCase()}
                          </span>
                          <span className="text-base font-bold text-neutral-700">
                            {formatearFecha(v.fecha)} • {formatearHora(v.fecha)}
                          </span>
                        </div>

                        <div className="mt-2 text-base font-bold text-neutral-950">
                          {v.items.map(i => `${i.cantidad}x ${i.nombre}`).join(' + ')}
                        </div>

                        {v.clienteONota && (
                          <div className="text-base text-neutral-900 bg-purple-100 border border-purple-800 px-3 py-1 rounded-xl mt-2 inline-block font-bold">
                            📝 {v.clienteONota}
                          </div>
                        )}
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-2xl font-black text-neutral-950 block">
                          {formatearMoneda(v.total)}
                        </span>
                        <span className="text-base font-bold text-purple-900 bg-purple-100 px-2 py-0.5 rounded-lg border border-purple-300 inline-block mt-1">
                          Efectivo
                        </span>
                      </div>
                    </div>

                    {/* BOTONES SECUNDARIOS DE ACCIÓN (MÍNIMO 44PX DE ALTO) */}
                    <div className="flex items-center justify-between mt-4 pt-3 border-t-2 border-neutral-200 flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => setVentaParaTicket(v)}
                        className="min-h-[44px] py-2 px-3 bg-neutral-100 hover:bg-neutral-200 text-neutral-950 text-base font-black rounded-xl border border-neutral-400 flex items-center gap-2"
                      >
                        <Receipt size={18} />
                        <span>Ver Ticket</span>
                      </button>

                      <div className="flex items-center gap-2">
                        {!esAnulada && (
                          <button
                            type="button"
                            onClick={() => iniciarEdicion(v)}
                            className="min-h-[44px] py-2 px-3 bg-purple-100 hover:bg-purple-200 text-purple-950 text-base font-black rounded-xl border border-purple-800 flex items-center gap-1.5"
                          >
                            <Edit2 size={16} />
                            <span>Editar</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm(`¿Seguro que deseas eliminar la venta por ${formatearMoneda(v.total)}?`)) {
                              onEliminarVenta(v.id);
                              mostrarMensaje('exito', 'Venta eliminada de la lista.');
                            }
                          }}
                          className="min-h-[44px] py-2 px-3 text-red-700 hover:text-red-900 hover:bg-red-50 text-base font-black rounded-xl border border-red-300 flex items-center gap-1.5"
                        >
                          <Trash2 size={16} />
                          <span>Borrar</span>
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
