/**
 * @file TicketModal.tsx
 * @description Vista previa de ticket de venta con texto nunca menor a 16px y alto contraste.
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

  const generarTextoRecibo = () => {
    const lineas = [
      `🍲 *CMR - COMIDA CASERA MAYELI*`,
      `📅 Fecha: ${formatearFecha(venta.fecha)} - ${formatearHora(venta.fecha)}`,
      `🧾 Ticket #${venta.id.slice(-6).toUpperCase()}`,
      `--------------------------------`,
      ...venta.items.map(item => `• ${item.cantidad}x ${item.nombre} = ${formatearMoneda(item.subtotal)}`),
      `--------------------------------`,
      `*TOTAL: ${formatearMoneda(venta.total)}*`,
      `💳 Pago: EFECTIVO`,
      venta.montoRecibido ? `💵 Pagó con: ${formatearMoneda(venta.montoRecibido)} | Vuelto: ${formatearMoneda(venta.vuelto || 0)}` : '',
      venta.clienteONota ? `📝 Nota: ${venta.clienteONota}` : '',
      `¡Muchas gracias por su compra!`
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
    }
  };

  const compartirWhatsApp = () => {
    const texto = encodeURIComponent(generarTextoRecibo());
    window.open(`https://api.whatsapp.com/send?text=${texto}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 animate-fadeIn">
      <div className="bg-white w-full max-w-sm rounded-3xl p-5 shadow-2xl border-4 border-neutral-950 relative max-h-[90vh] overflow-y-auto">
        {/* Botón cerrar táctil */}
        <button
          type="button"
          onClick={alCerrar}
          className="absolute top-4 right-4 text-neutral-950 bg-neutral-200 hover:bg-neutral-300 w-11 h-11 rounded-full flex items-center justify-center border-2 border-neutral-950"
          title="Cerrar ticket"
        >
          <X size={24} />
        </button>

        {/* Cabecera del ticket estilo papel de comida */}
        <div className="text-center pb-4 border-b-2 border-dashed border-neutral-400">
          <div className="w-14 h-14 bg-neutral-950 text-white rounded-2xl flex items-center justify-center mx-auto mb-2 border-2 border-purple-500">
            <Receipt size={28} />
          </div>
          <h3 className="font-black text-neutral-950 text-xl">Comida Casera Mayeli</h3>
          <p className="text-base text-neutral-800 font-bold">Ticket #{venta.id.slice(-6).toUpperCase()}</p>
          <p className="text-base text-neutral-700 font-semibold mt-1">
            {formatearFecha(venta.fecha)} • {formatearHora(venta.fecha)} hs
          </p>
        </div>

        {/* Detalle de productos con texto >= 16px */}
        <div className="py-4 space-y-3">
          {venta.items.map((item, idx) => (
            <div key={idx} className="flex justify-between items-start text-base border-b border-neutral-100 pb-2">
              <div className="pr-2">
                <span className="font-black text-neutral-950">{item.cantidad}x </span>
                <span className="font-bold text-neutral-900">{item.nombre}</span>
                <span className="text-base text-neutral-700 font-medium block">
                  a {formatearMoneda(item.precioUnitario)} c/u
                </span>
              </div>
              <span className="font-black text-neutral-950 whitespace-nowrap text-lg">
                {formatearMoneda(item.subtotal)}
              </span>
            </div>
          ))}
        </div>

        {/* Totales y Método de Pago */}
        <div className="pt-3 border-t-2 border-dashed border-neutral-400 space-y-2 text-base">
          <div className="flex justify-between items-center text-xl font-black text-neutral-950 bg-neutral-100 p-2.5 rounded-xl border border-neutral-300">
            <span>TOTAL COBRADO</span>
            <span className="text-purple-950 text-2xl font-black">{formatearMoneda(venta.total)}</span>
          </div>

          <div className="flex justify-between items-center text-neutral-950 font-bold">
            <span>Forma de Pago:</span>
            <span className="bg-purple-100 text-purple-950 px-3 py-1 rounded-xl border border-purple-800 font-black">
              Efectivo
            </span>
          </div>

          {venta.montoRecibido !== undefined && venta.montoRecibido > 0 && (
            <div className="flex justify-between text-neutral-950 font-bold">
              <span>Recibido: {formatearMoneda(venta.montoRecibido)}</span>
              <span className="text-purple-950 font-black">Vuelto: {formatearMoneda(venta.vuelto || 0)}</span>
            </div>
          )}

          {venta.clienteONota && (
            <div className="bg-purple-50 p-3 rounded-xl text-neutral-950 text-base border-2 border-purple-800 font-bold">
              <span className="block text-purple-900">Nota del pedido:</span>
              {venta.clienteONota}
            </div>
          )}
        </div>

        {/* ACCIONES: UN BOTÓN PRINCIPAL Y OTRO SECUNDARIO */}
        <div className="space-y-2 mt-5">
          <button
            type="button"
            onClick={compartirWhatsApp}
            className="w-full min-h-[50px] py-3 px-4 rounded-2xl text-white font-black text-base bg-purple-700 hover:bg-purple-800 flex items-center justify-center gap-2 border-2 border-neutral-950 shadow-md active:scale-98"
          >
            <Share2 size={20} />
            <span>Compartir por WhatsApp</span>
          </button>

          <button
            type="button"
            onClick={copiarAlPortapapeles}
            className="w-full min-h-[50px] py-3 px-4 rounded-2xl border-2 border-neutral-900 text-neutral-950 font-black text-base bg-neutral-100 hover:bg-neutral-200 flex items-center justify-center gap-2 active:scale-98"
          >
            {copiado ? <Check size={20} className="text-emerald-700" /> : <Copy size={20} />}
            <span>{copiado ? '¡Copiado con éxito!' : 'Copiar texto del ticket'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
