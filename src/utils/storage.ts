/**
 * @file storage.ts
 * @description Gestión de persistencia local (LocalStorage) y utilidades de formato.
 * 
 * ATENCIÓN - PUNTOS DONDE ALGUIEN SUELE EQUIVOCARSE:
 * 1. window.localStorage en entornos SSR / navegadores en incógnito:
 *    Siempre envolver el acceso a localStorage en bloques try/catch.
 *    Si el almacenamiento está bloqueado o lleno (QuotaExceededError),
 *    la aplicación NO debe colapsar.
 * 2. JSON.parse corrupto: Si el usuario borró parcialmente la caché o el dato
 *    se guardó truncado, JSON.parse lanzará una excepción. Se debe capturar
 *    y retornar el valor por defecto seguro.
 * 3. Formateo de monedas: Nunca hacer `'$' + monto` directamente porque si `monto`
 *    es NaN, undefined o tiene demasiados decimales (ej. 19.999999999999), se
 *    rompe la interfaz visual. Usar siempre formateador seguro con respaldo a 0.
 */

import { ProductoComida, Venta } from '../types';
import { PRODUCTOS_INICIALES, generarVentasEjemplo } from '../data/initialData';

const CLAVE_STORAGE_VENTAS = 'cmr_mayeli_ventas_v1';
const CLAVE_STORAGE_PRODUCTOS = 'cmr_mayeli_productos_v1';

/**
 * Carga las ventas desde el almacenamiento local.
 * Si es la primera vez que se abre la app, inicializa con datos de ejemplo
 * para que Mayeli vea de inmediato los gráficos inteligentes activos.
 */
export function cargarVentas(): Venta[] {
  try {
    const datosGuardados = localStorage.getItem(CLAVE_STORAGE_VENTAS);
    if (!datosGuardados) {
      const datosIniciales = generarVentasEjemplo();
      guardarVentas(datosIniciales);
      return datosIniciales;
    }
    const parseados = JSON.parse(datosGuardados);
    if (!Array.isArray(parseados)) {
      console.warn('Los datos de ventas guardados no son un arreglo válido. Reinicializando.');
      return generarVentasEjemplo();
    }
    return parseados;
  } catch (error) {
    console.error('Error al leer ventas de localStorage:', error);
    return generarVentasEjemplo();
  }
}

/**
 * Guarda el listado de ventas en localStorage.
 * Retorna true si tuvo éxito o false si hubo un problema de cuota.
 */
export function guardarVentas(ventas: Venta[]): boolean {
  try {
    localStorage.setItem(CLAVE_STORAGE_VENTAS, JSON.stringify(ventas));
    return true;
  } catch (error) {
    console.error('Error al guardar ventas en localStorage:', error);
    return false;
  }
}

/**
 * Carga el catálogo de productos de comida de Mayeli.
 */
export function cargarProductos(): ProductoComida[] {
  try {
    const datos = localStorage.getItem(CLAVE_STORAGE_PRODUCTOS);
    if (!datos) {
      guardarProductos(PRODUCTOS_INICIALES);
      return PRODUCTOS_INICIALES;
    }
    const parseados = JSON.parse(datos);
    return Array.isArray(parseados) && parseados.length > 0 ? parseados : PRODUCTOS_INICIALES;
  } catch (error) {
    console.error('Error al leer productos:', error);
    return PRODUCTOS_INICIALES;
  }
}

/**
 * Guarda el catálogo de productos en localStorage.
 */
export function guardarProductos(productos: ProductoComida[]): boolean {
  try {
    localStorage.setItem(CLAVE_STORAGE_PRODUCTOS, JSON.stringify(productos));
    return true;
  } catch (error) {
    console.error('Error al guardar productos:', error);
    return false;
  }
}

/**
 * Formatea un número a moneda de manera confiable y segura contra NaN/undefined.
 * Ejemplo: 1250 -> "$ 1,250"
 */
export function formatearMoneda(monto: number | undefined | null): string {
  if (typeof monto !== 'number' || isNaN(monto)) {
    return '$ 0';
  }
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    maximumFractionDigits: 0,
    minimumFractionDigits: 0
  }).format(monto).replace('MXN', '$').trim();
}

/**
 * Formatea una fecha ISO a texto legible en español.
 * Evita desfasajes de zona horaria mostrando día, mes y año local.
 */
export function formatearFecha(fechaIso: string): string {
  try {
    const fecha = new Date(fechaIso);
    if (isNaN(fecha.getTime())) return 'Fecha inválida';
    return fecha.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  } catch {
    return 'Fecha inválida';
  }
}

/**
 * Formatea la hora de una fecha ISO.
 * Ejemplo: "13:45"
 */
export function formatearHora(fechaIso: string): string {
  try {
    const fecha = new Date(fechaIso);
    if (isNaN(fecha.getTime())) return '--:--';
    return fecha.toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  } catch {
    return '--:--';
  }
}

/**
 * Descarga una copia de seguridad en formato JSON de todas las ventas.
 */
export function exportarRespaldoJSON(ventas: Venta[]): void {
  const blob = new Blob([JSON.stringify(ventas, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `CMR_Ventas_Mayeli_${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Exporta las ventas a formato CSV para abrir directamente en Microsoft Excel o Google Sheets.
 */
export function exportarVentasCSV(ventas: Venta[]): void {
  const encabezados = ['ID', 'Fecha', 'Hora', 'Productos', 'Total', 'MetodoPago', 'Estado', 'ClienteONota'];
  const filas = ventas.map(v => {
    const fecha = formatearFecha(v.fecha);
    const hora = formatearHora(v.fecha);
    const productosTexto = v.items.map(i => `${i.cantidad}x ${i.nombre}`).join(' + ').replace(/"/g, '""');
    const notaLimpia = (v.clienteONota || '').replace(/"/g, '""');
    return `"${v.id}","${fecha}","${hora}","${productosTexto}",${v.total},"${v.metodoPago}","${v.estado}","${notaLimpia}"`;
  });

  const contenido = [encabezados.join(','), ...filas].join('\n');
  const blob = new Blob(['\uFEFF' + contenido], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `CMR_Ventas_Mayeli_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
