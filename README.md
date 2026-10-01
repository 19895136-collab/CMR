# 🍲 CMR • Mayeli - Control de Ventas de Barrio con SQLite & IA

> Aplicación web progresiva (PWA) móvil, full-stack y offline-first, diseñada para el registro ágil de comidas, cobros en efectivo en mano, control de caja y auditoría inteligente mediante **Google Gemini 3.8 Flash**.

---

## 📱 Características Principales

1. **Venta Rápida en Efectivo**:
   - Catálogo táctil de comidas con botones de más de 48 px para operar a una mano desde cualquier teléfono (incluso pantallas pequeñas de 320 px).
   - Calculadora de vuelto automática y notas de pedidos / mesas.
   - Opción para cargar platos libres que no estén en la carta.

2. **Base de Datos SQLite Real en el Teléfono (WebAssembly)**:
   - Almacenamiento local mediante `sql.js` (SQLite compilado a WebAssembly) sincronizado con `IndexedDB`.
   - Cero pérdida de datos: funciona 100% sin conexión a internet.
   - Exportación e importación de la base de datos binaria completa (`.sqlite`), planilla Excel (`.csv`) y archivo liviano (`.json`).

3. **Diseño Apto para Luz Solar (High Contrast)**:
   - Tipografía nunca inferior a 16 px (`text-base`) en toda la aplicación.
   - Fondos de alto contraste y bordes marcados para leer bajo la luz solar en el mostrador o puesto de comida.
   - Un solo botón principal destacado por pantalla.

4. **Instalable en Android e iOS (PWA / WebAPK)**:
   - Manifiesto completo (`manifest.webmanifest`), Service Worker con caché offline e íconos adaptativos maskable (192 px, 512 px).
   - Instalación nativa con 1 toque en Android sin pasar por tiendas, abriendo en pantalla completa como una app nativa.

---

## 🤖 [SELLO DE IA DE MI EJERCICIO] - Integración con Gemini 3.8 Flash

La app incorpora un **Sello de Inteligencia Comercial** que audita el cierre del turno del negocio y genera recomendaciones operativas automáticas para el día siguiente.

### 1. Esquema JSON Fijo (`responseSchema`)
La llamada a la API exige un esquema estricto mediante el SDK oficial `@google/genai` (utilizando el enum `Type`), garantizando que la IA nunca devuelva texto desordenado o párrafos libres:

```typescript
import { Type } from '@google/genai';

export const esquemaAnalisisTurno = {
  type: Type.OBJECT,
  properties: {
    puntuacionDesempeno: {
      type: Type.INTEGER,
      description: "Puntuación de rendimiento comercial del turno de 1 a 100",
    },
    estadoCaja: {
      type: Type.STRING,
      description: "Diagnóstico corto de la caja: 'EXCELENTE', 'BUENO', 'MODERADO' o 'BAJO'",
    },
    platoEstrellaSugerido: {
      type: Type.STRING,
      description: "Nombre del plato clave recomendado para cocinar mañana según las ventas",
    },
    porcionesRecomendadas: {
      type: Type.INTEGER,
      description: "Cantidad de porciones sugeridas a preparar de ese plato",
    },
    franjaHorariaPico: {
      type: Type.STRING,
      description: "Horario estimado de mayor afluencia de comensales para el próximo turno",
    },
    alertaInsumos: {
      type: Type.STRING,
      description: "Insumo o ingrediente crítico a comprar antes de abrir",
    },
    metaVentaMananaPesos: {
      type: Type.NUMBER,
      description: "Meta sugerida de facturación en pesos para el día siguiente",
    },
    consejoClave: {
      type: Type.STRING,
      description: "Una recomendación concreta en una sola frase de no más de 14 palabras",
    },
  },
  required: [
    "puntuacionDesempeno",
    "estadoCaja",
    "platoEstrellaSugerido",
    "porcionesRecomendadas",
    "franjaHorariaPico",
    "alertaInsumos",
    "metaVentaMananaPesos",
    "consejoClave",
  ],
};
```

