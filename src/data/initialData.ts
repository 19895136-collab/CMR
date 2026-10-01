/**
 * @file initialData.ts
 * @description Catálogo base de comidas y datos iniciales de ventas de ejemplo.
 * 
 * ATENCIÓN - PUNTOS DONDE ALGUIEN SUELE EQUIVOCARSE:
 * 1. Generación dinámica de fechas: Si usamos fechas fijas como "2024-01-01",
 *    al abrir la app hoy el filtro "Hoy" aparecería en 0. Por eso, calculamos
 *    las fechas de prueba relativas al día actual (new Date()) con desplazamientos.
 * 2. Inmutabilidad de los datos: Al cargar los datos en memoria, siempre clonar
 *    o instanciar arreglos nuevos para evitar que mutaciones accidentales
 *    afecten a los valores por defecto.
 */

import { ProductoComida, Venta } from '../types';

// Catálogo sugerido para el negocio de comida de Mayeli
export const PRODUCTOS_INICIALES: ProductoComida[] = [
  { id: 'prod_1', nombre: 'Menú Ejecutivo del Día', precio: 120, categoria: 'almuerzos', icono: '🍲' },
  { id: 'prod_2', nombre: 'Milanesa con Guarnición', precio: 140, categoria: 'minutas', icono: '🥩' },
  { id: 'prod_3', nombre: 'Docena de Empanadas', precio: 160, categoria: 'empanadas', icono: '🥟' },
  { id: 'prod_4', nombre: 'Media Docena Empanadas', precio: 90, categoria: 'empanadas', icono: '🥟' },
  { id: 'prod_5', nombre: 'Tacos / Quesadillas (x3)', precio: 110, categoria: 'minutas', icono: '🌮' },
  { id: 'prod_6', nombre: 'Sopa Casera Calentita', precio: 70, categoria: 'almuerzos', icono: '🥣' },
  { id: 'prod_7', nombre: 'Refresco / Gaseosa 500ml', precio: 35, categoria: 'bebidas', icono: '🥤' },
  { id: 'prod_8', nombre: 'Agua de Sabor Natural 1L', precio: 40, categoria: 'bebidas', icono: '🧃' },
  { id: 'prod_9', nombre: 'Flan Casero con Caramelo', precio: 45, categoria: 'postres', icono: '🍮' },
  { id: 'prod_10', nombre: 'Porción Torta / Pastel', precio: 50, categoria: 'postres', icono: '🍰' },
];

/**
 * Genera ventas de ejemplo contextualizadas para que al abrir la app por primera vez,
 * Mayeli vea de inmediato gráficos interactivos vivos y datos realistas.
 */
