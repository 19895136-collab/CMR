/**
 * @file TicketModal.tsx
 * @description Vista previa de ticket de venta con opción de compartir por WhatsApp o copiar resumen.
 * 
 * ATENCIÓN - PUNTOS DONDE ALGUIEN SUELE EQUIVOCARSE:
 * 1. Formato de WhatsApp URL: Los caracteres especiales (saltos de línea, espacios, acentos)
 *    deben codificarse con `encodeURIComponent` para evitar que enlaces en dispositivos móviles
 *    fallen o se corten a la mitad.
 * 2. Bloqueo de clipboard: En navegadores móviles, `navigator.clipboard.writeText` puede fallar
 *    si no se ejecuta dentro de un evento de click directo del usuario.
 */

import React, { useState } from 'react';
import { Venta } from '../types';
import { formatearMoneda, formatearFecha, formatearHora } from '../utils/storage';
import { X, Check, Copy, Share2, Receipt } from 'lucide-react';

interface TicketModalProps {
  venta: Venta | null;
  alCerrar: () => void;
}

export const TicketModal: React.FC<TicketModalProps> = ({ venta, alCerrar }) => {
  const [copiado, setCopiado] = useState(false);

  if (!venta) return null;

  // Generar texto para compartir
  const generarTextoRecibo = () => {
    const lineas = [
      `🍲 *CMR - COMIDA CASERA MAYELI*`,
      `📅 Fecha: ${formatearFecha(venta.fecha)} - ${formatearHora(venta.fecha)}`,
      `🧾 Ticket #${venta.id.slice(-6).toUpperCase()}`,
      `--------------------------------`,
      ...venta.items.map(item => `• ${item.cantidad}x ${item.nombre} = ${formatearMoneda(item.subtotal)}`),
      `--------------------------------`,
      `*TOTAL: ${formatearMoneda(venta.total)}*`,
      `💳 Pago: ${venta.metodoPago.toUpperCase()}`,
      venta.montoRecibido ? `💵 Pagó con: ${formatearMoneda(venta.montoRecibido)} | Vuelto: ${formatearMoneda(venta.vuelto || 0)}` : '',
      venta.clienteONota ? `📝 Nota: ${venta.clienteONota}` : '',
      `¡Muchas gracias por su compra! ❤️`
    ].filter(Boolean);

    return lineas.join('\n');
  };

  const copiarAlPortapapeles = async () => {
    try {
      await navigator.clipboard.writeText(generarTextoRecibo());
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    } catch {
      // Fallback
      alert('Detalle copiado');
    }
  };

  const compartirWhatsApp = () => {
    const texto = encodeURIComponent(generarTextoRecibo());
    window.open(`https://api.whatsapp.com/send?text=${texto}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-white w-full max-w-sm rounded-3xl p-5 shadow-2xl border border-stone-200 relative">
        {/* Botón cerrar */}
        <button
          onClick={alCerrar}
          className="absolute top-4 right-4 text-stone-400 hover:text-stone-700 bg-stone-100 p-1.5 rounded-full"
        >
          <X size={18} />
        </button>

        {/* Cabecera del ticket estilo papel de comida */}
        <div className="text-center pb-4 border-b border-dashed border-stone-300">
          <div className="w-10 h-10 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center mx-auto mb-2">
            <Receipt size={22} />
          </div>
          <h3 className="font-extrabold text-stone-900 text-base">Comida Casera Mayeli</h3>
          <p className="text-xs text-stone-500">Ticket de Venta #{venta.id.slice(-6).toUpperCase()}</p>
          <p className="text-[11px] text-stone-400 mt-0.5">
            {formatearFecha(venta.fecha)} • {formatearHora(venta.fecha)} hs
          </p>
        </div>

        {/* Detalle de productos */}
        <div className="py-4 space-y-2 max-h-56 overflow-y-auto">
          {venta.items.map((item, idx) => (
            <div key={idx} className="flex justify-between items-start text-xs">
              <div className="pr-2">
                <span className="font-bold text-stone-800">{item.cantidad}x </span>
                <span className="text-stone-700">{item.nombre}</span>
                <span className="text-[10px] text-stone-400 block">
                  a {formatearMoneda(item.precioUnitario)} c/u
                </span>
              </div>
              <span className="font-bold text-stone-900 whitespace-nowrap">
                {formatearMoneda(item.subtotal)}
              </span>
            </div>
          ))}
        </div>

        {/* Totales y Método de Pago */}
        <div className="pt-3 border-t border-dashed border-stone-300 space-y-1.5 text-xs">
          <div className="flex justify-between items-center text-sm font-extrabold text-stone-900">
            <span>TOTAL COBRADO</span>
            <span className="text-orange-600 text-base">{formatearMoneda(venta.total)}</span>
          </div>

          <div className="flex justify-between text-stone-600 text-[11px]">
            <span>Forma de Pago:</span>
            <span className="font-semibold uppercase text-stone-800">{venta.metodoPago}</span>
          </div>

          {venta.montoRecibido !== undefined && venta.montoRecibido > 0 && (
            <div className="flex justify-between text-stone-600 text-[11px]">
              <span>Recibido: {formatearMoneda(venta.montoRecibido)}</span>
              <span className="text-emerald-700 font-bold">Vuelto: {formatearMoneda(venta.vuelto || 0)}</span>
            </div>
          )}

          {venta.clienteONota && (
            <div className="mt-2 bg-amber-50 p-2 rounded-lg text-amber-900 text-[11px]">
              <span className="font-bold">Nota/Cliente: </span>
              {venta.clienteONota}
            </div>
          )}

          {venta.estado === 'anulada' && (
            <div className="mt-2 bg-red-100 text-red-700 p-2 rounded-lg text-center font-bold text-xs">
              ⚠️ VENTA ANULADA
            </div>
          )}
        </div>

        {/* Acciones para celular */}
        <div className="grid grid-cols-2 gap-2 mt-5">
          <button
            onClick={copiarAlPortapapeles}
            className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl border border-stone-200 text-stone-700 font-bold text-xs bg-stone-50 active:bg-stone-100"
          >
            {copiado ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
            <span>{copiado ? '¡Copiado!' : 'Copiar'}</span>
          </button>

          <button
            onClick={compartirWhatsApp}
            className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-white font-bold text-xs bg-emerald-600 active:bg-emerald-700 shadow-xs"
          >
            <Share2 size={14} />
            <span>WhatsApp</span>
          </button>
        </div>
      </div>
    </div>
  );
};