### 2. Consumo en Pantalla como Datos y Métricas (No como Párrafo)
El componente `SelloIAEjercicio.tsx` desglosa el JSON directamente en tarjetas y números legibles:
* **Puntaje Comercial**: Badge numérico destacado (`92 / 100`).
* **Salud de Caja**: Etiqueta de diagnóstico (`EXCELENTE / Verificado`).
* **Plato y Porciones**: Tarjeta con nombre y cantidad exacta a cocinar (`Cocinar 24 porciones`).
* **Horario Pico**: Indicador de franja de clientes (`12:30 a 14:30 hs`).
* **Insumo Crítico**: Alerta de abastecimiento matutino.
* **Meta de Ventas**: Cifra en pesos para el día siguiente.
* **Directiva Operativa**: Regla de acción en una frase corta.

### 3. Configuración de la Llave de API (`GEMINI_API_KEY`)
La clave de API se ejecuta **exclusivamente en el backend** (`server.ts`), sin exponer credenciales al navegador:

1. Crea un archivo `.env` en la raíz del proyecto (basado en `.env.example`):
   ```bash
   GEMINI_API_KEY="AIzaSyTuClaveDeGoogleGemini..."
   PORT=3000
   ```
2. En Google AI Studio, puedes generar tu clave gratuita en: [aistudio.google.com/apikey](https://aistudio.google.com/apikey).

### 4. Manejo de Fallo y Timeout
* **Timeout de 12 segundos**: Si la red del celular es inestable o la IA tarda en responder, se cancela la petición mediante `AbortController`.
* **Validación de tipos**: Si el JSON devuelto no cumple los tipos esperados, se descarta.
* **Fallback local de emergencia**: En caso de error, la interfaz muestra un aviso informativo de respaldo (`🛡️ Respaldo calculado`) y genera métricas estimadas basadas en el total recaudado para no interrumpir el trabajo de Mayeli.

### 5. Modo de Prueba Local (Mock sin gastar llamadas)
Se incluye un interruptor en pantalla **"Modo prueba (Mock)"** que permite probar la interfaz y el flujo de datos sin consumir cuota de la API:

```json
{
  "puntuacionDesempeno": 92,
  "estadoCaja": "EXCELENTE",
  "platoEstrellaSugerido": "Milanesa con Puré",
  "porcionesRecomendadas": 24,
  "franjaHorariaPico": "12:30 a 14:30 hs",
  "alertaInsumos": "Comprar carne de ternera y papas a primera hora",
  "metaVentaMananaPesos": 35000,
  "consejoClave": "Prepará bandejas con anticipación para despachar rápido al mediodía."
}
```

---

## 🛠️ Tecnologías Utilizadas

- **Frontend**: React 19, TypeScript, Tailwind CSS v4, Lucide Icons.
- **Backend / Proxy**: Node.js, Express, `tsx`.
- **SDK de Inteligencia Artificial**: `@google/genai` (Modelo: `gemini-3.8-flash`).
- **Base de Datos**: `sql.js` (SQLite WASM) + `IndexedDB` persistence.
- **PWA / Service Worker**: `vite-plugin-pwa`, `workbox`.

---

## 🚀 Instalación y Puesta en Marcha

### Prerrequisitos
- Node.js versión 18 o superior.
- npm o bun.

### Pasos

1. **Clonar el repositorio**:
   ```bash
   git clone https://github.com/usuario/cmr-mayeli-ventas.git
   cd cmr-mayeli-ventas
   ```

2. **Instalar dependencias**:
   ```bash
   npm install
   ```

3. **Configurar variables de entorno**:
   ```bash
   cp .env.example .env
   # Edita .env y coloca tu GEMINI_API_KEY
   ```

4. **Ejecutar en modo desarrollo**:
   ```bash
   npm run dev
   ```
   Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

5. **Compilar para producción**:
   ```bash
   npm run build
   npm run start
   ```

---

## 📲 Cómo Instalar en el Celular

### Opción A: PWA Directa (WebAPK)
1. Abre la URL de la app en **Google Chrome** en tu teléfono Android.
2. Toca el botón morado **"Instalar"** en la barra superior (o menú ⋮ de Chrome -> *"Instalar aplicación"*).
3. La aplicación se instalará con ícono propio y abrirá en pantalla completa sin barra de navegador.

### Opción B: Generar archivo `.APK` descargable
1. Ingresa a [PWABuilder.com](https://www.pwabuilder.com).
2. Pega la URL pública de la aplicación.
3. Haz clic en **"Package for Android"** para descargar el archivo `.apk` instalable.

---

## 📄 Licencia
Este proyecto es de código abierto bajo la licencia MIT.
Desarrollado para el control de ventas de comida casera de barrio.
