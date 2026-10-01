/**
 * @file sqliteDb.ts
 * @description Motor de base de datos SQLite real para la app CMR de Mayeli.
 * Utiliza SQL.js (WebAssembly SQLite) con persistencia en almacenamiento seguro (IndexedDB).
 * 
 * ATENCIÓN - PUNTOS DONDE ALGUIEN SUELE EQUIVOCARSE:
 * 1. Carga Asíncrona de WASM: El motor SQLite WebAssembly tarda unos milisegundos
 *    en compilar el binario WASM. Siempre esperar `inicializarSQLite()` antes
 *    de ejecutar queries.
 * 2. SQLite en memoria vs Persistencia: SQLite en el navegador trabaja en memoria
 *    por velocidad; para que NO se pierdan los datos al cerrar la app, cada cambio
 *    (INSERT, UPDATE, DELETE) debe sincronizar el binario `db.export()` en el
 *    almacenamiento persistente (IndexedDB).
 * 3. Parámetros SQL (Inyección SQL): Nunca concatenar variables directamente en
 *    las sentencias SQL (ej: "WHERE id = " + id). Usar siempre sentencias preparadas
 *    con placeholders (?) o pasar argumentos tipados.
 */

import initSqlJs, { Database } from 'sql.js';
import { Venta, ProductoComida } from '../types';
import { generarVentasEjemplo, PRODUCTOS_INICIALES } from '../data/initialData';

let dbInstancia: Database | null = null;
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
    console.error('Error al persistir binario SQLite en IndexedDB:', err);
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
 * Inicializa la base de datos SQLite y crea las tablas si no existen.
 */
export async function inicializarSQLite(): Promise<Database> {
  if (dbInstancia) return dbInstancia;

  const SQL = await initSqlJs({
    locateFile: (file) => `/${file}`,
  });

  // Intentar cargar la base de datos SQLite previamente guardada en el dispositivo
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

  // Si la tabla de ventas está vacía, insertar datos iniciales de ejemplo
  const conteo = dbInstancia.exec('SELECT COUNT(*) as cant FROM ventas;');
  const cantVentas = conteo[0]?.values[0]?.[0] as number || 0;

  if (cantVentas === 0) {
    const ejemplos = generarVentasEjemplo();
    for (const v of ejemplos) {
      await guardarVentaSQLite(v, false);
    }
    for (const p of PRODUCTOS_INICIALES) {
      await guardarProductoSQLite(p, false);
    }
    await sincronizarDiscoSQLite();
  }

  return dbInstancia;
}

/**
 * Guarda los cambios actuales de SQLite en el almacenamiento persistente del dispositivo.
 */
export async function sincronizarDiscoSQLite(): Promise<void> {
  if (!dbInstancia) return;
  const binario = dbInstancia.export();
  await guardarBytesEnIndexedDB(binario);
}

// ----------------------------------------------------
// CÓDIGO 1: GUARDAR VENTA EN SQLITE (INSERT / REPLACE)
// ----------------------------------------------------
export async function guardarVentaSQLite(venta: Venta, sincronizar = true): Promise<void> {
  const db = await inicializarSQLite();
  
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
}

// ----------------------------------------------------
// CÓDIGO 2: LEER TODAS LAS VENTAS DESDE SQLITE (SELECT)
// ----------------------------------------------------
export async function leerVentasSQLite(): Promise<Venta[]> {
  const db = await inicializarSQLite();
  
  const resultado = db.exec(`
    SELECT id, fecha, total, metodo_pago, monto_recibido, vuelto,
           cliente_o_nota, estado, creada_en, items_json
    FROM ventas
    ORDER BY creada_en DESC;
  `);

  if (!resultado || resultado.length === 0) {
    return [];
  }

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

// ----------------------------------------------------
// CÓDIGO 3: BORRAR VENTA DE SQLITE (DELETE)
// ----------------------------------------------------
export async function borrarVentaSQLite(id: string): Promise<void> {
  const db = await inicializarSQLite();
  db.run('DELETE FROM ventas WHERE id = ?;', [id]);
  await sincronizarDiscoSQLite();
}

/**
 * Guarda o actualiza un producto en la tabla SQLite.
 */
export async function guardarProductoSQLite(prod: ProductoComida, sincronizar = true): Promise<void> {
  const db = await inicializarSQLite();
  db.run(
    'INSERT OR REPLACE INTO productos (id, nombre, precio, categoria, icono) VALUES (?, ?, ?, ?, ?);',
    [prod.id, prod.nombre, prod.precio, prod.categoria, prod.icono || '🍲']
  );
  if (sincronizar) {
    await sincronizarDiscoSQLite();
  }
}

/**
 * Lee los productos desde la tabla SQLite.
 */
export async function leerProductosSQLite(): Promise<ProductoComida[]> {
  const db = await inicializarSQLite();
  const res = db.exec('SELECT id, nombre, precio, categoria, icono FROM productos;');
  if (!res || res.length === 0) return PRODUCTOS_INICIALES;

  return res[0].values.map(fila => ({
    id: fila[0] as string,
    nombre: fila[1] as string,
    precio: Number(fila[2]),
    categoria: fila[3] as ProductoComida['categoria'],
    icono: fila[4] as string
  }));
}

/**
 * Borra un producto del catálogo en SQLite.
 */
export async function borrarProductoSQLite(id: string): Promise<void> {
  const db = await inicializarSQLite();
  db.run('DELETE FROM productos WHERE id = ?;', [id]);
  await sincronizarDiscoSQLite();
}

/**
 * EXPORTAR ARCHIVO .SQLITE:
 * Genera y descarga el archivo binario real de SQLite (.sqlite o .db)
 * que el usuario puede abrir con DB Browser for SQLite, DBeaver, etc.
 */
export async function exportarArchivoSQLite(): Promise<void> {
  const db = await inicializarSQLite();
  const binario = db.export(); // Array de bytes Uint8Array estándar de SQLite 3
  const blob = new Blob([binario.buffer as ArrayBuffer], { type: 'application/x-sqlite3' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `CMR_Mayeli_${new Date().toISOString().slice(0, 10)}.sqlite`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * IMPORTAR ARCHIVO .SQLITE:
 * Carga un archivo .sqlite existente directamente en el motor.
 */
export async function importarArchivoSQLite(archivo: File): Promise<void> {
  const SQL = await initSqlJs({ locateFile: file => `/${file}` });
  const buffer = await archivo.arrayBuffer();
  const u8 = new Uint8Array(buffer);
  dbInstancia = new SQL.Database(u8);
  await sincronizarDiscoSQLite();
}
