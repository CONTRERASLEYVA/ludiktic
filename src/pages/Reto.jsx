import { useState, useEffect, useRef } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import CodeMirror from '@uiw/react-codemirror'
import { python } from '@codemirror/lang-python'
import { EditorView } from '@codemirror/view'
import confetti from 'canvas-confetti'
import { useAuth } from '../features/auth/ProveedorAuth'
import retosData from '../data/retos.json'
import PersonajeBit from '../components/PersonajeBit'
import { ejecutarEnWorker, precalentarPyodide } from '../features/ejecucion/ejecutorPython'
import { calcularNivel, evaluarInsignias } from '../features/gamificacion/sistemaPuntos'
import {
  Play,
  Send,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  HelpCircle,
  CheckCircle2,
  XCircle,
  ArrowLeft,
  Star,
  Award,
  Terminal,
  FileCode2,
  Sparkles,
  ArrowRight
} from 'lucide-react'
import styles from './Reto.module.css'

export default function Reto() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { perfil, actualizarPerfil } = useAuth()

  // Buscar reto en el banco de retos
  const reto = retosData.find(r => r.id === id) || retosData[0]

  // Estado del editor y código
  const claveStorage = `steam_codigo_${reto.id}`
  const [codigo, setCodigo] = useState(() => {
    return localStorage.getItem(claveStorage) || reto.plantilla
  })

  // Tamaño de fuente del editor (zoom)
  const [tamanoLetra, setTamanoLetra] = useState(14)

  // Pestaña activa en celulares ('problema' o 'codigo')
  const [tabMovil, setTabMovil] = useState('problema')

  // Estado de ejecución y consola
  const [ejecutando, setEjecutando] = useState(false)
  const [salidaConsola, setSalidaConsola] = useState('')
  const [errorConsola, setErrorConsola] = useState('')
  const [resultadosPruebas, setResultadosPruebas] = useState([])
  const [intentosRealizados, setIntentosRealizados] = useState(0)

  // Pistas progresivas (Sección 10.2 y 11.2)
  const [pistasReveladas, setPistasReveladas] = useState(0)

  // Modal de solución correcta
  const [modalVictoria, setModalVictoria] = useState(null)

  // Estado de Bit para animación
  const [estadoBit, setEstadoBit] = useState('reposo')
  const [mensajeBit, setMensajeBit] = useState(null)

  // Guardado automático del código
  useEffect(() => {
    localStorage.setItem(claveStorage, codigo)
  }, [codigo, claveStorage])

  // Al cambiar de reto, resetear consola
  useEffect(() => {
    const guardado = localStorage.getItem(`steam_codigo_${reto.id}`)
    setCodigo(guardado || reto.plantilla)
    setSalidaConsola('')
    setErrorConsola('')
    setResultadosPruebas([])
    setPistasReveladas(0)
    setModalVictoria(null)
    setEstadoBit('reposo')
    setMensajeBit(null)
  }, [reto.id, reto.plantilla])

  // Precalentar motor de Python en segundo plano al abrir el reto
  useEffect(() => {
    precalentarPyodide()
  }, [])

  // Desbloqueo automático al abrir por URL directa o escaneo de cámara nativa (Sección 8.3)
  useEffect(() => {
    if (perfil && reto?.id) {
      const desbloqueados = perfil.retosDesbloqueados || []
      if (!desbloqueados.includes(reto.id)) {
        actualizarPerfil({
          retosDesbloqueados: [...desbloqueados, reto.id]
        })
      }
    }
  }, [perfil, reto?.id])

  // Insertar símbolo desde la barra rápida de celular
  const insertarSimbolo = (simbolo) => {
    setCodigo(prev => prev + simbolo)
  }

  // 1. Botón "Ejecutar": Prueba el código y muestra salida sin calificar
  const handleEjecutar = async () => {
    setEjecutando(true)
    setErrorConsola('')
    setResultadosPruebas([])
    setEstadoBit('pensando')
    setSalidaConsola('⚡ Ejecutando tu código con Python...')

    // Si está en pantalla móvil/tablet (<900px), cambiar a la pestaña de código para ver la consola
    if (window.innerWidth < 900) {
      setTabMovil('codigo')
    }

    const resultado = await ejecutarEnWorker({
      codigo,
      pruebas: [],
      tipo: 'EJECUTAR',
      onProgreso: (msg) => setSalidaConsola(msg)
    })

    setEjecutando(false)
    if (resultado.exito) {
      setSalidaConsola(resultado.salida || '(El programa terminó sin imprimir nada)')
      setEstadoBit('reposo')
      setMensajeBit('¡Tu código se ejecutó sin errores! Ahora dale a "Enviar solución" para calificarlo.')
    } else {
      setErrorConsola(resultado.error)
      setSalidaConsola('')
      setEstadoBit('animando')
      setMensajeBit('¡Casi! Revisa el error en la consola y ajusta tu código.')
    }
  }

  // 2. Botón "Enviar solución": Corre todos los casos de prueba y califica
  const handleEnviar = async () => {
    setEjecutando(true)
    setErrorConsola('')
    setResultadosPruebas([])
    setEstadoBit('pensando')
    setSalidaConsola('🧪 Validando contra los casos de prueba...')
    const nuevoIntento = intentosRealizados + 1
    setIntentosRealizados(nuevoIntento)

    if (window.innerWidth < 900) {
      setTabMovil('codigo')
    }

    const resultado = await ejecutarEnWorker({
      codigo,
      pruebas: reto.pruebas,
      tipo: 'EJECUTAR',
      onProgreso: (msg) => setSalidaConsola(msg)
    })

    setEjecutando(false)

    if (resultado.error) {
      setErrorConsola(resultado.error)
      setSalidaConsola('')
      setEstadoBit('animando')
      setMensajeBit('Ocurrió un error. Corrige la sintaxis antes de volver a enviar.')
      return
    }

    setSalidaConsola(resultado.salida || '')
    setResultadosPruebas(resultado.resultadosPruebas || [])

    if (resultado.exito) {
      // ¡SOLUCIÓN CORRECTA! Celebración y cálculo de puntos (Sección 11.1 y 11.2)
      setEstadoBit('celebrando')
      setMensajeBit('¡EXCELENTE! Pasaste todas las pruebas automáticas. ¡Has ganado puntos STEAM!')

      // Lanzar confeti breve
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 }
        })
      } catch {
        // En caso de que falle confeti
      }

      // Cálculo de puntos según reglas gamificadas:
      // Base: 10, 25, 50 pts
      // +20% si primer intento
      // +10% si sin pistas
      // -15% por cada pista (mínimo 40% del base)
      const puntosBase = reto.puntos || 10
      let factorPistas = 1 - (pistasReveladas * 0.15)
      if (factorPistas < 0.4) factorPistas = 0.4

      let puntosGanados = Math.round(puntosBase * factorPistas)
      const bonoPrimerIntento = nuevoIntento === 1 ? Math.round(puntosBase * 0.2) : 0
      const bonoSinPistas = pistasReveladas === 0 ? Math.round(puntosBase * 0.1) : 0
      puntosGanados += bonoPrimerIntento + bonoSinPistas

      // Comprobar si ya estaba resuelto antes para no duplicar puntos (Sección 11.2)
      const yaResuelto = perfil?.retosResueltos?.includes(reto.id)
      const puntosOtorgados = yaResuelto ? 0 : puntosGanados

      let nuevasInsignias = []
      let nuevoNivelInfo = null
      let subioNivel = false

      if (!yaResuelto) {
        const nuevosResueltos = [...(perfil?.retosResueltos || []), reto.id]
        const nuevosPuntosTotal = (perfil?.puntosTotal || 0) + puntosOtorgados

        // Puntos por área
        const areaReto = reto.area || 'matematicas'
        const puntosAreaActual = perfil?.puntosPorArea?.[areaReto] || 0
        const nuevoPuntosArea = {
          ...(perfil?.puntosPorArea || {}),
          [areaReto]: puntosAreaActual + puntosOtorgados
        }

        nuevoNivelInfo = calcularNivel(nuevosPuntosTotal)
        subioNivel = nuevoNivelInfo.nivel > (perfil?.nivel || 1)

        const perfilTentativo = {
          ...perfil,
          retosResueltos: nuevosResueltos,
          puntosTotal: nuevosPuntosTotal,
          puntosPorArea: nuevoPuntosArea,
          nivel: nuevoNivelInfo.nivel,
          nombreNivel: nuevoNivelInfo.nombre,
          logroImparable: nuevoIntento === 1 && pistasReveladas === 0
        }

        nuevasInsignias = evaluarInsignias(perfilTentativo)
        const listaInsigniasActualizada = [
          ...(perfil?.insignias || []),
          ...nuevasInsignias.map(i => i.id)
        ]

        actualizarPerfil({
          retosResueltos: nuevosResueltos,
          puntosTotal: nuevosPuntosTotal,
          puntosPorArea: nuevoPuntosArea,
          nivel: nuevoNivelInfo.nivel,
          nombreNivel: nuevoNivelInfo.nombre,
          insignias: listaInsigniasActualizada
        })
      }

      setModalVictoria({
        puntosGanados: puntosOtorgados,
        yaResuelto,
        bonoPrimerIntento,
        bonoSinPistas,
        pistasUsadas: pistasReveladas,
        totalPruebas: reto.pruebas.length,
        subioNivel,
        nuevoNivel: nuevoNivelInfo?.nivel,
        nuevoNombreNivel: nuevoNivelInfo?.nombre,
        nuevasInsignias
      })
    } else {
      // Alguna prueba falló
      setEstadoBit('animando')
      const superadas = resultado.resultadosPruebas?.filter(p => p.aprobada).length || 0
      const total = resultado.pruebas?.length || reto.pruebas.length
      setMensajeBit(`Pasaste ${superadas} de ${total} pruebas. ¡Revisa la consola para ver qué salida falló!`)
    }
  }

  // 3. Reiniciar código a la plantilla original
  const handleReiniciar = () => {
    if (window.confirm('¿Quieres reiniciar tu código al código de ejemplo original?')) {
      setCodigo(reto.plantilla)
      localStorage.removeItem(claveStorage)
      setSalidaConsola('')
      setErrorConsola('')
      setResultadosPruebas([])
    }
  }

  // 4. Revelar siguiente pista
  const revelarPista = () => {
    if (pistasReveladas < reto.pistas.length) {
      setPistasReveladas(prev => prev + 1)
      setEstadoBit('pista')
      setMensajeBit('💡 ¡Aquí tienes una pista! Recuerda que cada pista descuenta un pequeño porcentaje de puntos.')
    }
  }

  // Siguiente reto en la lista
  const indexActual = retosData.findIndex(r => r.id === reto.id)
  const siguienteReto = retosData[(indexActual + 1) % retosData.length]

  return (
    <div className={styles.contenedorReto}>
      {/* Barra superior de navegación del reto */}
      <div className={styles.barraSuperior}>
        <Link to={`/areas?area=${reto.area}`} className={styles.botonVolver}>
          <ArrowLeft size={18} />
          <span>Volver a {reto.area}</span>
        </Link>

        <div className={styles.badgeRetoInfo}>
          <span className={styles.retoId}>{reto.id}</span>
          <span className={styles.estrellasNivel}>{'★'.repeat(reto.nivel)}</span>
          <span className={styles.puntosBadge}>+{reto.puntos} pts</span>
        </div>
      </div>

      {/* Selector de pestañas para celular */}
      <div className={styles.tabsMovil}>
        <button
          type="button"
          onClick={() => setTabMovil('problema')}
          className={`${styles.tabBtn} ${tabMovil === 'problema' ? styles.tabActivo : ''}`}
        >
          <FileCode2 size={16} />
          <span>1. Problema</span>
        </button>
        <button
          type="button"
          onClick={() => setTabMovil('codigo')}
          className={`${styles.tabBtn} ${tabMovil === 'codigo' ? styles.tabActivo : ''}`}
        >
          <Terminal size={16} />
          <span>2. Código y Pruebas</span>
          {resultadosPruebas.length > 0 && <span className={styles.dotPruebas} />}
        </button>
      </div>

      {/* Contenedor principal de dos columnas */}
      <div className={styles.columnasReto}>
        {/* ================= COLUMNA IZQUIERDA: ENUNCIADO ================= */}
        <section className={`${styles.columnaEnunciado} ${tabMovil === 'codigo' ? styles.ocultoEnMovil : ''}`}>
          {/* Mascota Bit interactiva narrando el problema */}
          <div className={styles.bitNarradorWrap}>
            <PersonajeBit
              area={reto.area}
              estado={estadoBit}
              tamano="md"
              mensaje={mensajeBit || `¡Hola! Resolvamos juntos "${reto.titulo}". Lee con atención la historia.`}
              contexto={reto.contextoPersonaje}
            />
          </div>

          <div className={styles.cajaProblema}>
            <h1 className={styles.tituloReto}>{reto.titulo}</h1>

            {/* Componentes STEAM */}
            <div className={styles.steamBadges}>
              {reto.steam.map(s => (
                <span key={s} className={styles.chipSteam}>STEAM: {s}</span>
              ))}
            </div>

            {/* Historia narrativa */}
            <div className={styles.seccionHistoria}>
              <h3>📖 Situación</h3>
              <p>{reto.historia}</p>
            </div>

            {/* Instrucción concreta */}
            <div className={styles.seccionInstruccion}>
              <h3>🎯 Tu misión</h3>
              <p>{reto.instruccion}</p>
            </div>

            {/* Ejemplo de entrada y salida */}
            <div className={styles.seccionEjemplo}>
              <h3>💡 Ejemplo</h3>
              <pre className={styles.bloqueEjemplo}>{reto.ejemplo}</pre>
            </div>

            {/* Pistas Progresivas */}
            <div className={styles.seccionPistas}>
              <div className={styles.cabeceraPistas}>
                <h3>🔍 Pistas de ayuda</h3>
                <span className={styles.contadorPistas}>
                  {pistasReveladas} de {reto.pistas.length} usadas (-15% pts c/u)
                </span>
              </div>

              {pistasReveladas > 0 && (
                <div className={styles.listaPistas}>
                  {reto.pistas.slice(0, pistasReveladas).map((pista, idx) => (
                    <div key={idx} className={styles.tarjetaPista}>
                      <strong>Pista {idx + 1}:</strong>
                      <p>{pista}</p>
                    </div>
                  ))}
                </div>
              )}

              {pistasReveladas < reto.pistas.length && (
                <button
                  type="button"
                  onClick={revelarPista}
                  className={styles.botonRevelarPista}
                >
                  <HelpCircle size={16} />
                  <span>Ver pista {pistasReveladas + 1}</span>
                </button>
              )}
            </div>
          </div>
        </section>

        {/* ================= COLUMNA DERECHA: EDITOR & CONSOLA ================= */}
        <section className={`${styles.columnaEditor} ${tabMovil === 'problema' ? styles.ocultoEnMovil : ''}`}>
          {/* Barra de herramientas del editor */}
          <div className={styles.barraEditor}>
            <div className={styles.grupoBotonesZoom}>
              <button
                type="button"
                onClick={() => setTamanoLetra(prev => Math.max(12, prev - 2))}
                className={styles.btnTool}
                title="Reducir tamaño de letra"
              >
                <ZoomOut size={16} />
              </button>
              <span className={styles.tamanoIndicador}>{tamanoLetra}px</span>
              <button
                type="button"
                onClick={() => setTamanoLetra(prev => Math.min(22, prev + 2))}
                className={styles.btnTool}
                title="Aumentar tamaño de letra"
              >
                <ZoomIn size={16} />
              </button>
            </div>

            <button
              type="button"
              onClick={handleReiniciar}
              className={`${styles.btnTool} ${styles.btnReiniciar}`}
              title="Reiniciar a plantilla original"
            >
              <RotateCcw size={15} />
              <span>Reiniciar</span>
            </button>
          </div>

          {/* Componente CodeMirror 6 con Python */}
          <div className={styles.contenedorCodeMirror} style={{ fontSize: `${tamanoLetra}px` }}>
            <CodeMirror
              value={codigo}
              height="300px"
              extensions={[python(), EditorView.lineWrapping]}
              theme="dark"
              onChange={(val) => setCodigo(val)}
              basicSetup={{
                lineNumbers: true,
                autocompletion: true,
                foldGutter: false,
                bracketMatching: true,
                closeBrackets: true,
                indentOnInput: true
              }}
            />
          </div>

          {/* Barra de teclas rápidas para celulares (Sección 10.3) */}
          <div className={styles.tecladoRapido}>
            <span className={styles.tecladoTitulo}>Símbolos:</span>
            {['(', ')', '[', ']', ':', '=', '"', '#', '    ', '+', '-', '*'].map((simb, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => insertarSimbolo(simb)}
                className={styles.teclaRapida}
              >
                {simb === '    ' ? '⇥ Tab' : simb}
              </button>
            ))}
          </div>

          {/* Botones de acción principales */}
          <div className={styles.accionesEditor}>
            <button
              type="button"
              onClick={handleEjecutar}
              disabled={ejecutando}
              className={styles.botonEjecutar}
            >
              <Play size={18} />
              <span>{ejecutando ? 'Ejecutando...' : 'Probar código'}</span>
            </button>

            <button
              type="button"
              onClick={handleEnviar}
              disabled={ejecutando}
              className={styles.botonEnviar}
            >
              <Send size={18} />
              <span>{ejecutando ? 'Calificando...' : 'Enviar solución'}</span>
            </button>
          </div>

          {/* Consola de Salida y Pruebas Automáticas */}
          <div className={styles.cajaConsola}>
            <div className={styles.cabeceraConsola}>
              <div className={styles.iconoTerminal}>
                <Terminal size={15} />
                <span>Consola de Resultados</span>
              </div>
              {ejecutando && <span className={styles.indicadorCarga}>Procesando...</span>}
            </div>

            <div className={styles.cuerpoConsola}>
              {/* Error traducido */}
              {errorConsola && (
                <div className={styles.mensajeError}>
                  <p>{errorConsola}</p>
                </div>
              )}

              {/* Salida capturada */}
              {salidaConsola && !errorConsola && (
                <pre className={styles.textoSalida}>{salidaConsola}</pre>
              )}

              {/* Resultados de Casos de Prueba */}
              {resultadosPruebas.length > 0 && (
                <div className={styles.seccionResultadosPruebas}>
                  <h4>Resultados de las pruebas automáticas:</h4>
                  <div className={styles.listaPruebas}>
                    {resultadosPruebas.map((p) => (
                      <div
                        key={p.numero}
                        className={`${styles.itemPrueba} ${p.aprobada ? styles.pruebaAprobada : styles.pruebaFallida}`}
                      >
                        <div className={styles.iconoPrueba}>
                          {p.aprobada ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
                        </div>
                        <div className={styles.detallesPrueba}>
                          <span className={styles.tituloPrueba}>
                            Prueba {p.numero} {p.oculta ? '(Evaluación oculta)' : ''}:
                            <strong>{p.aprobada ? ' Superada' : ' Fallida'}</strong>
                          </span>
                          {!p.oculta && (
                            <div className={styles.comparacionPrueba}>
                              <span>Entrada: <code>{p.entrada}</code></span>
                              <span>Esperado: <code>{p.esperado}</code></span>
                              <span>Obtenido: <code>{p.obtenido}</code></span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {!salidaConsola && !errorConsola && resultadosPruebas.length === 0 && (
                <p className={styles.placeholderConsola}>
                  Presiona "Probar código" para ver la salida de tus print(), o "Enviar solución" para calificar contra todas las pruebas.
                </p>
              )}
            </div>
          </div>
        </section>
      </div>

      {/* ================= MODAL DE VICTORIA / RETO SUPERADO ================= */}
      {modalVictoria && (
        <div className={styles.overlayModal}>
          <div className={styles.modalVictoria}>
            <div className={styles.bitCelebracion}>
              <PersonajeBit
                area={reto.area}
                estado="celebrando"
                tamano="md"
                contexto={reto.contextoPersonaje}
              />
            </div>

            <div className={styles.encabezadoVictoria}>
              <span className={styles.badgeVictoria}>¡Reto Superado! 🎉</span>
              <h2>¡Excelente trabajo!</h2>
              <p>Tu programa resolvió el problema correctamente y pasó todas las pruebas automáticas.</p>
            </div>

            <div className={styles.resumenPuntosGanados}>
              <div className={styles.granPuntos}>
                <span>+{modalVictoria.puntosGanados}</span>
                <small>puntos STEAM</small>
              </div>

              {modalVictoria.yaResuelto ? (
                <span className={styles.avisoYaResuelto}>Ya habías superado este reto antes (los puntos se suman una sola vez).</span>
              ) : (
                <div className={styles.desgloseBonos}>
                  {modalVictoria.bonoPrimerIntento > 0 && (
                    <div className={styles.filaBono}>
                      <span>🔥 Bono primer intento (+20%)</span>
                      <strong>+{modalVictoria.bonoPrimerIntento} pts</strong>
                    </div>
                  )}
                  {modalVictoria.bonoSinPistas > 0 && (
                    <div className={styles.filaBono}>
                      <span>⭐ Bono sin pistas (+10%)</span>
                      <strong>+{modalVictoria.bonoSinPistas} pts</strong>
                    </div>
                  )}
                  {modalVictoria.pistasUsadas > 0 && (
                    <div className={styles.filaDescuento}>
                      <span>Pistas usadas ({modalVictoria.pistasUsadas})</span>
                      <strong>-{modalVictoria.pistasUsadas * 15}%</strong>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Subida de Nivel */}
            {modalVictoria.subioNivel && (
              <div className={styles.bannerSubidaNivel}>
                <div className={styles.iconoSubidaNivel}>🚀</div>
                <div className={styles.textoSubidaNivel}>
                  <span>¡Subiste de Nivel!</span>
                  <strong>Nivel {modalVictoria.nuevoNivel}: {modalVictoria.nuevoNombreNivel}</strong>
                </div>
              </div>
            )}

            {/* Nuevas Insignias Desbloqueadas */}
            {modalVictoria.nuevasInsignias && modalVictoria.nuevasInsignias.length > 0 && (
              <div className={styles.bannerNuevasInsignias}>
                <span className={styles.tituloNuevasInsignias}>¡Nuevas Insignias Desbloqueadas! 🎖️</span>
                <div className={styles.gridInsigniasGanadas}>
                  {modalVictoria.nuevasInsignias.map(insignia => (
                    <div key={insignia.id} className={styles.chipInsigniaGanada}>
                      <span className={styles.iconoInsigniaChip}>{insignia.icono}</span>
                      <div>
                        <strong>{insignia.nombre}</strong>
                        <div><span>{insignia.descripcion}</span></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className={styles.accionesVictoria}>
              <button
                type="button"
                onClick={() => setModalVictoria(null)}
                className={styles.btnSeguirEditando}
              >
                Seguir practicando aquí
              </button>

              <Link
                to={`/reto/${siguienteReto.id}`}
                className={styles.btnSiguienteReto}
              >
                <span>Siguiente reto ({siguienteReto.id})</span>
                <ArrowRight size={18} />
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
