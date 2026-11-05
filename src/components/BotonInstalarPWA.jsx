/**
 * BotonInstalarPWA — Botón de instalación de la PWA (App desde el navegador)
 * Aparece automáticamente cuando el navegador/SO soporta la instalación.
 * En Android/Chrome: aparece el banner nativo automáticamente además de este botón.
 * En iOS/Safari: no hay banner automático, el usuario debe usar "Compartir → Agregar a inicio".
 */
import { useState, useEffect } from 'react'
import { Download, X, Smartphone } from 'lucide-react'
import styles from './BotonInstalarPWA.module.css'

export default function BotonInstalarPWA() {
  const [promptInstalacion, setPromptInstalacion] = useState(null)
  const [mostrarBanner, setMostrarBanner] = useState(false)
  const [instalada, setInstalada] = useState(false)
  const [esIOS, setEsIOS] = useState(false)
  const [mostrarGuiaIOS, setMostrarGuiaIOS] = useState(false)

  useEffect(() => {
    // Detectar iOS (Safari no dispara el evento beforeinstallprompt)
    const esDispositivoIOS = /iphone|ipad|ipod/i.test(navigator.userAgent)
    const esEnStandalone = window.navigator.standalone === true
    setEsIOS(esDispositivoIOS)

    // Si ya está instalada como PWA, no mostrar el banner
    if (esEnStandalone || window.matchMedia('(display-mode: standalone)').matches) {
      setInstalada(true)
      return
    }

    // En iOS, mostrar guía manual si no está instalada
    if (esDispositivoIOS && !esEnStandalone) {
      const yaVio = sessionStorage.getItem('ludiktic_ios_banner_visto')
      if (!yaVio) {
        setTimeout(() => setMostrarBanner(true), 3000)
      }
      return
    }

    // Android/Chrome/Edge: escuchar el evento nativo de instalación
    const manejarPrompt = (e) => {
      e.preventDefault()
      setPromptInstalacion(e)
      // Solo mostrar el banner si no lo ha descartado antes
      const descartado = localStorage.getItem('ludiktic_pwa_descartado')
      if (!descartado) {
        setMostrarBanner(true)
      }
    }

    window.addEventListener('beforeinstallprompt', manejarPrompt)
    window.addEventListener('appinstalled', () => {
      setInstalada(true)
      setMostrarBanner(false)
    })

    return () => {
      window.removeEventListener('beforeinstallprompt', manejarPrompt)
    }
  }, [])

  const handleInstalar = async () => {
    if (esIOS) {
      setMostrarGuiaIOS(true)
      return
    }
    if (!promptInstalacion) return

    promptInstalacion.prompt()
    const { outcome } = await promptInstalacion.userChoice
    if (outcome === 'accepted') {
      setInstalada(true)
      setMostrarBanner(false)
    }
    setPromptInstalacion(null)
  }

  const handleDescartar = () => {
    setMostrarBanner(false)
    if (esIOS) {
      sessionStorage.setItem('ludiktic_ios_banner_visto', '1')
    } else {
      localStorage.setItem('ludiktic_pwa_descartado', '1')
    }
  }

  // Si ya está instalada o el banner no debe mostrarse, no renderizar nada
  if (instalada || !mostrarBanner) return null

  return (
    <>
      {/* Banner de instalación flotante */}
      <div className={styles.banner} role="dialog" aria-label="Instalar LUDIKTIC como app">
        <div className={styles.contenido}>
          <div className={styles.icono}>
            <Smartphone size={28} />
          </div>
          <div className={styles.texto}>
            <strong>Instala LUDIKTIC</strong>
            <span>
              {esIOS
                ? 'Agrégala a tu pantalla de inicio para usarla como app.'
                : 'Descárgala como app y úsala sin internet.'}
            </span>
          </div>
          <div className={styles.acciones}>
            <button
              onClick={handleInstalar}
              className={styles.botonInstalar}
              aria-label="Instalar LUDIKTIC"
            >
              <Download size={16} />
              <span>{esIOS ? 'Cómo instalar' : 'Instalar'}</span>
            </button>
            <button
              onClick={handleDescartar}
              className={styles.botonCerrar}
              aria-label="Cerrar"
            >
              <X size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Guía paso a paso para iOS */}
      {mostrarGuiaIOS && (
        <div className={styles.overlayIOS} onClick={() => setMostrarGuiaIOS(false)}>
          <div className={styles.modalIOS} onClick={(e) => e.stopPropagation()}>
            <h3>📱 Instalar en iPhone / iPad</h3>
            <ol className={styles.pasos}>
              <li>
                <span className={styles.numeroPaso}>1</span>
                Toca el botón de <strong>Compartir</strong> (📤) en la barra inferior de Safari.
              </li>
              <li>
                <span className={styles.numeroPaso}>2</span>
                Desplázate hacia abajo y selecciona <strong>"Agregar a pantalla de inicio"</strong>.
              </li>
              <li>
                <span className={styles.numeroPaso}>3</span>
                Confirma tocando <strong>"Agregar"</strong> en la esquina superior derecha.
              </li>
              <li>
                <span className={styles.numeroPaso}>4</span>
                ¡Listo! El ícono de <strong>LUDIKTIC</strong> aparecerá en tu escritorio.
              </li>
            </ol>
            <button
              onClick={() => { setMostrarGuiaIOS(false); setMostrarBanner(false) }}
              className={styles.botonCerrarModal}
            >
              Entendido ✓
            </button>
          </div>
        </div>
      )}
    </>
  )
}