export function generarVentasEjemplo(): Venta[] {
  const ahora = new Date();
  
  // Función auxiliar para restar horas o días manteniendo la fecha local correcta
  const crearFechaRelativa = (diasAtras: number, horasAtras: number = 0, minutosAtras: number = 0): Date => {
    const d = new Date(ahora.getTime());
    d.setDate(d.getDate() - diasAtras);
    d.setHours(d.getHours() - horasAtras);
    d.setMinutes(d.getMinutes() - minutosAtras);
    return d;
  };

  const ventas: Venta[] = [
    // Ventas de HOY
    {
      id: 'v_hoy_1',
      fecha: crearFechaRelativa(0, 1, 15).toISOString(),
      items: [
        { id: 'prod_1', nombre: 'Menú Ejecutivo del Día', precioUnitario: 120, cantidad: 2, subtotal: 240 },
        { id: 'prod_7', nombre: 'Refresco / Gaseosa 500ml', precioUnitario: 35, cantidad: 2, subtotal: 70 }
      ],
      total: 310,
      metodoPago: 'efectivo',
      montoRecibido: 500,
      vuelto: 190,
      clienteONota: 'Mesa 2 - Para almorzar aquí',
      estado: 'completada',
      creadaEn: crearFechaRelativa(0, 1, 15).getTime()
    },
    {
      id: 'v_hoy_2',
      fecha: crearFechaRelativa(0, 2, 40).toISOString(),
      items: [
        { id: 'prod_3', nombre: 'Docena de Empanadas', precioUnitario: 160, cantidad: 1, subtotal: 160 },
        { id: 'prod_9', nombre: 'Flan Casero con Caramelo', precioUnitario: 45, cantidad: 1, subtotal: 45 }
      ],
      total: 205,
      metodoPago: 'efectivo',
      montoRecibido: 300,
      vuelto: 95,
      clienteONota: 'Para llevar Don Ramón',
      estado: 'completada',
      creadaEn: crearFechaRelativa(0, 2, 40).getTime()
    },
    {
      id: 'v_hoy_3',
      fecha: crearFechaRelativa(0, 3, 10).toISOString(),
      items: [
        { id: 'prod_2', nombre: 'Milanesa con Guarnición', precioUnitario: 140, cantidad: 1, subtotal: 140 },
        { id: 'prod_8', nombre: 'Agua de Sabor Natural 1L', precioUnitario: 40, cantidad: 1, subtotal: 40 }
      ],
      total: 180,
      metodoPago: 'efectivo',
      montoRecibido: 200,
      vuelto: 20,
      clienteONota: 'Mesa 1',
      estado: 'completada',
      creadaEn: crearFechaRelativa(0, 3, 10).getTime()
    },
    {
      id: 'v_hoy_4',
      fecha: crearFechaRelativa(0, 4, 25).toISOString(),
      items: [
        { id: 'prod_5', nombre: 'Tacos / Quesadillas (x3)', precioUnitario: 110, cantidad: 2, subtotal: 220 },
        { id: 'prod_7', nombre: 'Refresco / Gaseosa 500ml', precioUnitario: 35, cantidad: 2, subtotal: 70 }
      ],
      total: 290,
      metodoPago: 'efectivo',
      montoRecibido: 300,
      vuelto: 10,
      clienteONota: 'Pedido telefónico - Retirado',
      estado: 'completada',
      creadaEn: crearFechaRelativa(0, 4, 25).getTime()
    },

    // Ventas de AYER (día -1)
    {
      id: 'v_ayer_1',
      fecha: crearFechaRelativa(1, 2, 0).toISOString(),
      items: [
        { id: 'prod_1', nombre: 'Menú Ejecutivo del Día', precioUnitario: 120, cantidad: 3, subtotal: 360 },
        { id: 'prod_8', nombre: 'Agua de Sabor Natural 1L', precioUnitario: 40, cantidad: 2, subtotal: 80 }
      ],
      total: 440,
      metodoPago: 'efectivo',
      montoRecibido: 500,
      vuelto: 60,
      clienteONota: 'Familia Gómez',
      estado: 'completada',
      creadaEn: crearFechaRelativa(1, 2, 0).getTime()
    },
    {
      id: 'v_ayer_2',
      fecha: crearFechaRelativa(1, 4, 30).toISOString(),
      items: [
        { id: 'prod_3', nombre: 'Docena de Empanadas', precioUnitario: 160, cantidad: 2, subtotal: 320 }
      ],
      total: 320,
      metodoPago: 'efectivo',
      montoRecibido: 350,
      vuelto: 30,
      clienteONota: 'Para llevar Doña Rosa',
      estado: 'completada',
      creadaEn: crearFechaRelativa(1, 4, 30).getTime()
    },
    {
      id: 'v_ayer_3',
      fecha: crearFechaRelativa(1, 6, 15).toISOString(),
      items: [
        { id: 'prod_6', nombre: 'Sopa Casera Calentita', precioUnitario: 70, cantidad: 2, subtotal: 140 },
        { id: 'prod_10', nombre: 'Porción Torta / Pastel', precioUnitario: 50, cantidad: 1, subtotal: 50 }
      ],
      total: 190,
      metodoPago: 'efectivo',
      montoRecibido: 200,
      vuelto: 10,
      clienteONota: 'Mesa 4',
      estado: 'completada',
      creadaEn: crearFechaRelativa(1, 6, 15).getTime()
    },

    // Ventas hace 2 días
    {
      id: 'v_d2_1',
      fecha: crearFechaRelativa(2, 3, 0).toISOString(),
      items: [
        { id: 'prod_2', nombre: 'Milanesa con Guarnición', precioUnitario: 140, cantidad: 2, subtotal: 280 },
        { id: 'prod_7', nombre: 'Refresco / Gaseosa 500ml', precioUnitario: 35, cantidad: 2, subtotal: 70 }
      ],
      total: 350,
      metodoPago: 'efectivo',
      montoRecibido: 400,
      vuelto: 50,
      clienteONota: 'Mesa 3',
      estado: 'completada',
      creadaEn: crearFechaRelativa(2, 3, 0).getTime()
    },
    {
      id: 'v_d2_2',
      fecha: crearFechaRelativa(2, 5, 0).toISOString(),
      items: [
        { id: 'prod_1', nombre: 'Menú Ejecutivo del Día', precioUnitario: 120, cantidad: 1, subtotal: 120 },
        { id: 'prod_9', nombre: 'Flan Casero con Caramelo', precioUnitario: 45, cantidad: 1, subtotal: 45 }
      ],
      total: 165,
      metodoPago: 'efectivo',
      montoRecibido: 200,
      vuelto: 35,
      clienteONota: 'Don Carlos',
      estado: 'completada',
      creadaEn: crearFechaRelativa(2, 5, 0).getTime()
    },

    // Ventas hace 3 días
    {
      id: 'v_d3_1',
      fecha: crearFechaRelativa(3, 4, 0).toISOString(),
      items: [
        { id: 'prod_3', nombre: 'Docena de Empanadas', precioUnitario: 160, cantidad: 3, subtotal: 480 }
      ],
      total: 480,
      metodoPago: 'efectivo',
      clienteONota: 'Reunión vecinos',
      estado: 'completada',
      creadaEn: crearFechaRelativa(3, 4, 0).getTime()
    },

    // Ventas hace 4 días
    {
      id: 'v_d4_1',
      fecha: crearFechaRelativa(4, 2, 30).toISOString(),
      items: [
        { id: 'prod_1', nombre: 'Menú Ejecutivo del Día', precioUnitario: 120, cantidad: 4, subtotal: 480 },
        { id: 'prod_7', nombre: 'Refresco / Gaseosa 500ml', precioUnitario: 35, cantidad: 4, subtotal: 140 }
      ],
      total: 620,
      metodoPago: 'efectivo',
      montoRecibido: 700,
      vuelto: 80,
      clienteONota: 'Taller mecánico de enfrente',
      estado: 'completada',
      creadaEn: crearFechaRelativa(4, 2, 30).getTime()
    },

    // Ventas hace 5 días
    {
      id: 'v_d5_1',
      fecha: crearFechaRelativa(5, 5, 0).toISOString(),
      items: [
        { id: 'prod_5', nombre: 'Tacos / Quesadillas (x3)', precioUnitario: 110, cantidad: 3, subtotal: 330 }
      ],
      total: 330,
      metodoPago: 'efectivo',
      clienteONota: 'Pedidos delivery',
      estado: 'completada',
      creadaEn: crearFechaRelativa(5, 5, 0).getTime()
    },

    // Ventas hace 6 días
    {
      id: 'v_d6_1',
      fecha: crearFechaRelativa(6, 3, 0).toISOString(),
      items: [
        { id: 'prod_2', nombre: 'Milanesa con Guarnición', precioUnitario: 140, cantidad: 2, subtotal: 280 },
        { id: 'prod_9', nombre: 'Flan Casero con Caramelo', precioUnitario: 45, cantidad: 1, subtotal: 90 }
      ],
      total: 370,
      metodoPago: 'efectivo',
      clienteONota: 'Mesa 5',
      estado: 'completada',
      creadaEn: crearFechaRelativa(6, 3, 0).getTime()
    }
  ];

  return ventas;
}
