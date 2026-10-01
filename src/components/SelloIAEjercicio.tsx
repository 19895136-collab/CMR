/**
 * @file SelloIAEjercicio.tsx
 * @description Componente para el [SELLO DE IA DE MI EJERCICIO].
 * Consume la respuesta JSON estructurada de Gemini (responseSchema)
 * y muestra cada resultado en pantalla como DATO cuantitativo y métricas (no como párrafo).
 */

import React, { useState } from 'react';
import { Venta } from '../types';
import { formatearMoneda } from '../utils/storage';
import { 
  Sparkles, Award, ChefHat, Clock, AlertCircle, 
  TrendingUp, RefreshCw, CheckCircle2, ShieldAlert, 
  HelpCircle, Zap
} from 'lucide-react';

export interface DatosSelloIA {
  puntuacionDesempeno: number;
  estadoCaja: 'EXCELENTE' | 'BUENO' | 'MODERADO' | 'BAJO' | string;
  platoEstrellaSugerido: string;
  porcionesRecomendadas: number;
  franjaHorariaPico: string;
  alertaInsumos: string;
  metaVentaMananaPesos: number;
  consejoClave: string;
}

interface SelloIAEjercicioProps {
  ventas: Venta[];
  totalRecaudado: number;
  platoEstrella: string;
}

