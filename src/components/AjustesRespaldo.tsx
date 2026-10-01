/**
 * @file AjustesRespaldo.tsx
 * @description Gestión de respaldo de datos y configuración del catálogo de comidas para Mayeli.
 * Asegura el cumplimiento de la función 3: "Al cerrar la app se mantienen los datos de ventas".
 * 
 * ATENCIÓN - PUNTOS DONDE ALGUIEN SUELE EQUIVOCARSE:
 * 1. Importación de JSON corrupto o con estructura incompatible:
 *    Antes de sobrescribir el almacenamiento local con un archivo subido por el usuario,
 *    se debe verificar que sea un arreglo y que contenga los campos requeridos (`id`, `total`, `items`).
 * 2. Borrado accidental de datos:
 *    Siempre solicitar confirmación explícita con `window.confirm` antes de vaciar las ventas
 *    o restablecer datos de fábrica.
 */

import React, { useRef, useState } from 'react';
import { Venta, ProductoComida } from '../types';
import { exportarRespaldoJSON, exportarVentasCSV, formatearMoneda } from '../utils/storage';
import { exportarArchivoSQLite, importarArchivoSQLite, leerVentasSQLite } from '../services/sqliteDb';
import { generarVentasEjemplo } from '../data/initialData';
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
  const [alerta, setAlerta] = useState<{ tipo: 'exito' | 'error'; mensaje: string } | null>(null);

  // Estados para nuevo producto en el catálogo de Mayeli
  const [nuevoNombre, setNuevoNombre] = useState('');
  const [nuevoPrecio, setNuevoPrecio] = useState('');
  const [nuevoIcono, setNuevoIcono] = useState('🍲');

  const mostrarMensaje = (tipo: 'exito' | 'error', mensaje: string) => {
    setAlerta({ tipo, mensaje });
    setTimeout(() => setAlerta(null), 4000);
  };

  const manejarImportacionSQLite = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const archivo = e.target.files?.[0];
    if (!archivo) return;
    try {
      await importarArchivoSQLite(archivo);
      const ventasCargadas = await leerVentasSQLite();
      onRestablecerVentas(ventasCargadas);
      mostrarMensaje('exito', `¡Base de datos SQLite importada! (${ventasCargadas.length} ventas)`);
    } catch {
      mostrarMensaje('error', 'Error al leer el archivo .sqlite. Debe ser una base de datos SQLite válida.');
    }
    e.target.value = '';
  };

  // IMPORTAR RESPALDO JSON
  const manejarImportacion = (e: React.ChangeEvent<HTMLInputElement>) => {
    const archivo = e.target.files?.[0];
    if (!archivo) return;

    const lector = new FileReader();
    lector.onload = (evento) => {
      try {
        const contenido = evento.target?.result as string;
        const datos = JSON.parse(contenido);

        if (!Array.isArray(datos)) {
          throw new Error('El archivo no contiene un listado de ventas válido.');
        }

        // Validación básica de estructura
        const esValido = datos.every(item => item.id && typeof item.total === 'number' && Array.isArray(item.items));
        if (!esValido) {
          throw new Error('El formato interno de los datos no coincide con las ventas de CMR.');
        }

        onRestablecerVentas(datos);
        mostrarMensaje('exito', `¡Respaldo importado correctamente! Se cargaron ${datos.length} ventas.`);
      } catch (err) {
        mostrarMensaje('error', 'Error al leer el archivo. Asegúrate de seleccionar un respaldo .json válido.');
      }
    };
    lector.readAsText(archivo);
    e.target.value = ''; // Resetear input
  };

  // AGREGAR PLATO AL MENÚ
  const agregarPlatoAlMenu = (e: React.FormEvent) => {
    e.preventDefault();
    const precio = parseFloat(nuevoPrecio);
    if (!nuevoNombre.trim() || isNaN(precio) || precio <= 0) {
      mostrarMensaje('error', 'Por favor ingresa un nombre y precio válido.');
      return;
    }

    const nuevo: ProductoComida = {
      id: `prod_${Date.now()}`,
      nombre: nuevoNombre.trim(),
      precio: precio,
      categoria: 'almuerzos',
      icono: nuevoIcono
    };

    onActualizarProductos([...productos, nuevo]);
    setNuevoNombre('');
    setNuevoPrecio('');
    mostrarMensaje('exito', `Plato "${nuevo.nombre}" agregado al menú de venta rápida.`);
  };

  // ELIMINAR PLATO DEL MENÚ
  const eliminarPlato = (id: string) => {
    if (productos.length <= 1) {
      mostrarMensaje('error', 'Debes conservar al menos un plato en el menú.');
      return;
    }
    onActualizarProductos(productos.filter(p => p.id !== id));
  };

  return (
    <div className="space-y-5 pb-24">
      {/* ALERTA VISUAL */}
      {alerta && (
        <div
          className={`p-3.5 rounded-2xl flex items-center gap-2 text-xs sm:text-sm font-semibold shadow-sm animate-fadeIn ${
            alerta.tipo === 'exito'
              ? 'bg-emerald-500 text-white'
              : 'bg-red-500 text-white'
          }`}
        >
          {alerta.tipo === 'exito' ? <Check size={18} /> : <AlertTriangle size={18} />}
          <span>{alerta.mensaje}</span>
        </div>
      )}

      {/* ESTADO DE PERSISTENCIA LOCAL (REQUISITO 3) */}
      <div className="bg-white rounded-3xl p-5 border border-neutral-200 shadow-sm space-y-3">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center">
            <ShieldCheck size={22} />
          </div>
          <div>
            <h3 className="font-extrabold text-neutral-900 text-base">Tus Ventas Están Protegidas</h3>
            <p className="text-xs text-neutral-500">Guardado automático en la memoria de tu dispositivo</p>
          </div>
        </div>

        <div className="bg-neutral-50 rounded-2xl p-3.5 border border-neutral-100 flex items-center justify-between text-xs">
          <div>
            <span className="text-neutral-500 block">Ventas guardadas actualmente:</span>
            <span className="font-extrabold text-neutral-900 text-sm">{ventas.length} transacciones en efectivo</span>
          </div>
          <span className="bg-purple-100 text-purple-800 font-bold px-2.5 py-1 rounded-full text-[11px] flex items-center gap-1">
            <Database size={13} />
            Almacenamiento Activo
          </span>
        </div>

        <p className="text-xs text-neutral-600 leading-relaxed">
          Cada vez que registras o modificas una venta, CMR la guarda de inmediato en tu navegador. Puedes cerrar la app o apagar tu celular: tus datos se mantendrán listos para cuando vuelvas.
        </p>
      </div>

      {/* RESPALDO Y EXPORTACIÓN */}
      <div className="bg-white rounded-3xl p-5 border border-neutral-200 shadow-sm space-y-3">
        <h3 className="font-bold text-neutral-900 text-sm flex items-center gap-2">
          <Download size={16} className="text-purple-600" />
          Copias de Seguridad y Reportes
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {/* Exportar SQLite (.sqlite) */}
          <button
            onClick={() => exportarArchivoSQLite()}
            className="p-3.5 rounded-2xl border border-purple-300 bg-purple-50/70 hover:bg-purple-100/80 text-left flex items-center justify-between transition-all"
          >
            <div>
              <span className="font-bold text-neutral-900 text-xs block">Exportar Base SQLite (.sqlite)</span>
              <span className="text-[11px] text-purple-900">Archivo de base de datos relacional</span>
            </div>
            <HardDrive size={18} className="text-purple-700" />
          </button>

          {/* Exportar JSON */}
          <button
            onClick={() => exportarRespaldoJSON(ventas)}
            className="p-3.5 rounded-2xl border border-neutral-200 bg-neutral-50 hover:bg-neutral-100 text-left flex items-center justify-between transition-all"
          >
            <div>
              <span className="font-bold text-neutral-900 text-xs block">Descargar Copia (.json)</span>
              <span className="text-[11px] text-neutral-500">Para pasar tus ventas a otro celular</span>
            </div>
            <Download size={18} className="text-purple-700" />
          </button>

          {/* Exportar CSV / Excel */}
          <button
            onClick={() => exportarVentasCSV(ventas)}
            className="p-3.5 rounded-2xl border border-neutral-200 bg-neutral-50 hover:bg-neutral-100 text-left flex items-center justify-between transition-all"
          >
            <div>
              <span className="font-bold text-neutral-900 text-xs block">Exportar a Excel (.csv)</span>
              <span className="text-[11px] text-neutral-500">Tabla con fechas, platos y totales</span>
            </div>
            <FileSpreadsheet size={18} className="text-purple-700" />
          </button>
        </div>

        {/* Inputs ocultos para importar */}
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

        <div className="pt-2 flex flex-col sm:flex-row gap-2">
          <button
            onClick={() => archivoSqliteInputRef.current?.click()}
            className="flex-1 py-2.5 px-3 bg-purple-950 hover:bg-purple-900 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 border border-purple-700"
          >
            <HardDrive size={14} className="text-purple-300" />
            <span>Restaurar Archivo .SQLite</span>
          </button>

          <button
            onClick={() => archivoInputRef.current?.click()}
            className="flex-1 py-2.5 px-3 bg-neutral-950 hover:bg-black text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 border border-purple-900/60"
          >
            <Upload size={14} className="text-purple-400" />
            <span>Restaurar Copia JSON</span>
          </button>

          <button
            onClick={() => {
              if (window.confirm('¿Deseas recargar los datos de ejemplo del negocio de comida?')) {
                const ejemplo = generarVentasEjemplo();
                onRestablecerVentas(ejemplo);
                mostrarMensaje('exito', 'Se recargaron los datos de ejemplo.');
              }
            }}
            className="py-2.5 px-3 border border-neutral-200 text-neutral-700 hover:bg-neutral-100 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5"
          >
            <RotateCcw size={14} />
            <span>Recargar Datos de Ejemplo</span>
          </button>
        </div>
      </div>

      {/* GESTIÓN DEL MENÚ / PLATOS DE COMIDA DE MAYELI */}
      <div className="bg-white rounded-3xl p-5 border border-neutral-200 shadow-sm space-y-4">
        <div className="flex items-center gap-2">
          <Utensils size={16} className="text-purple-600" />
          <h3 className="font-bold text-neutral-900 text-sm">Gestionar Platos del Negocio</h3>
        </div>

        {/* Formulario para agregar plato al menú */}
        <form onSubmit={agregarPlatoAlMenu} className="bg-neutral-50 p-3 rounded-2xl border border-neutral-200 space-y-2">
          <span className="text-xs font-bold text-neutral-700 block">Agregar nuevo plato al menú</span>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
            <select
              value={nuevoIcono}
              onChange={e => setNuevoIcono(e.target.value)}
              className="bg-white border border-neutral-300 rounded-xl px-2 py-2 text-sm focus:outline-none"
            >
              <option value="🍲">🍲 Sopa / Olla</option>
              <option value="🥩">🥩 Carne / Milanesa</option>
              <option value="🥟">🥟 Empanadas</option>
              <option value="🌮">🌮 Tacos / Quesadillas</option>
              <option value="🍕">🍕 Pizza / Harinas</option>
              <option value="🥗">🥗 Ensalada</option>
              <option value="🥤">🥤 Bebidas</option>
              <option value="🍮">🍮 Postres</option>
              <option value="🍽️">🍽️ Plato</option>
            </select>
            <input
              type="text"
              placeholder="Nombre (ej: Pastel de Papa)"
              value={nuevoNombre}
              onChange={e => setNuevoNombre(e.target.value)}
              className="sm:col-span-2 bg-white border border-neutral-300 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-purple-600"
            />
            <div className="flex gap-2">
              <input
                type="number"
                placeholder="Precio $"
                value={nuevoPrecio}
                onChange={e => setNuevoPrecio(e.target.value)}
                className="w-full bg-white border border-neutral-300 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-purple-600"
              />
              <button
                type="submit"
                className="bg-purple-600 hover:bg-purple-700 text-white font-bold px-3 py-2 rounded-xl text-xs flex items-center justify-center shadow-xs"
              >
                <Plus size={16} />
              </button>
            </div>
          </div>
        </form>

        {/* Listado de platos configurados */}
        <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
          {productos.map(p => (
            <div
              key={p.id}
              className="flex items-center justify-between p-2.5 rounded-xl border border-neutral-100 bg-neutral-50 text-xs"
            >
              <div className="flex items-center gap-2 truncate">
                <span>{p.icono || '🍽️'}</span>
                <span className="font-semibold text-neutral-800 truncate">{p.nombre}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-neutral-900">{formatearMoneda(p.precio)}</span>
                <button
                  type="button"
                  onClick={() => eliminarPlato(p.id)}
                  className="text-neutral-400 hover:text-red-500 p-1"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
