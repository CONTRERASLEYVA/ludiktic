import { useState, useEffect } from 'react'
import { useAuth } from '../features/auth/ProveedorAuth'
import { AVATARES } from '../data/avatares'
import PersonajeBit from '../components/PersonajeBit'
import { escucharRanking } from '../features/gamificacion/sistemaPuntos'
import {
  Trophy,
  Flame,
  Star,
  Medal,
  Crown,
  Filter,
  Users,
  Sparkles,
  BookOpen,
  Atom,
  Terminal,
  Layers
} from 'lucide-react'
import styles from './Clasificacion.module.css'

export default function Clasificacion() {
  const { perfil } = useAuth()
  // Por defecto filtrar por el curso del estudiante logueado (ej: 8A-2026)
  const [cursoFiltro, setCursoFiltro] = useState(() => perfil?.curso || '8A-2026')
  const [areaFiltro, setAreaFiltro]   = useState('general')
  const [ranking, setRanking]         = useState([])
  const [cargando, setCargando]       = useState(true)

  // Escuchar ranking en tiempo real
  useEffect(() => {
    setCargando(true)
    const cancelar = escucharRanking({
      curso: cursoFiltro,
      area: areaFiltro,
      usuarioActual: perfil,
      alActualizar: (nuevaLista) => {
        setRanking(nuevaLista)
        setCargando(false)
      }
    })

    return () => cancelar()
  }, [cursoFiltro, areaFiltro, perfil])

  // Obtener puntos según el área filtrada
  const obtenerPuntos = (estudiante) => {
    if (areaFiltro === 'general') return estudiante.puntosTotal || 0
    return estudiante.puntosPorArea?.[areaFiltro] || 0
  }

  // Los 3 primeros para el podio
  const top1 = ranking[0]
  const top2 = ranking[1]
  const top3 = ranking[2]
  const restoEstudiantes = ranking.slice(3)

  // Posición del usuario actual
  const posicionUsuario = ranking.findIndex(
    u => u.uid === perfil?.uid || u.nombreUsuario === perfil?.nombreUsuario
  ) + 1

  const avatarInfoActual = AVATARES.find(a => a.id === perfil?.avatar) || AVATARES[0]

  // Mensaje motivacional de Bit según el puesto
  let mensajeBit = '¡Bienvenido a la tabla de posiciones! Resuelve retos STEAM para acumular puntos y escalar puestos.'
  let estadoBit = 'reposo'

  if (posicionUsuario === 1) {
    mensajeBit = '👑 ¡Eres el #1 de la clasificación! ¡Un verdadero Maestro STEAM! Mantén tu racha activa.'
    estadoBit = 'celebrando'
  } else if (posicionUsuario <= 3 && posicionUsuario > 1) {
    mensajeBit = `🏆 ¡Estás en el podio (puesto #${posicionUsuario})! Un par de retos más y alcanzarás el primer lugar.`
    estadoBit = 'celebrando'
  } else if (posicionUsuario > 3 && posicionUsuario <= 10) {
    mensajeBit = `⭐ Estás en el puesto #${posicionUsuario}. ¡Muy cerca del podio de honor! ¡A por ellos!`
    estadoBit = 'animando'
  } else if (posicionUsuario > 10) {
    mensajeBit = `¡Puesto #${posicionUsuario}! Cada línea de código cuenta. Escanea una nueva flashcard para sumar puntos.`
    estadoBit = 'animando'
  }

  return (
    <div className={styles.contenedorClasificacion}>
      {/* Cabecera y Mascota Bit */}
      <section className={styles.cabeceraHero}>
        <div className={styles.textosHero}>
          <div className={styles.badgeEnVivo}>
            <span className={styles.pulsoVerde} />
            <span>Tabla de Posiciones en Tiempo Real</span>
          </div>
          <h1 className={styles.titulo}>Clasificación STEAM</h1>
          <p className={styles.subtitulo}>
            Compite sanamente con tus compañeros de clase. Gana puntos resolviendo retos de Matemáticas, Ciencias e Informática.
          </p>

          {/* Tarjeta flotante de mi posición */}
          {perfil && posicionUsuario > 0 && (
            <div className={styles.miPosicionCard}>
              <div className={styles.miAvatarEmoji}>{avatarInfoActual.emoji}</div>
              <div className={styles.miPosicionInfo}>
                <span className={styles.miPosicionEtiqueta}>Tu lugar actual</span>
                <span className={styles.miPosicionValor}>
                  Puesto <strong>#{posicionUsuario}</strong> de {ranking.length} · ⭐ {obtenerPuntos(perfil)} pts
                </span>
              </div>
            </div>
          )}
        </div>

        <div className={styles.bitWrap}>
          <PersonajeBit
            area={areaFiltro === 'general' ? 'general' : areaFiltro}
            estado={estadoBit}
            tamano="md"
            mensaje={mensajeBit}
          />
        </div>
      </section>

      {/* Barra de Filtros: Por Curso y Por Área STEAM */}
      <section className={styles.seccionFiltros}>
        {/* Filtro de Área */}
        <div className={styles.grupoFiltros}>
          <span className={styles.tituloFiltro}>
            <Layers size={16} />
            <span>Área:</span>
          </span>
          <div className={styles.chipsFiltro}>
            {[
              { id: 'general', label: 'General (Total)', icono: Trophy },
              { id: 'matematicas', label: 'Matemáticas', icono: BookOpen },
              { id: 'ciencias', label: 'Ciencias', icono: Atom },
              { id: 'informatica', label: 'Informática', icono: Terminal }
            ].map((area) => {
              const Icono = area.icono
              const activo = areaFiltro === area.id
              return (
                <button
                  key={area.id}
                  type="button"
                  onClick={() => setAreaFiltro(area.id)}
                  className={`${styles.chipBtn} ${activo ? styles.chipActivo : ''}`}
                >
                  <Icono size={14} />
                  <span>{area.label}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Filtro de Curso */}
        <div className={styles.grupoFiltros}>
          <span className={styles.tituloFiltro}>
            <Users size={16} />
            <span>Curso:</span>
          </span>
          <div className={styles.chipsFiltro}>
            {[
              { id: '8A-2026', label: 'Grado 8A' },
              { id: '8B-2026', label: 'Grado 8B' },
              ...(perfil?.curso && !['8A-2026', '8B-2026', 'todos'].includes(perfil.curso)
                ? [{ id: perfil.curso, label: `Curso ${perfil.curso}` }]
                : []),
              { id: 'todos', label: 'Todos los cursos' }
            ].map((curso) => (
              <button
                key={curso.id}
                type="button"
                onClick={() => setCursoFiltro(curso.id)}
                className={`${styles.chipBtn} ${cursoFiltro === curso.id ? styles.chipActivo : ''}`}
              >
                <span>{curso.label}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ================= EL PODIO DE HONOR (TOP 3) ================= */}
      {ranking.length >= 3 && (
        <section className={styles.seccionPodio}>
          {/* Puesto 2: Plata (Izquierda) */}
          {top2 && (
            <div className={`${styles.columnaPodio} ${styles.podioSegundo}`}>
              <div className={styles.tarjetaPodio}>
                <div className={styles.medallaBadge} style={{ background: '#94A3B8', color: '#0F172A' }}>
                  <Medal size={16} />
                  <span>2</span>
                </div>
                <div className={styles.avatarPodio}>
                  <span>{(AVATARES.find(a => a.id === top2.avatar) || AVATARES[0]).emoji}</span>
                </div>
                <h3 className={styles.nombrePodio}>{top2.nombreUsuario}</h3>
                <span className={styles.cursoPodio}>{top2.curso}</span>
                <span className={styles.puntosPodio}>{obtenerPuntos(top2)} pts</span>
              </div>
              <div className={`${styles.pedestal} ${styles.pedestalPlata}`}>
                <span>2° Lugar</span>
              </div>
            </div>
          )}

          {/* Puesto 1: Oro (Centro, Más Alto) */}
          {top1 && (
            <div className={`${styles.columnaPodio} ${styles.podioPrimero}`}>
              <div className={styles.coronaWrap}>
                <Crown size={28} color="#FBBF24" className={styles.coronaIcono} />
              </div>
              <div className={`${styles.tarjetaPodio} ${styles.tarjetaOro}`}>
                <div className={styles.medallaBadge} style={{ background: '#FBBF24', color: '#0F172A' }}>
                  <Trophy size={16} />
                  <span>1</span>
                </div>
                <div className={`${styles.avatarPodio} ${styles.avatarOro}`}>
                  <span>{(AVATARES.find(a => a.id === top1.avatar) || AVATARES[0]).emoji}</span>
                </div>
                <h3 className={styles.nombrePodio}>{top1.nombreUsuario}</h3>
                <span className={styles.cursoPodio}>{top1.curso}</span>
                <span className={styles.puntosPodio}>{obtenerPuntos(top1)} pts</span>
              </div>
              <div className={`${styles.pedestal} ${styles.pedestalOro}`}>
                <span>1° Campeón</span>
              </div>
            </div>
          )}

          {/* Puesto 3: Bronce (Derecha) */}
          {top3 && (
            <div className={`${styles.columnaPodio} ${styles.podioTercero}`}>
              <div className={styles.tarjetaPodio}>
                <div className={styles.medallaBadge} style={{ background: '#D97706', color: '#FFFFFF' }}>
                  <Medal size={16} />
                  <span>3</span>
                </div>
                <div className={styles.avatarPodio}>
                  <span>{(AVATARES.find(a => a.id === top3.avatar) || AVATARES[0]).emoji}</span>
                </div>
                <h3 className={styles.nombrePodio}>{top3.nombreUsuario}</h3>
                <span className={styles.cursoPodio}>{top3.curso}</span>
                <span className={styles.puntosPodio}>{obtenerPuntos(top3)} pts</span>
              </div>
              <div className={`${styles.pedestal} ${styles.pedestalBronce}`}>
                <span>3° Lugar</span>
              </div>
            </div>
          )}
        </section>
      )}

      {/* ================= TABLA DE POSICIONES COMPLETA ================= */}
      <section className={styles.seccionTabla}>
        <div className={styles.cabeceraTabla}>
          <h2>Posiciones del Curso</h2>
          <span>{ranking.length} estudiantes participando</span>
        </div>

        <div className={styles.listaFilas}>
          {ranking.map((estudiante, index) => {
            const puesto = index + 1
            const esYo = estudiante.uid === perfil?.uid || estudiante.nombreUsuario === perfil?.nombreUsuario
            const avInfo = AVATARES.find(a => a.id === estudiante.avatar) || AVATARES[0]
            const pts = obtenerPuntos(estudiante)

            return (
              <div
                key={estudiante.uid || index}
                className={`${styles.filaEstudiante} ${esYo ? styles.filaPropia : ''} ${puesto <= 3 ? styles.filaTop3 : ''}`}
              >
                {/* Número de puesto */}
                <div className={styles.puestoCol}>
                  {puesto === 1 ? (
                    <span className={styles.badgePuesto1}>🥇</span>
                  ) : puesto === 2 ? (
                    <span className={styles.badgePuesto2}>🥈</span>
                  ) : puesto === 3 ? (
                    <span className={styles.badgePuesto3}>🥉</span>
                  ) : (
                    <span className={styles.numeroPuesto}>#{puesto}</span>
                  )}
                </div>

                {/* Avatar y Datos */}
                <div className={styles.estudianteCol}>
                  <div className={styles.avatarMiniCirculo} style={{ borderColor: avInfo.color }}>
                    <span>{avInfo.emoji}</span>
                  </div>
                  <div className={styles.nombresInfo}>
                    <div className={styles.filaNombreBadge}>
                      <span className={styles.nombreEstudiante}>{estudiante.nombreUsuario}</span>
                      {esYo && <span className={styles.chipTu}>Tú</span>}
                    </div>
                    <span className={styles.metaEstudiante}>
                      {estudiante.curso} · Nivel {estudiante.nivel || 1} ({estudiante.nombreNivel || 'Explorador'})
                    </span>
                  </div>
                </div>

                {/* Racha */}
                <div className={styles.rachaCol} title={`Racha de ${estudiante.racha || 1} días consecutivos`}>
                  <Flame size={15} color="#EF4444" />
                  <span>{estudiante.racha || 1}d</span>
                </div>

                {/* Puntos */}
                <div className={styles.puntosCol}>
                  <span className={styles.puntosNumero}>{pts}</span>
                  <span className={styles.puntosLabel}>pts</span>
                </div>
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}
