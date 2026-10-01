/**
 * @file AjustesRespaldo.tsx
 * @description Pantalla de Respaldo y Menú adaptada a los 6 requisitos de interfaz:
 * - 320px responsive sin zoom.
 * - Texto de 16px o más con alto contraste para sol.
 * - Todos los campos con etiqueta visible.
 * - Un solo botón principal destacado ("Descargar Respaldo SQLite").
 * - Mensajes en español cotidiano sin tecnicismos.
 */

import React, { useRef, useState } from 'react';
import { Venta, ProductoComida } from '../types';
import { exportarRespaldoJSON, exportarVentasCSV, formatearMoneda } from '../utils/storage';
import { exportarArchivoSQLite, importarArchivoSQLite, leerVentasSQLite } from '../services/sqliteDb';
import { generarVentasEjemplo } from '../data/initialData';
import { PWAInstallButton } from './PWAInstallButton';
import { 
  Database, Download, Upload, FileSpreadsheet, 
  RotateCcw, Check, AlertTriangle, ShieldCheck, 
  Plus, Trash2, Utensils, HardDrive
} from 'lucide-react';

interface AjustesRespaldoProps {
  ventas: Venta[];
  productos: ProductoComida[];
  onRestablecerVentas: (nuevasVentas: Venta[]) => void;
  onActualizarProductos: (nuevosProductos: ProductoComida[]) => void;
}

