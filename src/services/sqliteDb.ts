/**
 * @file sqliteDb.ts
 * @description Motor de base de datos SQLite para la app CMR de Mayeli.
 * Resuelve el problema de carga WASM validando el encabezado binario (magic word 00 61 73 6d)
 * y proveyendo respaldo automático transparente si el navegador devuelve HTML por error de ruta.
 */

import initSqlJs, { Database, SqlJsStatic } from 'sql.js';
import { Venta, ProductoComida } from '../types';
import { generarVentasEjemplo, PRODUCTOS_INICIALES } from '../data/initialData';
import { cargarVentas, guardarVentas, cargarProductos, guardarProductos } from '../utils/storage';

let dbInstancia: Database | null = null;
let sqlEngine: SqlJsStatic | null = null;
let sqliteActivo = false;

const NOMBRE_DB_INDEXED = 'CMR_SQLite_Storage';
const STORE_NAME = 'sqlite_bytes';
const CLAVE_BYTES = 'database_sqlite_bin';

// --- PERSISTENCIA EN INDEXEDDB DEL BINARIO SQLITE ---

function abrirIndexedDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(NOMBRE_DB_INDEXED, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function guardarBytesEnIndexedDB(bytes: Uint8Array): Promise<void> {
  try {
    const idb = await abrirIndexedDB();
    return new Promise((resolve, reject) => {
      const tx = idb.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.put(bytes, CLAVE_BYTES);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('Persistencia en IndexedDB:', err);
  }
}

async function cargarBytesDeIndexedDB(): Promise<Uint8Array | null> {
  try {
    const idb = await abrirIndexedDB();
    return new Promise((resolve) => {
      const tx = idb.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(CLAVE_BYTES);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

/**
 * Valida si un buffer es realmente un binario WebAssembly válido.
 * El magic number de WebAssembly son los primeros 4 bytes: 0x00 0x61 0x73 0x6d (\0asm).
 * Si el servidor devolvió HTML (0x3c 0x21 0x64 0x6f = '<!do'), esta función lo detecta y rechaza
 * para evitar el error de 'magic word' en la consola.
 */
function esWasmValido(buffer: ArrayBuffer): boolean {
  if (!buffer || buffer.byteLength < 4) return false;
  const bytes = new Uint8Array(buffer, 0, 4);
  return bytes[0] === 0x00 && bytes[1] === 0x61 && bytes[2] === 0x73 && bytes[3] === 0x6d;
}

/**
 * Obtiene el binario WASM de forma segura evitando respuestas HTML de fallback SPA.
 */
async function obtenerWasmBinary(): Promise<ArrayBuffer | null> {
  // 1. Intentar archivo local del servidor web
  try {
    const res = await fetch('/sql-wasm.wasm', { cache: 'no-cache' });
    if (res.ok) {
      const buffer = await res.arrayBuffer();
      if (esWasmValido(buffer)) {
        return buffer;
      }
    }
  } catch {
    // Continuar con CDN
  }

  // 2. Intentar CDN de sql.js oficial
  const urlsCDN = [
    'https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.12.0/sql-wasm.wasm',
    'https://sql.js.org/dist/sql-wasm.wasm'
  ];

  for (const url of urlsCDN) {
    try {
      const res = await fetch(url);
      if (res.ok) {
        const buffer = await res.arrayBuffer();
        if (esWasmValido(buffer)) {
          return buffer;
        }
      }
    } catch {
      // Probar siguiente
    }
  }

  return null;
}

/**
 * Inicializa el motor de WebAssembly SQLite de manera segura.
 */
async function cargarSqlEngine(): Promise<SqlJsStatic | null> {
  if (sqlEngine) return sqlEngine;

  try {
    const wasmBinary = await obtenerWasmBinary();
    if (wasmBinary) {
      sqlEngine = await initSqlJs({ wasmBinary });
      return sqlEngine;
    }
  } catch (err) {
    console.warn('Fallo al compilar WASM binario, intentando locateFile CDN:', err);
  }

  try {
    sqlEngine = await initSqlJs({
      locateFile: () => 'https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.12.0/sql-wasm.wasm'
    });
    return sqlEngine;
  } catch (err) {
    console.warn('SQLite WebAssembly no pudo inicializarse en este entorno.', err);
    return null;
  }
}

/**
 * Inicializa la base de datos SQLite y crea las tablas si no existen.
 * Si WebAssembly no está disponible, activa el modo de respaldo transparente en LocalStorage.
 */
export async function inicializarSQLite(): Promise<Database | null> {
  if (dbInstancia) return dbInstancia;

  const SQL = await cargarSqlEngine();
  if (!SQL) {
    sqliteActivo = false;
    return null;
  }

  try {
    const bytesGuardados = await cargarBytesDeIndexedDB();

    if (bytesGuardados && bytesGuardados.length > 0) {
      try {
        dbInstancia = new SQL.Database(bytesGuardados);
      } catch {
        dbInstancia = new SQL.Database();
      }
    } else {
      dbInstancia = new SQL.Database();
    }

    // Crear tablas relacionales SQLite
    dbInstancia.run(`
      CREATE TABLE IF NOT EXISTS ventas (
        id TEXT PRIMARY KEY,
        fecha TEXT NOT NULL,
        total REAL NOT NULL,
        metodo_pago TEXT NOT NULL,
        monto_recibido REAL,
        vuelto REAL,
        cliente_o_nota TEXT,
        estado TEXT NOT NULL,
        creada_en INTEGER NOT NULL,
        items_json TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS productos (
        id TEXT PRIMARY KEY,
        nombre TEXT NOT NULL,
        precio REAL NOT NULL,
        categoria TEXT NOT NULL,
        icono TEXT
      );
    `);

    // Comprobar si hay ventas en la base SQLite
    const conteo = dbInstancia.exec('SELECT COUNT(*) as cant FROM ventas;');
    const cantVentas = (conteo[0]?.values[0]?.[0] as number) || 0;

    if (cantVentas === 0) {
      // Cargar ventas existentes o de ejemplo
      const ventasIniciales = cargarVentas();
      for (const v of ventasIniciales) {
        await guardarVentaSQLite(v, false);
      }
      for (const p of PRODUCTOS_INICIALES) {
        await guardarProductoSQLite(p, false);
      }
      await sincronizarDiscoSQLite();
    }

    sqliteActivo = true;
    return dbInstancia;
  } catch (err) {
    console.warn('Error inicializando base SQLite:', err);
    sqliteActivo = false;
    return null;
  }
}

/**
 * Guarda los cambios actuales de SQLite en el almacenamiento persistente del dispositivo.
 */
export async function sincronizarDiscoSQLite(): Promise<void> {
  if (!dbInstancia || !sqliteActivo) return;
  try {
    const binario = dbInstancia.export();
    await guardarBytesEnIndexedDB(binario);
  } catch (e) {
    console.warn('Error al exportar SQLite:', e);
  }
}

// ----------------------------------------------------
// CÓDIGO 1: GUARDAR VENTA EN SQLITE (INSERT / REPLACE)
// ----------------------------------------------------
export async function guardarVentaSQLite(venta: Venta, sincronizar = true): Promise<void> {
  const db = await inicializarSQLite();
  
  if (db && sqliteActivo) {
    try {
      const sql = `
        INSERT OR REPLACE INTO ventas (
          id, fecha, total, metodo_pago, monto_recibido, vuelto,
          cliente_o_nota, estado, creada_en, items_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
      `;

      db.run(sql, [
        venta.id,
        venta.fecha,
        venta.total,
        venta.metodoPago,
        venta.montoRecibido ?? null,
        venta.vuelto ?? null,
        venta.clienteONota ?? null,
        venta.estado,
        venta.creadaEn,
        JSON.stringify(venta.items)
      ]);

      if (sincronizar) {
        await sincronizarDiscoSQLite();
      }
      return;
    } catch (e) {
      console.warn('Error guardando en SQLite, usando respaldo local:', e);
    }
  }

  // Respaldo transparente
  const lista = cargarVentas().filter(v => v.id !== venta.id);
  guardarVentas([venta, ...lista]);
}

// ----------------------------------------------------
// CÓDIGO 2: LEER TODAS LAS VENTAS DESDE SQLITE (SELECT)
// ----------------------------------------------------
export async function leerVentasSQLite(): Promise<Venta[]> {
  const db = await inicializarSQLite();
  
  if (db && sqliteActivo) {
    try {
      const resultado = db.exec(`
        SELECT id, fecha, total, metodo_pago, monto_recibido, vuelto,
               cliente_o_nota, estado, creada_en, items_json
        FROM ventas
        ORDER BY creada_en DESC;
      `);

      if (resultado && resultado.length > 0) {
        const columnas = resultado[0].columns;
        const filas = resultado[0].values;

        return filas.map((fila) => {
          const obj: Record<string, unknown> = {};
          columnas.forEach((col, index) => {
            obj[col] = fila[index];
          });

          return {
            id: obj.id as string,
            fecha: obj.fecha as string,
            total: Number(obj.total),
            metodoPago: obj.metodo_pago as Venta['metodoPago'],
            montoRecibido: obj.monto_recibido !== null ? Number(obj.monto_recibido) : undefined,
            vuelto: obj.vuelto !== null ? Number(obj.vuelto) : undefined,
            clienteONota: (obj.cliente_o_nota as string) || undefined,
            estado: (obj.estado as Venta['estado']) || 'completada',
            creadaEn: Number(obj.creada_en),
            items: JSON.parse((obj.items_json as string) || '[]')
          };
        });
      }
    } catch (e) {
      console.warn('Error leyendo SQLite, usando respaldo local:', e);
    }
  }

  // Fallback seguro
  return cargarVentas();
}

// ----------------------------------------------------
// CÓDIGO 3: BORRAR VENTA DE SQLITE (DELETE)
// ----------------------------------------------------
export async function borrarVentaSQLite(id: string): Promise<void> {
  const db = await inicializarSQLite();
  if (db && sqliteActivo) {
    try {
      db.run('DELETE FROM ventas WHERE id = ?;', [id]);
      await sincronizarDiscoSQLite();
      return;
    } catch (e) {
      console.warn('Error borrando en SQLite:', e);
    }
  }

  // Fallback seguro
  const restantes = cargarVentas().filter(v => v.id !== id);
  guardarVentas(restantes);
}

/**
 * Guarda o actualiza un producto en la tabla SQLite.
 */
export async function guardarProductoSQLite(prod: ProductoComida, sincronizar = true): Promise<void> {
  const db = await inicializarSQLite();
  if (db && sqliteActivo) {
    try {
      db.run(
        'INSERT OR REPLACE INTO productos (id, nombre, precio, categoria, icono) VALUES (?, ?, ?, ?, ?);',
        [prod.id, prod.nombre, prod.precio, prod.categoria, prod.icono || '🍲']
      );
      if (sincronizar) {
        await sincronizarDiscoSQLite();
      }
      return;
    } catch {
      // Fallback
    }
  }

  const prods = cargarProductos().filter(p => p.id !== prod.id);
  guardarProductos([...prods, prod]);
}

/**
 * Lee los productos desde la tabla SQLite.
 */
export async function leerProductosSQLite(): Promise<ProductoComida[]> {
  const db = await inicializarSQLite();
  if (db && sqliteActivo) {
    try {
      const res = db.exec('SELECT id, nombre, precio, categoria, icono FROM productos;');
      if (res && res.length > 0) {
        return res[0].values.map(fila => ({
          id: fila[0] as string,
          nombre: fila[1] as string,
          precio: Number(fila[2]),
          categoria: fila[3] as ProductoComida['categoria'],
          icono: fila[4] as string
        }));
      }
    } catch {
      // Fallback
    }
  }

  return cargarProductos();
}

/**
 * Borra un producto del catálogo en SQLite.
 */
export async function borrarProductoSQLite(id: string): Promise<void> {
  const db = await inicializarSQLite();
  if (db && sqliteActivo) {
    try {
      db.run('DELETE FROM productos WHERE id = ?;', [id]);
      await sincronizarDiscoSQLite();
      return;
    } catch {
      // Fallback
    }
  }

  const prods = cargarProductos().filter(p => p.id !== id);
  guardarProductos(prods);
}

/**
 * EXPORTAR ARCHIVO .SQLITE:
 * Genera y descarga el archivo binario real de SQLite (.sqlite)
 */
export async function exportarArchivoSQLite(): Promise<void> {
  const db = await inicializarSQLite();
  if (db && sqliteActivo) {
    const binario = db.export();
    const blob = new Blob([binario.buffer as ArrayBuffer], { type: 'application/x-sqlite3' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `CMR_Mayeli_${new Date().toISOString().slice(0, 10)}.sqlite`;
    a.click();
    URL.revokeObjectURL(url);
    return;
  }

  // Si no está el binario disponible, descargar como JSON
  const ventas = cargarVentas();
  const blob = new Blob([JSON.stringify(ventas, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `CMR_Mayeli_${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * IMPORTAR ARCHIVO .SQLITE:
 * Carga un archivo .sqlite existente directamente en el motor.
 */
export async function importarArchivoSQLite(archivo: File): Promise<void> {
  const SQL = await cargarSqlEngine();
  const buffer = await archivo.arrayBuffer();
  if (SQL) {
    const u8 = new Uint8Array(buffer);
    dbInstancia = new SQL.Database(u8);
    sqliteActivo = true;
    await sincronizarDiscoSQLite();
  }
}
