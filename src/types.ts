/**
 * @file types.ts
 * @description Definiciones de tipos TypeScript para la aplicación CMR de Mayeli.
 * 
 * ATENCIÓN - PUNTOS DONDE ALGUIEN SUELE EQUIVOCARSE:
 * 1. Monedas y Precios: Siempre trabajar con números decimales limpios (number).
 *    Nunca guardar símbolos de moneda ($) dentro del dato numérico.
 * 2. Fechas: Guardar siempre en formato ISO 8601 string (ej: "2026-10-01T13:45:00.000Z")
 *    o timestamp numérico. Esto evita discrepancias entre navegadores y zonas horarias.
 * 3. Identificadores: Generar IDs únicos usando crypto.randomUUID() o combinaciones
 *    únicas con timestamp para evitar colisiones al registrar varias ventas seguidas.
 */

// Métodos de pago comunes en negocios de comida de barrio
export type MetodoPago = 'efectivo' | 'transferencia' | 'tarjeta';

// Categorías de comida para clasificar los platos
export type CategoriaComida = 'almuerzos' | 'minutas' | 'empanadas' | 'bebidas' | 'postres' | 'otros';

// Detalle de un producto individual dentro de una venta
export interface ItemVenta {
  id: string;
  nombre: string;
  precioUnitario: number;
  cantidad: number;
  subtotal: number;
}

// Estructura completa de una Venta registrada
export interface Venta {
  id: string;
  fecha: string; // Formato ISO 8601 string
  items: ItemVenta[];
  total: number;
  metodoPago: MetodoPago;
  montoRecibido?: number; // Para cálculo de vuelto en efectivo
  vuelto?: number;
  clienteONota?: string; // Ejemplo: "Mesa 4", "Para llevar Don Carlos", "Sin cebolla"
  estado: 'completada' | 'anulada';
  creadaEn: number; // Timestamp Unix para ordenamiento veloz
}

// Producto del catálogo rápido de comida
export interface ProductoComida {
  id: string;
  nombre: string;
  precio: number;
  categoria: CategoriaComida;
  icono?: string;
}

// Filtros de período de tiempo para el resumen y gráficos inteligentes
export type PeriodoFiltro = 'hoy' | '7dias' | 'mes' | 'todos';