export const AjustesRespaldo: React.FC<AjustesRespaldoProps> = ({
  ventas,
  productos,
  onRestablecerVentas,
  onActualizarProductos,
}) => {
  const archivoInputRef = useRef<HTMLInputElement>(null);
  const archivoSqliteInputRef = useRef<HTMLInputElement>(null);
  
  // 6. MENSAJES CLAROS DE ÉXITO O ERROR
  const [notificacion, setNotificacion] = useState<{ tipo: 'exito' | 'error'; mensaje: string } | null>(null);

  const [nuevoNombre, setNuevoNombre] = useState('');
  const [nuevoPrecio, setNuevoPrecio] = useState('');
  const [nuevoIcono, setNuevoIcono] = useState('🍲');

  const mostrarMensaje = (tipo: 'exito' | 'error', mensaje: string) => {
    setNotificacion({ tipo, mensaje });
    setTimeout(() => setNotificacion(null), 4000);
  };

  const manejarImportacionSQLite = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const archivo = e.target.files?.[0];
    if (!archivo) return;
    try {
      await importarArchivoSQLite(archivo);
      const ventasCargadas = await leerVentasSQLite();
      onRestablecerVentas(ventasCargadas);
      mostrarMensaje('exito', `¡Copia cargada con éxito! Se recuperaron ${ventasCargadas.length} ventas.`);
    } catch {
      mostrarMensaje('error', 'No se pudo leer el archivo. Asegurate de elegir un respaldo de la app.');
    }
    e.target.value = '';
  };

  const manejarImportacion = (e: React.ChangeEvent<HTMLInputElement>) => {
    const archivo = e.target.files?.[0];
    if (!archivo) return;

    const lector = new FileReader();
    lector.onload = (evento) => {
      try {
        const contenido = evento.target?.result as string;
        const datos = JSON.parse(contenido);
        if (!Array.isArray(datos)) throw new Error('No es lista');

        // Validación estricta para evitar datos corruptos o incompletos
        const ventasValidas: Venta[] = datos.filter(
          v => v && typeof v === 'object' && typeof v.id === 'string' && typeof v.total === 'number' && Array.isArray(v.items)
        );

        if (ventasValidas.length === 0 && datos.length > 0) {
          throw new Error('Formato corrupto');
        }

        onRestablecerVentas(ventasValidas);
        mostrarMensaje('exito', `¡Copia de seguridad cargada! Se restauraron ${ventasValidas.length} ventas.`);
      } catch {
        mostrarMensaje('error', 'El archivo no contiene un formato de ventas válido o está dañado.');
      }
    };
    lector.readAsText(archivo);
    e.target.value = '';
  };

  const agregarPlatoAlMenu = (e: React.FormEvent) => {
    e.preventDefault();
    const nombreLimpio = nuevoNombre.replace(/[\u200B-\u200D\uFEFF]/g, '').trim().slice(0, 45);
    const precio = parseFloat(nuevoPrecio);

    if (nombreLimpio.length < 2) {
      mostrarMensaje('error', 'Escribí un nombre de comida válido (al menos 2 letras).');
      return;
    }
    if (isNaN(precio) || precio <= 0 || precio > 500000) {
      mostrarMensaje('error', 'Ingresá un precio válido entre $1 y $500.000.');
      return;
    }

    const nuevo: ProductoComida = {
      id: `prod_${Date.now()}`,
      nombre: nombreLimpio,
      precio: precio,
      categoria: 'almuerzos',
      icono: nuevoIcono
    };

    onActualizarProductos([...productos, nuevo]);
    setNuevoNombre('');
    setNuevoPrecio('');
    mostrarMensaje('exito', `¡Plato "${nuevo.nombre}" sumado a tu menú!`);
  };

  const eliminarPlato = (id: string) => {
    if (productos.length <= 1) {
      mostrarMensaje('error', 'Tenés que conservar al menos una comida en la lista.');
      return;
    }
    onActualizarProductos(productos.filter(p => p.id !== id));
    mostrarMensaje('exito', 'Comida quitada del menú.');
  };

  return (
    <div className="space-y-6 pb-28">
      {/* 6. MENSAJES CLAROS DE ÉXITO O ERROR */}
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
              <Check size={24} className="shrink-0" />
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

      {/* INSTALACIÓN EN EL TELÉFONO */}
      <PWAInstallButton variante="banner" />

      {/* ESTADO DEL GUARDADO PERMANENTE */}
      <section className="bg-white rounded-3xl p-5 border-2 border-neutral-900 shadow-sm space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-neutral-950 text-white flex items-center justify-center shrink-0">
            <ShieldCheck size={26} className="text-purple-400" />
          </div>
          <div>
            <h3 className="font-black text-neutral-950 text-xl">Tus Ventas Están Seguras</h3>
            <p className="text-base text-neutral-800 font-medium">Guardado automático en tu teléfono</p>
          </div>
        </div>

        <div className="bg-neutral-100 rounded-2xl p-4 border-2 border-neutral-300 flex justify-between items-center">
          <div>
            <span className="text-base font-bold text-neutral-700 block">Total anotadas:</span>
            <span className="text-xl font-black text-neutral-950">{ventas.length} comidas cobradas</span>
          </div>
          <span className="bg-emerald-700 text-white font-black text-base px-3 py-1.5 rounded-xl border border-neutral-900">
            Activo
          </span>
        </div>

        <p className="text-base text-neutral-900 font-medium leading-relaxed">
          Cada vez que cobrás o corregís una venta, la app la guarda en la memoria de este celular. Podés cerrar la pantalla: tus datos no se borran.
        </p>
      </section>

      {/* COPIAS DE SEGURIDAD Y DESCARGAS */}
      <section className="bg-white rounded-3xl p-5 border-2 border-neutral-900 shadow-sm space-y-4">
        <div>
          <h3 className="font-black text-neutral-950 text-xl flex items-center gap-2">
            <Download size={22} className="text-purple-700" />
            <span>Copias de Respaldo para llevar</span>
          </h3>
          <p className="text-base text-neutral-800 font-medium">
            Guardá una copia por si cambiás de celular o querés ver tus ventas en la computadora.
          </p>
        </div>

        {/* 4. UN SOLO BOTÓN PRINCIPAL DESTACADO EN LA PANTALLA */}
        <button
          type="button"
          onClick={() => {
            exportarArchivoSQLite();
            mostrarMensaje('exito', '¡Archivo de base de datos descargado con éxito!');
          }}
          className="w-full min-h-[58px] py-4 px-5 bg-purple-700 hover:bg-purple-800 text-white font-black text-lg rounded-2xl border-2 border-neutral-950 shadow-lg flex items-center justify-between active:scale-98 transition-all"
        >
          <div className="flex items-center gap-3">
            <HardDrive size={24} className="text-purple-200" />
            <span>Descargar Respaldo Completo</span>
          </div>
          <span className="bg-neutral-950 text-white text-base font-bold px-3 py-1 rounded-xl">
            .sqlite
          </span>
        </button>

        {/* BOTONES SECUNDARIOS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
          <button
            type="button"
            onClick={() => exportarVentasCSV(ventas)}
            className="min-h-[50px] p-3.5 rounded-2xl border-2 border-neutral-900 bg-neutral-100 hover:bg-neutral-200 text-left flex items-center justify-between transition-all"
          >
            <div>
              <span className="font-black text-neutral-950 text-base block">Ver en Planilla Excel</span>
              <span className="text-base text-neutral-700 font-medium">Archivo .csv para abrir</span>
            </div>
            <FileSpreadsheet size={22} className="text-neutral-950 shrink-0" />
          </button>

          <button
            type="button"
            onClick={() => exportarRespaldoJSON(ventas)}
            className="min-h-[50px] p-3.5 rounded-2xl border-2 border-neutral-900 bg-neutral-100 hover:bg-neutral-200 text-left flex items-center justify-between transition-all"
          >
            <div>
              <span className="font-black text-neutral-950 text-base block">Copia Liviana</span>
              <span className="text-base text-neutral-700 font-medium">Archivo .json</span>
            </div>
            <Download size={22} className="text-neutral-950 shrink-0" />
          </button>
        </div>

        {/* Inputs ocultos para restaurar */}
        <input
          ref={archivoInputRef}
          type="file"
          accept=".json"
          onChange={manejarImportacion}
          className="hidden"
        />
        <input
          ref={archivoSqliteInputRef}
          type="file"
          accept=".sqlite,.db"
          onChange={manejarImportacionSQLite}
          className="hidden"
        />

        <div className="pt-2 flex flex-col sm:flex-row gap-2.5">
          <button
            type="button"
            onClick={() => archivoSqliteInputRef.current?.click()}
            className="min-h-[48px] flex-1 py-3 px-4 bg-neutral-950 hover:bg-black text-white rounded-xl text-base font-black flex items-center justify-center gap-2 border-2 border-neutral-950 shadow-sm"
          >
            <Upload size={18} />
            <span>Restaurar Copia desde Archivo</span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (window.confirm('¿Deseas volver a cargar los datos de ejemplo del negocio?')) {
                const ejemplo = generarVentasEjemplo();
                onRestablecerVentas(ejemplo);
                mostrarMensaje('exito', 'Se recargaron los datos de ejemplo.');
              }
            }}
            className="min-h-[48px] py-3 px-4 border-2 border-neutral-900 text-neutral-950 hover:bg-neutral-100 rounded-xl text-base font-black flex items-center justify-center gap-2"
          >
            <RotateCcw size={18} />
            <span>Recargar Ejemplos</span>
          </button>
        </div>
      </section>

      {/* 3. ADMINISTRAR PLATOS CON ETIQUETAS VISIBLES */}
      <section className="bg-white rounded-3xl p-5 border-2 border-neutral-900 shadow-sm space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-900 border border-neutral-900 flex items-center justify-center shrink-0">
            <Utensils size={24} />
          </div>
          <div>
            <h3 className="font-black text-neutral-950 text-xl">Platos de tu Menú</h3>
            <p className="text-base text-neutral-800 font-medium">Modificá o sumá comidas para cobrar rápido</p>
          </div>
        </div>

        <form onSubmit={agregarPlatoAlMenu} className="bg-neutral-100 p-4 rounded-2xl border-2 border-neutral-900 space-y-3">
          <span className="text-base font-black text-neutral-950 block">Agregar nueva comida fija:</span>

          <div>
            <label htmlFor="icono-plato" className="text-base font-bold text-neutral-950 block mb-1">
              Dibujo o ícono:
            </label>
            <select
              id="icono-plato"
              value={nuevoIcono}
              onChange={e => setNuevoIcono(e.target.value)}
              className="w-full min-h-[48px] bg-white border-2 border-neutral-900 rounded-xl px-3 py-2 text-base font-black focus:outline-none"
            >
              <option value="🍲">🍲 Sopa / Guiso</option>
              <option value="🥩">🥩 Milanesa / Carne</option>
              <option value="🥟">🥟 Empanadas</option>
              <option value="🌮">🌮 Tacos / Quesadillas</option>
              <option value="🍕">🍕 Pizza / Empanadas</option>
              <option value="🥗">🥗 Ensalada</option>
              <option value="🥤">🥤 Bebidas</option>
              <option value="🍮">🍮 Postres</option>
              <option value="🍽️">🍽️ Plato</option>
            </select>
          </div>

          <div>
            <label htmlFor="nombre-nuevo-plato" className="text-base font-bold text-neutral-950 block mb-1">
              Nombre de la comida:
            </label>
            <input
              id="nombre-nuevo-plato"
              type="text"
              maxLength={45}
              placeholder="Ej: Pastel de Papa"
              value={nuevoNombre}
              onChange={e => setNuevoNombre(e.target.value.slice(0, 45))}
              className="w-full min-h-[48px] bg-white border-2 border-neutral-900 rounded-xl px-4 py-2.5 text-base font-bold text-neutral-950 focus:outline-none focus:ring-2 focus:ring-purple-600"
            />
          </div>

          <div>
            <label htmlFor="precio-nuevo-plato" className="text-base font-bold text-neutral-950 block mb-1">
              Precio en pesos ($):
            </label>
            <input
              id="precio-nuevo-plato"
              type="number"
              min="1"
              max="500000"
              placeholder="Ej: 140"
              value={nuevoPrecio}
              onKeyDown={e => {
                if (['-', '+', 'e', 'E'].includes(e.key)) e.preventDefault();
              }}
              onChange={e => setNuevoPrecio(e.target.value.slice(0, 7))}
              className="w-full min-h-[48px] bg-white border-2 border-neutral-900 rounded-xl px-4 py-2.5 text-base font-bold text-neutral-950 focus:outline-none focus:ring-2 focus:ring-purple-600"
            />
          </div>

          <button
            type="submit"
            className="w-full min-h-[48px] bg-neutral-950 hover:bg-black text-white font-black text-base py-3 rounded-xl border border-neutral-950 shadow-sm flex items-center justify-center gap-2"
          >
            <Plus size={20} />
            <span>Guardar comida en el menú</span>
          </button>
        </form>

        {/* LISTADO DE COMIDAS GUARDADAS */}
        <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
          {productos.map(p => (
            <div
              key={p.id}
              className="flex items-center justify-between p-3 rounded-2xl border-2 border-neutral-900 bg-neutral-50 text-base"
            >
              <div className="flex items-center gap-3 truncate">
                <span className="text-2xl">{p.icono || '🍽️'}</span>
                <span className="font-black text-neutral-950 truncate">{p.nombre}</span>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="font-black text-neutral-950 text-lg">{formatearMoneda(p.precio)}</span>
                <button
                  type="button"
                  onClick={() => eliminarPlato(p.id)}
                  className="w-10 h-10 flex items-center justify-center text-red-700 hover:text-red-900 hover:bg-red-50 rounded-xl border border-red-300"
                  title="Eliminar plato"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
