/**
 * @file PWAInstallButton.tsx
 * @description Botón y modal de instalación en el teléfono (Android APK / WebAPK e iOS).
 */

import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { Download, Smartphone, Check, X, ExternalLink, Sparkles } from 'lucide-react';

interface PWAInstallButtonProps {
  variante?: 'banner' | 'boton-header' | 'boton-card';
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({ variante = 'banner' }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [modalGuia, setModalGuia] = useState(false);

  // Si ya está corriendo como app nativa instalada en el celular
  if (isInstalled) {
    if (variante === 'boton-header') return null;
    return (
      <div className="bg-emerald-900/60 border-2 border-emerald-500 rounded-2xl p-4 text-white flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center shrink-0">
            <Check size={22} className="text-white" />
          </div>
          <div>
            <span className="text-base font-black block">App Instalada en tu Celular</span>
            <span className="text-base text-emerald-200 font-medium">Lista para abrir desde tu pantalla de inicio</span>
          </div>
        </div>
      </div>
    );
  }

  const manejarInstalacion = async () => {
    if (isInstallable) {
      const instalado = await install();
      if (!instalado) {
        setModalGuia(true);
      }
    } else {
      setModalGuia(true);
    }
  };

  // Botón compacto para el encabezado superior
  if (variante === 'boton-header') {
    return (
      <>
        <button
          type="button"
          onClick={manejarInstalacion}
          className="min-h-[44px] py-1.5 px-3 bg-purple-700 hover:bg-purple-800 text-white font-black text-base rounded-xl border border-purple-400 flex items-center gap-1.5 shadow-sm active:scale-95"
          title="Instalar en el teléfono"
        >
          <Smartphone size={18} />
          <span>Instalar</span>
        </button>

        {modalGuia && <ModalGuiaInstalacion alCerrar={() => setModalGuia(false)} isIOS={isIOS} />}
      </>
    );
  }

  // Banner destacado
  return (
    <>
      <div className="bg-gradient-to-r from-purple-950 to-neutral-950 border-2 border-purple-500 rounded-3xl p-5 text-white shadow-xl space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-purple-600 text-white flex items-center justify-center shrink-0 border border-purple-300">
              <Smartphone size={24} />
            </div>
            <div>
              <h3 className="font-black text-lg text-white leading-tight">
                Instalar App en tu Celular
              </h3>
              <p className="text-base text-purple-200 font-medium">
                Funciona sin navegador, con icono en tu pantalla de inicio y sin internet.
              </p>
            </div>
          </div>
        </div>

        <div className="pt-1 flex flex-col sm:flex-row gap-2.5">
          <button
            type="button"
            onClick={manejarInstalacion}
            className="w-full min-h-[50px] py-3 px-4 bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white font-black text-base rounded-2xl border border-purple-300 shadow-md flex items-center justify-center gap-2 active:scale-98 transition-all"
          >
            <Download size={20} />
            <span>Instalar en mi teléfono ahora</span>
          </button>

          <button
            type="button"
            onClick={() => setModalGuia(true)}
            className="min-h-[50px] py-3 px-4 bg-neutral-900 hover:bg-black text-neutral-200 font-bold text-base rounded-2xl border border-neutral-700 flex items-center justify-center gap-2 active:scale-98"
          >
            <span>Ver cómo instalar</span>
          </button>
        </div>
      </div>

      {modalGuia && <ModalGuiaInstalacion alCerrar={() => setModalGuia(false)} isIOS={isIOS} />}
    </>
  );
};

// Modal explicativo paso a paso para Android (APK / WebAPK) e iOS
const ModalGuiaInstalacion: React.FC<{ alCerrar: () => void; isIOS: boolean }> = ({ alCerrar, isIOS }) => {
  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 animate-fadeIn">
      <div className="bg-white w-full max-w-md rounded-3xl p-5 border-4 border-neutral-950 shadow-2xl relative max-h-[90vh] overflow-y-auto space-y-4">
        <button
          type="button"
          onClick={alCerrar}
          className="absolute top-4 right-4 w-11 h-11 bg-neutral-200 hover:bg-neutral-300 rounded-full flex items-center justify-center border-2 border-neutral-950 text-neutral-950"
          title="Cerrar"
        >
          <X size={22} />
        </button>

        <div className="text-center pt-2">
          <div className="w-14 h-14 bg-purple-100 text-purple-900 border-2 border-neutral-950 rounded-2xl flex items-center justify-center mx-auto mb-2">
            <Smartphone size={28} />
          </div>
          <h3 className="font-black text-xl text-neutral-950">
            Instalar CMR en tu Celular
          </h3>
          <p className="text-base text-neutral-700 font-medium mt-1">
            Se instala directo en tu pantalla de inicio como una aplicación nativa.
          </p>
        </div>

        {isIOS ? (
          <div className="bg-neutral-100 p-4 rounded-2xl border-2 border-neutral-900 space-y-3 text-base text-neutral-950">
            <span className="font-black text-lg block text-purple-900">Pasos en iPhone / iPad:</span>
            <ol className="list-decimal pl-5 space-y-2 font-bold">
              <li>Tocá el botón <strong>Compartir</strong> (el cuadrado con la flecha hacia arriba en Safari).</li>
              <li>Deslizá hacia abajo en el menú.</li>
              <li>Tocá <strong>"Agregar a Inicio"</strong> (Add to Home Screen).</li>
              <li>Tocá <strong>"Agregar"</strong> arriba a la derecha.</li>
            </ol>
          </div>
        ) : (
          <div className="bg-neutral-100 p-4 rounded-2xl border-2 border-neutral-900 space-y-3 text-base text-neutral-950">
            <span className="font-black text-lg block text-purple-900">Pasos en Android (Chrome / Samsung):</span>
            <ol className="list-decimal pl-5 space-y-2 font-bold">
              <li>Tocá los <strong>tres puntos (⋮)</strong> arriba a la derecha en tu navegador.</li>
              <li>Elegí <strong>"Instalar aplicación"</strong> o <strong>"Agregar a la pantalla principal"</strong>.</li>
              <li>Confirmá tocando <strong>"Instalar"</strong>.</li>
            </ol>
            <p className="text-base text-neutral-800 font-medium pt-1">
              ¡Listo! Tu teléfono generará el paquete <strong>APK oficial (WebAPK)</strong> de forma automática y creará el icono de CMR Mayeli en tu cajón de aplicaciones.
            </p>
          </div>
        )}

        {/* Generador APK de Google / Microsoft PWABuilder */}
        <div className="bg-purple-50 p-4 rounded-2xl border-2 border-purple-900 space-y-2 text-base">
          <span className="font-black text-neutral-950 flex items-center gap-1.5">
            <Sparkles size={18} className="text-purple-700" />
            ¿Querés el archivo .APK para compartirlo?
          </span>
          <p className="text-base text-neutral-800 font-medium">
            Podés descargar el archivo ejecutable <strong>.APK para Android</strong> en 1 clic ingresando la dirección de esta app en el generador oficial de Microsoft y Google:
          </p>
          <a
            href="https://www.pwabuilder.com"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full min-h-[48px] py-2.5 px-4 bg-purple-700 hover:bg-purple-800 text-white font-black text-base rounded-xl border border-neutral-950 flex items-center justify-center gap-2 mt-2"
          >
            <span>Generar .APK en PWABuilder</span>
            <ExternalLink size={18} />
          </a>
        </div>

        <button
          type="button"
          onClick={alCerrar}
          className="w-full min-h-[48px] py-3 bg-neutral-950 hover:bg-black text-white font-black text-base rounded-2xl border border-neutral-950 shadow-md"
        >
          Entendido
        </button>
      </div>
    </div>
  );
};
