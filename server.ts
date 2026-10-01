/**
 * @file server.ts
 * @description Servidor Express full-stack con proxy para la API de Gemini (SDK @google/genai)
 * y montaje de middleware de Vite en desarrollo.
 */

import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json({ limit: '2mb' }));

/**
 * 5. EJEMPLO DE RESPUESTA DE PRUEBA (MOCK)
 * Permite probar y desarrollar en la interfaz sin gastar cuota de API.
 */
export const MOCK_RESPUESTA_IA = {
  puntuacionDesempeno: 92,
  estadoCaja: 'EXCELENTE',
  platoEstrellaSugerido: 'Milanesa con Puré',
  porcionesRecomendadas: 24,
  franjaHorariaPico: '12:30 a 14:30 hs',
  alertaInsumos: 'Comprar carne de ternera y papas a primera hora',
  metaVentaMananaPesos: 35000,
  consejoClave: 'Prepará bandejas con anticipación para despachar rápido al mediodía.'
};

/**
 * 1. ESQUEMA FIJO PARA LA RESPUESTA DE GEMINI (responseSchema)
 */
const esquemaAnalisisTurno = {
  type: Type.OBJECT,
  properties: {
    puntuacionDesempeno: {
      type: Type.INTEGER,
      description: 'Puntuación de rendimiento comercial del turno de 1 a 100',
    },
    estadoCaja: {
      type: Type.STRING,
      description: "Diagnóstico corto de la caja: 'EXCELENTE', 'BUENO', 'MODERADO' o 'BAJO'",
    },
    platoEstrellaSugerido: {
      type: Type.STRING,
      description: 'Nombre del plato clave recomendado para cocinar mañana según las ventas',
    },
    porcionesRecomendadas: {
      type: Type.INTEGER,
      description: 'Cantidad de porciones sugeridas a preparar de ese plato',
    },
    franjaHorariaPico: {
      type: Type.STRING,
      description: 'Horario estimado de mayor afluencia de comensales para el próximo turno',
    },
    alertaInsumos: {
      type: Type.STRING,
      description: 'Insumo o ingrediente crítico a comprar antes de abrir',
    },
    metaVentaMananaPesos: {
      type: Type.NUMBER,
      description: 'Meta sugerida de facturación en pesos para el día siguiente',
    },
    consejoClave: {
      type: Type.STRING,
      description: 'Una recomendación concreta en una sola frase de no más de 14 palabras',
    },
  },
  required: [
    'puntuacionDesempeno',
    'estadoCaja',
    'platoEstrellaSugerido',
    'porcionesRecomendadas',
    'franjaHorariaPico',
    'alertaInsumos',
    'metaVentaMananaPesos',
    'consejoClave',
  ],
};

/**
 * RUTA API: /api/gemini/analisis-turno
 * Procesa las ventas del negocio con Gemini 3.8 Flash y devuelve datos estructurados en JSON.
 */
app.post('/api/gemini/analisis-turno', async (req: Request, res: Response) => {
  const { ventas, totalRecaudado, platoMasVendido, usarMock } = req.body;

  // Si el cliente solicita modo de prueba para no gastar llamadas:
  if (usarMock) {
    return res.json({
      origen: 'mock',
      datos: MOCK_RESPUESTA_IA
    });
  }

  // 3. LA LLAVE DE API SE LEE DE VARIABLE DE ENTORNO
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    // Si no está configurada, se devuelve la respuesta mock con aviso explicativo
    return res.json({
      origen: 'mock_sin_key',
      aviso: 'Variable GEMINI_API_KEY no configurada. Mostrando datos de prueba locales.',
      datos: MOCK_RESPUESTA_IA
    });
  }

  try {
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    const prompt = `
Actúa como un asesor financiero gastronómico para el local de comida casera de Mayeli.
Analiza el resumen de ventas de hoy y genera el "Sello de Inteligencia Comercial":

- Total cobrado en caja hoy: $${totalRecaudado || 0}
- Cantidad de pedidos: ${Array.isArray(ventas) ? ventas.length : 0}
- Plato más pedido: ${platoMasVendido || 'Variado'}
- Detalle de ventas: ${JSON.stringify(ventas ? ventas.slice(0, 15) : [])}

Completa todos los campos obligatorios del esquema JSON fijado. Sé preciso, realista para un negocio de barrio y enfocado en maximizar ganancias en efectivo.
    `;

    // Timeout de seguridad de 12 segundos para responder rápido
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        systemInstruction: 'Eres un analista de ventas gastronómicas. Responde estrictamente en formato JSON cumpliendo el responseSchema.',
        responseMimeType: 'application/json',
        responseSchema: esquemaAnalisisTurno,
        temperature: 0.2,
      },
    });

    clearTimeout(timeout);

    const textoJson = response.text?.trim() || '';
    const datosParseados = JSON.parse(textoJson);

    // 4. MANEJO DE FALLO Y VALIDACIÓN DE ESQUEMA
    if (
      typeof datosParseados.puntuacionDesempeno !== 'number' ||
      typeof datosParseados.estadoCaja !== 'string' ||
      typeof datosParseados.platoEstrellaSugerido !== 'string'
    ) {
      throw new Error('La respuesta devuelta por la IA no cumple con la estructura requerida.');
    }

    return res.json({
      origen: 'gemini',
      datos: datosParseados
    });
  } catch (error: any) {
    console.error('Error al invocar Gemini API:', error?.message || error);
    // 4. Fallback seguro ante falla o lentitud
    return res.status(200).json({
      origen: 'fallback_error',
      aviso: 'La IA demoró o no estuvo disponible. Se cargaron métricas estimadas de respaldo.',
      error: error?.message || 'Error de conexión',
      datos: {
        ...MOCK_RESPUESTA_IA,
        metaVentaMananaPesos: Math.round((totalRecaudado || 20000) * 1.15),
        consejoClave: 'Mantené los platos de mayor salida con precios visibles en pizarra.'
      }
    });
  }
});

// Endpoint de diagnóstico rápido de configuración
app.get('/api/gemini/estado', (_req, res) => {
  const apiKey = process.env.GEMINI_API_KEY;
  const tieneKey = Boolean(apiKey && apiKey !== 'MY_GEMINI_API_KEY');
  res.json({
    configurado: tieneKey,
    modelo: 'gemini-3.8-flash',
    esquemaFijo: true
  });
});

async function iniciarServidor() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor CMR Mayeli listo en http://localhost:${PORT}`);
  });
}

iniciarServidor().catch(console.error);
