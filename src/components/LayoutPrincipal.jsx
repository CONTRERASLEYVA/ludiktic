import { Outlet } from 'react-router-dom'
import BarraLateral from './BarraLateral'
import HeaderSuperior from './HeaderSuperior'
import NavbarInferior from './NavbarInferior'
import BotonInstalarPWA from './BotonInstalarPWA'
import styles from './LayoutPrincipal.module.css'

/**
 * Layout principal responsive para las páginas autenticadas:
 * - Computador: Barra lateral izquierda fija + contenido principal
 * - Celular: Header superior fijo + contenido + Barra inferior fija
 * - PWA: Banner de instalación flotante en todas las páginas
 */
export default function LayoutPrincipal() {
  return (
    <div className={styles.contenedorApp}>
      {/* Barra lateral en computadores */}
      <BarraLateral />

      {/* Cabecera en celulares */}
      <HeaderSuperior />

      {/* Área de contenido de la página actual */}
      <main className={styles.areaContenido}>
        <div className={styles.limiteAncho}>
          <Outlet />
        </div>
      </main>

      {/* Barra de navegación inferior en celulares */}
      <NavbarInferior />

      {/* Banner de instalación PWA — Aparece automáticamente en Android/iOS si no está instalada */}
      <BotonInstalarPWA />
    </div>
  )
}