export const SelloIAEjercicio: React.FC<SelloIAEjercicioProps> = ({
  ventas,
  totalRecaudado,
  platoEstrella,
}) => {
  const [cargando, setCargando] = useState(false);
  const [datosIA, setDatosIA] = useState<DatosSelloIA | null>(null);
  const [origenRespuesta, setOrigenRespuesta] = useState<'gemini' | 'mock' | 'fallback_error' | null>(null);
  const [mensajeError, setMensajeError] = useState<string | null>(null);
  const [usarModoPrueba, setUsarModoPrueba] = useState(false);

  const consultarSelloIA = async () => {
    setCargando(true);
    setMensajeError(null);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);

    try {
      const res = await fetch('/api/gemini/analisis-turno', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          ventas: ventas.slice(0, 20),
          totalRecaudado,
          platoMasVendido: platoEstrella,
          usarMock: usarModoPrueba,
        }),
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        throw new Error(`El servidor respondió con código ${res.status}`);
      }

      const respuesta = await res.json();

      if (respuesta.datos && typeof respuesta.datos.puntuacionDesempeno === 'number') {
        setDatosIA(respuesta.datos);
        setOrigenRespuesta(respuesta.origen);
        if (respuesta.aviso) {
          setMensajeError(respuesta.aviso);
        }
      } else {
        throw new Error('La respuesta devuelta no cumplió con el esquema esperado.');
      }
    } catch (err: any) {
      clearTimeout(timeoutId);
      console.warn('Fallo de consulta IA:', err);

      // 4. MANEJO DE FALLO CON RESPALDO LOCAL SEGURO
      setMensajeError(
        err.name === 'AbortError'
          ? 'La consulta demoró más de 12 segundos. Se cargaron los datos de respaldo.'
          : 'No se pudo conectar con Gemini API. Se activó el respaldo local para continuar.'
      );
      setOrigenRespuesta('fallback_error');

      // Cargar datos calculados de respaldo
      setDatosIA({
        puntuacionDesempeno: totalRecaudado > 15000 ? 88 : 75,
        estadoCaja: totalRecaudado > 20000 ? 'EXCELENTE' : 'BUENO',
        platoEstrellaSugerido: platoEstrella.split('(')[0].trim() || 'Milanesa con Puré',
        porcionesRecomendadas: Math.max(12, Math.round(ventas.length * 1.2)),
        franjaHorariaPico: '12:30 a 14:00 hs',
        alertaInsumos: 'Revisar carne, verduras frescas y pan antes de las 11 hs',
        metaVentaMananaPesos: Math.round((totalRecaudado || 15000) * 1.15),
        consejoClave: 'Tener porciones prearmadas para acelerar el cobro al mediodía.'
      });
    } finally {
      setCargando(false);
    }
  };

  return (
    <section className="bg-white rounded-3xl p-5 border-2 border-neutral-900 shadow-sm space-y-4 my-4">
      {/* ENCABEZADO DE LA SECCIÓN */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-purple-900 text-white flex items-center justify-center shrink-0 border border-purple-500">
            <Sparkles size={24} className="text-purple-300" />
          </div>
          <div>
            <h3 className="font-black text-neutral-950 text-xl leading-tight">
              Sello de IA del Ejercicio
            </h3>
            <p className="text-base text-neutral-800 font-medium">
              Auditoría inteligente del turno con Gemini 3.8 Flash
            </p>
          </div>
        </div>

        {/* 5. SELECTOR DE MODO DE PRUEBA (DESARROLLO SIN GASTAR LLAMADAS) */}
        <label className="flex items-center gap-2 cursor-pointer bg-neutral-100 hover:bg-neutral-200 border-2 border-neutral-900 px-3 py-1.5 rounded-xl">
          <input
            type="checkbox"
            checked={usarModoPrueba}
            onChange={(e) => setUsarModoPrueba(e.target.checked)}
            className="w-4 h-4 text-purple-700 rounded focus:ring-purple-600"
          />
          <span className="text-base font-bold text-neutral-950">
            Modo prueba (Mock)
          </span>
        </label>
      </div>

      {/* 4. AVISO DE FALLO O ESTADO DE LA CONEXIÓN */}
      {mensajeError && (
        <div className="bg-amber-100 border-2 border-amber-800 text-amber-950 p-4 rounded-2xl flex items-start gap-3 text-base font-bold">
          <ShieldAlert size={22} className="shrink-0 text-amber-900 mt-0.5" />
          <div className="flex-1">
            <span className="block font-black">Aviso de servicio:</span>
            <span>{mensajeError}</span>
          </div>
        </div>
      )}

      {/* BOTÓN DE ACCIÓN */}
      <button
        type="button"
        disabled={cargando}
        onClick={consultarSelloIA}
        className={`w-full min-h-[54px] py-3.5 px-4 rounded-2xl font-black text-base flex items-center justify-center gap-2 border-2 border-neutral-950 shadow-md transition-all active:scale-98 ${
          cargando
            ? 'bg-neutral-300 text-neutral-600 cursor-wait border-neutral-400'
            : 'bg-purple-700 hover:bg-purple-800 text-white'
        }`}
      >
        {cargando ? (
          <>
            <RefreshCw size={20} className="animate-spin" />
            <span>Consultando modelo Gemini...</span>
          </>
        ) : (
          <>
            <Zap size={20} className="text-yellow-300" />
            <span>
              {datosIA ? 'Actualizar Sello de IA' : 'Obtener Sello de IA de Hoy'}
            </span>
          </>
        )}
      </button>

      {/* 2. MOSTRAR EL JSON COMO DATOS Y MÉTRICAS (NO COMO PÁRRAFO) */}
      {datosIA && (
        <div className="space-y-3 pt-2">
          {/* Indicador de origen del dato */}
          <div className="flex items-center justify-between text-base px-1">
            <span className="font-bold text-neutral-700">Estado de los datos:</span>
            <span
              className={`font-black px-2.5 py-0.5 rounded-lg border text-base ${
                origenRespuesta === 'gemini'
                  ? 'bg-purple-100 text-purple-950 border-purple-800'
                  : origenRespuesta === 'mock'
                  ? 'bg-blue-100 text-blue-950 border-blue-800'
                  : 'bg-amber-100 text-amber-950 border-amber-800'
              }`}
            >
              {origenRespuesta === 'gemini'
                ? '⚡ Gemini 3.8 Flash (En vivo)'
                : origenRespuesta === 'mock'
                ? '🧪 Prueba local (Sin costo)'
                : '🛡️ Respaldo calculado'}
            </span>
          </div>

          {/* TARJETAS DE DATOS EN CUADRÍCULA */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* DATO 1: PUNTUACIÓN */}
            <div className="bg-neutral-950 text-white p-4 rounded-2xl border-2 border-purple-500 flex items-center justify-between">
              <div>
                <span className="text-base text-purple-300 font-bold block">
                  Puntaje Comercial
                </span>
                <span className="text-3xl font-black">
                  {datosIA.puntuacionDesempeno}
                  <span className="text-base text-neutral-400 font-medium"> / 100</span>
                </span>
              </div>
              <div className="w-12 h-12 rounded-xl bg-purple-900 border border-purple-400 flex items-center justify-center">
                <Award size={26} className="text-purple-300" />
              </div>
            </div>

            {/* DATO 2: ESTADO DE CAJA */}
            <div className="bg-white p-4 rounded-2xl border-2 border-neutral-900 flex items-center justify-between">
              <div>
                <span className="text-base text-neutral-700 font-bold block">
                  Salud de Caja
                </span>
                <span className="text-2xl font-black text-neutral-950">
                  {datosIA.estadoCaja}
                </span>
              </div>
              <span className="bg-emerald-100 text-emerald-950 border border-emerald-700 px-3 py-1 rounded-xl font-black text-base">
                Verificado
              </span>
            </div>

            {/* DATO 3: PLATO CLAVE Y PORCIONES RECOMENDADAS */}
            <div className="bg-white p-4 rounded-2xl border-2 border-neutral-900 space-y-1">
              <span className="text-base text-neutral-700 font-bold flex items-center gap-1.5">
                <ChefHat size={18} className="text-purple-700" />
                <span>Plato Recomendado para Mañana:</span>
              </span>
              <span className="text-xl font-black text-neutral-950 block">
                {datosIA.platoEstrellaSugerido}
              </span>
              <span className="text-base font-black text-purple-900 bg-purple-100 px-2 py-0.5 rounded-lg inline-block border border-purple-300">
                Cocinar {datosIA.porcionesRecomendadas} porciones
              </span>
            </div>

            {/* DATO 4: HORARIO PICO PREVISTO */}
            <div className="bg-white p-4 rounded-2xl border-2 border-neutral-900 space-y-1">
              <span className="text-base text-neutral-700 font-bold flex items-center gap-1.5">
                <Clock size={18} className="text-purple-700" />
                <span>Horario Pico Estimado:</span>
              </span>
              <span className="text-xl font-black text-neutral-950 block">
                {datosIA.franjaHorariaPico}
              </span>
              <span className="text-base text-neutral-800 font-medium block">
                Mayor concentración de compras
              </span>
            </div>

            {/* DATO 5: ALERTA DE INSUMOS */}
            <div className="bg-neutral-50 p-4 rounded-2xl border-2 border-neutral-900 space-y-1">
              <span className="text-base text-neutral-700 font-bold flex items-center gap-1.5">
                <AlertCircle size={18} className="text-amber-700" />
                <span>Insumo a Reponer:</span>
              </span>
              <span className="text-base font-black text-neutral-950 block">
                {datosIA.alertaInsumos}
              </span>
            </div>

            {/* DATO 6: META DE VENTA SUGERIDA */}
            <div className="bg-purple-50 p-4 rounded-2xl border-2 border-purple-900 space-y-1">
              <span className="text-base text-purple-950 font-bold flex items-center gap-1.5">
                <TrendingUp size={18} className="text-purple-700" />
                <span>Meta Sugerida Próximo Turno:</span>
              </span>
              <span className="text-2xl font-black text-purple-950 block">
                {formatearMoneda(datosIA.metaVentaMananaPesos)}
              </span>
            </div>
          </div>

          {/* DATO 7: CONSEJO CLAVE CONCRETO (MÉTRICA / REGLA DE ACCIÓN) */}
          <div className="bg-neutral-950 text-white p-4 rounded-2xl border-2 border-purple-500 space-y-1">
            <span className="text-base text-purple-300 font-bold block">
              Directiva Operativa:
            </span>
            <span className="text-lg font-black text-white block">
              🎯 "{datosIA.consejoClave}"
            </span>
          </div>
        </div>
      )}
    </section>
  );
};
