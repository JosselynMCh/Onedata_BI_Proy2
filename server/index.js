import crypto from 'node:crypto'
import bcrypt from 'bcryptjs'
import cors from 'cors'
import dotenv from 'dotenv'
import express from 'express'
import { pool, query } from './db.js'

dotenv.config()

const app = express()
const port = Number(process.env.PORT) || 3001

const allowedOrigins = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean)

app.use(
  cors({
    origin: allowedOrigins.length > 0 ? allowedOrigins : true,
  }),
)
app.use(express.json())

function verifyPassword(plainPassword, storedHash) {
  if (!storedHash) return false

  if (/^\$2[aby]\$/.test(storedHash)) {
    return bcrypt.compareSync(plainPassword, storedHash)
  }

  if (/^[a-f0-9]{64}$/i.test(storedHash)) {
    const sha256 = crypto
      .createHash('sha256')
      .update(plainPassword)
      .digest('hex')
    return sha256.toLowerCase() === storedHash.toLowerCase()
  }

  return false
}

app.get('/api/health', async (_req, res) => {
  try {
    const result = await query('SELECT NOW() AS now')
    res.json({
      ok: true,
      database: 'connected',
      timestamp: result.rows[0].now,
    })
  } catch (error) {
    console.error('Database healthcheck failed:', error)
    res.status(500).json({
      ok: false,
      database: 'error',
      message: 'No se pudo conectar con la base de datos.',
    })
  }
})

app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body ?? {}

  if (!username?.trim() || !password) {
    return res.status(400).json({
      ok: false,
      message: 'Por favor, ingresa tu usuario corporativo y contraseña.',
    })
  }

  try {
    const userResult = await query(
      `
      SELECT
        u.id_usuario,
        u.nombre_usuario,
        u.hash_contrasena,
        u.nombres,
        u.apellidos,
        u.correo,
        u.esta_activo,
        u.ultimo_acceso,
        COALESCE(
          ARRAY_AGG(r.nombre) FILTER (WHERE r.nombre IS NOT NULL),
          '{}'
        ) AS roles
      FROM usuarios u
      LEFT JOIN usuarios_roles ur ON ur.id_usuario = u.id_usuario
      LEFT JOIN roles r ON r.id_rol = ur.id_rol
      WHERE LOWER(u.nombre_usuario) = LOWER($1)
         OR LOWER(u.correo) = LOWER($1)
      GROUP BY u.id_usuario
      LIMIT 1
      `,
      [username.trim()],
    )

    if (userResult.rows.length === 0) {
      return res.status(401).json({
        ok: false,
        message: 'Usuario o contraseña incorrectos.',
      })
    }

    const user = userResult.rows[0]

    if (!user.esta_activo) {
      return res.status(403).json({
        ok: false,
        message: 'Tu cuenta se encuentra inactiva. Contacta al administrador.',
      })
    }

    const isValid = verifyPassword(password, user.hash_contrasena)
    if (!isValid) {
      return res.status(401).json({
        ok: false,
        message: 'Usuario o contraseña incorrectos.',
      })
    }

    await query(
      'UPDATE usuarios SET ultimo_acceso = CURRENT_TIMESTAMP WHERE id_usuario = $1',
      [user.id_usuario],
    )

    await query(
      `
      INSERT INTO registros_auditoria (id_usuario, accion, nombre_entidad, id_entidad, valores_nuevos)
      VALUES ($1, 'LOGIN', 'usuarios', $1, $2::jsonb)
      `,
      [
        user.id_usuario,
        JSON.stringify({
          nombre_usuario: user.nombre_usuario,
          origen: 'web_login',
        }),
      ],
    )

    return res.json({
      ok: true,
      user: {
        id_usuario: user.id_usuario,
        nombre_usuario: user.nombre_usuario,
        nombres: user.nombres,
        apellidos: user.apellidos,
        correo: user.correo,
        roles: user.roles,
      },
    })
  } catch (error) {
    console.error('Login error:', error)
    return res.status(500).json({
      ok: false,
      message: 'Error al validar credenciales con la base de datos.',
    })
  }
})

app.get('/api/dashboard/ejecutivo', async (_req, res) => {
  try {
    const [kpi1Res, kpi2Res, kpiHistRes, syncAreaRes, alertasRes, syncTimeRes] =
      await Promise.all([
        query('SELECT * FROM vw_kpi_migracion_dashboards'),
        query(
          `SELECT ROUND(AVG(disponibilidad_porcentaje)::numeric, 1) AS disponibilidad_promedio
           FROM vw_kpi_disponibilidad_diaria
           WHERE servicio = 'DASHBOARDS'`,
        ),
        query(
          `SELECT fecha, disponibilidad_porcentaje
           FROM vw_kpi_disponibilidad_diaria
           WHERE servicio = 'DASHBOARDS'
           ORDER BY fecha DESC
           LIMIT 7`,
        ),
        query(
          `SELECT
             a.id_area,
             a.nombre AS area,
             MAX(s.ultima_ejecucion) AS ultima_ejecucion,
             BOOL_OR(s.estado_ultima_ejecucion IN ('FALLIDO', 'ADVERTENCIA')) AS con_alerta
           FROM areas a
           LEFT JOIN vw_estado_sincronizacion s ON s.area_origen = a.nombre
           WHERE a.estado = TRUE
           GROUP BY a.id_area, a.nombre
           ORDER BY a.id_area`,
        ),
        query(
          `SELECT id_alerta, tipo, severidad, titulo, mensaje, estado, fecha_generacion
           FROM alertas_bi
           ORDER BY fecha_generacion DESC
           LIMIT 5`,
        ),
        query(
          `SELECT MAX(COALESCE(fin, inicio)) AS ultima_sincronizacion
           FROM ejecuciones_flujo
           WHERE estado = 'EXITOSO'`,
        ),
      ])

    res.json({
      ok: true,
      data: {
        kpiMigracion: kpi1Res.rows[0] || null,
        disponibilidadPromedio:
          kpi2Res.rows[0]?.disponibilidad_promedio ?? null,
        disponibilidadHistorial: kpiHistRes.rows.reverse(),
        syncAreas: syncAreaRes.rows,
        alertas: alertasRes.rows,
        ultimaSincronizacion: syncTimeRes.rows[0]?.ultima_sincronizacion || null,
      },
    })
  } catch (error) {
    console.error('Error loading executive dashboard:', error)
    res.status(500).json({
      ok: false,
      message: 'No se pudieron cargar los indicadores del dashboard.',
    })
  }
})

app.get('/api/dashboard/resumen-corporativo', async (_req, res) => {
  try {
    const [
      ventasRes,
      presupRes,
      cosechaRes,
      packingRes,
      kpi1Res,
      kpi2Res,
      fuentesRes,
      flujosRes,
      fallidosRes,
      alertasPendRes,
      presupMesRes,
      areaDistRes,
      alertasRes,
      ultimaCargaRes,
      checkRes,
    ] = await Promise.all([
      query(
        `SELECT COALESCE(SUM(monto_total), 0)::numeric AS total_ventas_usd
         FROM ordenes_despacho
         WHERE estado <> 'ANULADO'`,
      ),
      query(
        `SELECT
           COALESCE(SUM(monto_presupuestado), 0)::numeric AS total_presupuestado,
           COALESCE(SUM(monto_ejecutado), 0)::numeric AS total_ejecutado
         FROM presupuestos_mensuales`,
      ),
      query(
        'SELECT COALESCE(SUM(toneladas_cosechadas), 0)::numeric AS total_tn_campo FROM cosechas_diarias',
      ),
      query(
        'SELECT COALESCE(SUM(toneladas_exportables), 0)::numeric AS total_tn_packing FROM produccion_packing',
      ),
      query('SELECT * FROM vw_kpi_migracion_dashboards'),
      query(
        `SELECT ROUND(AVG(disponibilidad_porcentaje)::numeric, 1) AS disponibilidad
         FROM vw_kpi_disponibilidad_diaria
         WHERE servicio = 'DASHBOARDS'`,
      ),
      query(
        `SELECT
           COUNT(*)::int AS total,
           COUNT(*) FILTER (WHERE estado = 'ACTIVA')::int AS activas
         FROM fuentes_datos`,
      ),
      query(
        `SELECT
           COUNT(*)::int AS total,
           COUNT(*) FILTER (WHERE estado = 'ACTIVO')::int AS activos
         FROM flujos_datos`,
      ),
      query(
        "SELECT COUNT(*)::int AS fallidos FROM ejecuciones_flujo WHERE estado = 'FALLIDO'",
      ),
      query('SELECT COUNT(*)::int AS pendientes FROM vw_alertas_pendientes'),
      query(
        `SELECT
           mes,
           SUM(monto_presupuestado)::numeric AS presupuestado,
           SUM(monto_ejecutado)::numeric AS ejecutado
         FROM presupuestos_mensuales
         GROUP BY mes
         ORDER BY mes`,
      ),
      query(
        `SELECT a.nombre AS area, COUNT(r.id_registro)::int AS registros
         FROM areas a
         LEFT JOIN conjuntos_datos_dw c ON c.id_area = a.id_area
         LEFT JOIN registros_dw r ON r.id_conjunto = c.id_conjunto
         GROUP BY a.id_area, a.nombre
         ORDER BY a.id_area`,
      ),
      query(
        `SELECT
           al.id_alerta,
           al.tipo,
           al.severidad,
           al.titulo,
           al.estado,
           al.fecha_generacion,
           ar.nombre AS area
         FROM alertas_bi al
         LEFT JOIN areas ar ON ar.id_area = al.id_area
         ORDER BY al.fecha_generacion DESC
         LIMIT 5`,
      ),
      query(
        `SELECT MAX(COALESCE(fin, inicio)) AS ultima_carga
         FROM ejecuciones_flujo
         WHERE estado = 'EXITOSO'`,
      ),
      query(
        'SELECT MAX(fecha_comprobacion) AS ultima_verificacion FROM comprobaciones_servicio',
      ),
    ])

    const totalVentasUsd = Number(ventasRes.rows[0]?.total_ventas_usd || 0)
    const totalPresupuestadoPen = Number(
      presupRes.rows[0]?.total_presupuestado || 0,
    )
    const totalGastosPen = Number(presupRes.rows[0]?.total_ejecutado || 0)
    // Referencia corporativa en PEN (USD * 3.75 aprox.) para resultado operativo consolidado
    const ingresosPen = Math.round(totalVentasUsd * 3.75)
    const resultadoOperativoPen = ingresosPen - totalGastosPen
    const cumplimientoPresupuestal =
      totalPresupuestadoPen > 0
        ? Math.round((totalGastosPen / totalPresupuestadoPen) * 1000) / 10
        : 0

    const volumenCampoTn = Number(cosechaRes.rows[0]?.total_tn_campo || 0)
    const volumenPackingTn = Number(packingRes.rows[0]?.total_tn_packing || 0)

    res.json({
      ok: true,
      data: {
        indicadores: {
          ingresosTotalesPen: ingresosPen,
          ventasUsd: totalVentasUsd,
          gastosOperativosPen: totalGastosPen,
          presupuestoPen: totalPresupuestadoPen,
          resultadoOperativoPen,
          cumplimientoPresupuestal,
          volumenProduccionTn:
            Math.round((volumenCampoTn + volumenPackingTn) * 10) / 10,
        },
        ecosistema: {
          fuentesConectadas: fuentesRes.rows[0]?.activas ?? 0,
          fuentesTotal: fuentesRes.rows[0]?.total ?? 0,
          flujosActivos: flujosRes.rows[0]?.activos ?? 0,
          flujosTotal: flujosRes.rows[0]?.total ?? 0,
          procesosFallidos: fallidosRes.rows[0]?.fallidos ?? 0,
          alertasPendientes: alertasPendRes.rows[0]?.pendientes ?? 0,
        },
        kpiMigracion: kpi1Res.rows[0] || null,
        disponibilidad:
          kpi2Res.rows[0]?.disponibilidad != null
            ? Number(kpi2Res.rows[0].disponibilidad)
            : null,
        presupuestoMensual: presupMesRes.rows,
        areaDist: areaDistRes.rows,
        alertas: alertasRes.rows,
        ultimaCarga: ultimaCargaRes.rows[0]?.ultima_carga || null,
        ultimaVerificacion: checkRes.rows[0]?.ultima_verificacion || null,
      },
    })
  } catch (error) {
    console.error('Error loading corporate summary:', error)
    res.status(500).json({
      ok: false,
      message: 'No se pudo cargar el resumen corporativo.',
    })
  }
})

app.get('/api/dashboard/ventas-comercial', async (_req, res) => {
  try {
    const [
      kpiRes,
      clientesCountRes,
      tonRes,
      productosRes,
      evolucionRes,
      topClientesRes,
      destinosRes,
      alertasRes,
    ] = await Promise.all([
      query(
        `SELECT
           COALESCE(SUM(monto_total), 0)::numeric AS total_ventas_usd,
           ROUND(COALESCE(AVG(monto_total), 0), 0) AS ticket_promedio,
           COUNT(*)::int AS total_ordenes
         FROM ordenes_despacho
         WHERE estado <> 'ANULADO'`,
      ),
      query(
        "SELECT COUNT(*)::int AS clientes_activos FROM clientes WHERE estado = 'ACTIVO'",
      ),
      query(
        `SELECT
           COALESCE(SUM(toneladas_despachadas), 0)::numeric AS total_toneladas,
           COALESCE(SUM(cajas), 0)::int AS total_cajas
         FROM detalle_despachos`,
      ),
      query(
        `SELECT
           dd.producto,
           COALESCE(SUM(dd.toneladas_despachadas), 0)::numeric AS toneladas,
           COALESCE(SUM(dd.cajas), 0)::int AS cajas,
           COALESCE(SUM(dd.subtotal), 0)::numeric AS importe_usd
         FROM detalle_despachos dd
         JOIN ordenes_despacho od ON od.id_despacho = dd.id_despacho
         WHERE od.estado <> 'ANULADO'
         GROUP BY dd.producto
         ORDER BY importe_usd DESC`,
      ),
      query(
        `SELECT
           TO_CHAR(fecha_despacho, 'YYYY-MM') AS periodo,
           SUM(monto_total)::numeric AS ventas_usd
         FROM ordenes_despacho
         WHERE estado <> 'ANULADO'
         GROUP BY TO_CHAR(fecha_despacho, 'YYYY-MM')
         ORDER BY periodo`,
      ),
      query(
        `SELECT
           COALESCE(c.nombre_comercial, c.razon_social) AS cliente,
           c.pais,
           COALESCE(SUM(od.monto_total), 0)::numeric AS ventas_usd,
           COALESCE(SUM(dd.toneladas_despachadas), 0)::numeric AS toneladas
         FROM clientes c
         JOIN ordenes_despacho od ON od.id_cliente = c.id_cliente
         LEFT JOIN detalle_despachos dd ON dd.id_despacho = od.id_despacho
         WHERE od.estado <> 'ANULADO'
         GROUP BY c.id_cliente, c.nombre_comercial, c.razon_social, c.pais
         ORDER BY ventas_usd DESC
         LIMIT 5`,
      ),
      query(
        `SELECT
           c.pais AS destino,
           COALESCE(SUM(od.monto_total), 0)::numeric AS ventas_usd,
           COUNT(od.id_despacho)::int AS despachos
         FROM ordenes_despacho od
         JOIN clientes c ON c.id_cliente = od.id_cliente
         WHERE od.estado <> 'ANULADO'
         GROUP BY c.pais
         ORDER BY ventas_usd DESC`,
      ),
      query(
        `SELECT al.id_alerta, al.tipo, al.severidad, al.titulo, al.fecha_generacion
         FROM alertas_bi al
         LEFT JOIN areas ar ON ar.id_area = al.id_area
         WHERE ar.nombre = 'Comercial' OR al.id_area IS NULL
         ORDER BY al.fecha_generacion DESC
         LIMIT 4`,
      ),
    ])

    const totalVentasUsd = Number(kpiRes.rows[0]?.total_ventas_usd || 0)
    const metaComercialUsd = 480000
    const cumplimientoMetaPct =
      Math.round((totalVentasUsd / metaComercialUsd) * 1000) / 10

    res.json({
      ok: true,
      data: {
        kpis: {
          total_ventas_usd: totalVentasUsd,
          meta_comercial_usd: metaComercialUsd,
          cumplimiento_meta_pct: cumplimientoMetaPct,
          clientes_activos: clientesCountRes.rows[0]?.clientes_activos ?? 0,
          ticket_promedio: Number(kpiRes.rows[0]?.ticket_promedio || 0),
          total_toneladas:
            Math.round(Number(tonRes.rows[0]?.total_toneladas || 0) * 10) / 10,
          total_cajas: tonRes.rows[0]?.total_cajas ?? 0,
          margen_comercial_pct: 24.8,
        },
        productos: productosRes.rows,
        evolucion: evolucionRes.rows,
        topClientes: topClientesRes.rows,
        destinos: destinosRes.rows,
        alertas: alertasRes.rows,
      },
    })
  } catch (error) {
    console.error('Error loading sales dashboard:', error)
    res.status(500).json({
      ok: false,
      message: 'No se pudo cargar el tablero de ventas y comercial.',
    })
  }
})

app.get('/api/dashboard/operaciones', async (_req, res) => {
  try {
    const [
      cosechaRes,
      lotesAreaRes,
      packingTotalesRes,
      packingLineaRes,
      calidadRes,
      tiemposRes,
      syncRes,
      alertasRes,
    ] = await Promise.all([
      query(
        `SELECT
           COALESCE(SUM(kg_cosechados), 0)::numeric AS total_kg,
           COALESCE(SUM(toneladas_cosechadas), 0)::numeric AS total_toneladas
         FROM cosechas_diarias`,
      ),
      query(
        'SELECT COALESCE(SUM(area_ha), 0)::numeric AS total_ha FROM lotes_campo',
      ),
      query(
        `SELECT
           COALESCE(SUM(kg_ingresados), 0)::numeric AS kg_ingresados,
           COALESCE(SUM(kg_exportables), 0)::numeric AS kg_exportables,
           COALESCE(SUM(kg_descarte), 0)::numeric AS kg_descarte,
           COALESCE(SUM(cajas_producidas), 0)::int AS total_cajas
         FROM produccion_packing`,
      ),
      query(
        `SELECT
           lp.nombre AS linea,
           COALESCE(SUM(pp.toneladas_ingresadas), 0)::numeric AS toneladas_ingresadas,
           COALESCE(SUM(pp.toneladas_exportables), 0)::numeric AS toneladas_exportables,
           COALESCE(SUM(pp.toneladas_descarte), 0)::numeric AS toneladas_descarte,
           COALESCE(SUM(pp.cajas_producidas), 0)::int AS cajas
         FROM lineas_packing lp
         LEFT JOIN produccion_packing pp ON pp.id_linea = lp.id_linea
         GROUP BY lp.id_linea, lp.nombre
         ORDER BY lp.id_linea`,
      ),
      query(
        `SELECT ROUND(AVG((r.datos->>'porcentaje_calidad')::numeric), 1) AS calidad_prom
         FROM registros_dw r
         JOIN conjuntos_datos_dw c ON c.id_conjunto = r.id_conjunto
         WHERE c.nombre = 'dw_calidad_empaque'`,
      ),
      query(
        `SELECT ROUND(AVG(EXTRACT(EPOCH FROM (fin - inicio)) / 60.0)::numeric, 1) AS duracion_prom_min
         FROM ejecuciones_flujo
         WHERE fin IS NOT NULL`,
      ),
      query(
        `SELECT id_flujo, flujo, area_origen, ultima_ejecucion, estado_ultima_ejecucion
         FROM vw_estado_sincronizacion
         WHERE area_origen IN ('Campo', 'Packing')
         ORDER BY id_flujo`,
      ),
      query(
        `SELECT al.id_alerta, al.tipo, al.severidad, al.titulo, al.fecha_generacion
         FROM alertas_bi al
         LEFT JOIN areas ar ON ar.id_area = al.id_area
         WHERE ar.nombre IN ('Campo', 'Packing') OR al.id_area IS NULL
         ORDER BY al.fecha_generacion DESC
         LIMIT 4`,
      ),
    ])

    const tonCampo = Number(cosechaRes.rows[0]?.total_toneladas || 0)
    const totalHa = Number(lotesAreaRes.rows[0]?.total_ha || 0)
    const rendimientoCampoTonHa =
      totalHa > 0 ? Math.round((tonCampo / totalHa) * 100) / 100 : 0

    const kgIng = Number(packingTotalesRes.rows[0]?.kg_ingresados || 0)
    const kgExp = Number(packingTotalesRes.rows[0]?.kg_exportables || 0)
    const kgDesc = Number(packingTotalesRes.rows[0]?.kg_descarte || 0)
    const tonPackingExp = Math.round((kgExp / 1000) * 10) / 10
    const tonPackingDesc = Math.round((kgDesc / 1000) * 10) / 10
    const eficienciaPackingPct =
      kgIng > 0 ? Math.round((kgExp / kgIng) * 1000) / 10 : 0
    const mermaPct = kgIng > 0 ? Math.round((kgDesc / kgIng) * 1000) / 10 : 0

    res.json({
      ok: true,
      data: {
        produccionTotalTn: Math.round((tonCampo + tonPackingExp) * 10) / 10,
        tonCampo: Math.round(tonCampo * 10) / 10,
        rendimientoCampoTonHa,
        tonPackingIngresadas: Math.round((kgIng / 1000) * 10) / 10,
        tonPackingExportables: tonPackingExp,
        tonPackingDescarte: tonPackingDesc,
        totalCajas: packingTotalesRes.rows[0]?.total_cajas ?? 0,
        eficienciaPackingPct,
        mermaPct,
        calidadPromedio: Number(calidadRes.rows[0]?.calidad_prom || 0),
        duracionPromMin: Number(tiemposRes.rows[0]?.duracion_prom_min || 0),
        packingPorLinea: packingLineaRes.rows,
        flujosSync: syncRes.rows,
        alertas: alertasRes.rows,
      },
    })
  } catch (error) {
    console.error('Error loading operations dashboard:', error)
    res.status(500).json({
      ok: false,
      message: 'No se pudo cargar el tablero de operaciones.',
    })
  }
})

app.get('/api/dashboard/finanzas', async (_req, res) => {
  try {
    const [ventasRes, presupMesRes, costosAreaRes, ceCosAlertRes, alertasRes] =
      await Promise.all([
        query(
          `SELECT COALESCE(SUM(monto_total), 0)::numeric AS total_ventas_usd
           FROM ordenes_despacho
           WHERE estado <> 'ANULADO'`,
        ),
        query(
          `SELECT
             mes,
             SUM(monto_presupuestado)::numeric AS presupuestado,
             SUM(monto_ejecutado)::numeric AS ejecutado
           FROM presupuestos_mensuales
           GROUP BY mes
           ORDER BY mes`,
        ),
        query(
          `SELECT
             COALESCE(a.nombre, cc.nombre) AS concepto,
             SUM(pm.monto_presupuestado)::numeric AS presupuestado_pen,
             SUM(pm.monto_ejecutado)::numeric AS monto_pen
           FROM presupuestos_mensuales pm
           JOIN centros_costo cc ON cc.id_ceco = pm.id_ceco
           LEFT JOIN areas a ON a.id_area = cc.id_area
           GROUP BY COALESCE(a.nombre, cc.nombre)
           ORDER BY monto_pen DESC`,
        ),
        query(
          `SELECT
             cc.nombre AS ceco,
             SUM(pm.monto_presupuestado)::numeric AS presupuestado,
             SUM(pm.monto_ejecutado)::numeric AS ejecutado
           FROM presupuestos_mensuales pm
           JOIN centros_costo cc ON cc.id_ceco = pm.id_ceco
           GROUP BY cc.id_ceco, cc.nombre
           HAVING SUM(pm.monto_ejecutado) > SUM(pm.monto_presupuestado) * 0.9`,
        ),
        query(
          `SELECT al.id_alerta, al.tipo, al.severidad, al.titulo, al.fecha_generacion
           FROM alertas_bi al
           LEFT JOIN areas ar ON ar.id_area = al.id_area
           WHERE ar.nombre = 'Finanzas' OR al.id_area IS NULL
           ORDER BY al.fecha_generacion DESC
           LIMIT 4`,
        ),
      ])

    const totalPresupuestadoPen = presupMesRes.rows.reduce(
      (sum, r) => sum + Number(r.presupuestado || 0),
      0,
    )
    const totalEjecutadoPen = presupMesRes.rows.reduce(
      (sum, r) => sum + Number(r.ejecutado || 0),
      0,
    )
    const ventasUsd = Number(ventasRes.rows[0]?.total_ventas_usd || 0)
    const ingresosPen = Math.round(ventasUsd * 3.75)
    const resultadoOperativoPen = ingresosPen - totalEjecutadoPen
    const desviacionPen = totalEjecutadoPen - totalPresupuestadoPen
    const desviacionPct =
      totalPresupuestadoPen > 0
        ? Math.round((desviacionPen / totalPresupuestadoPen) * 1000) / 10
        : 0
    const cumplimientoPct =
      totalPresupuestadoPen > 0
        ? Math.round((totalEjecutadoPen / totalPresupuestadoPen) * 1000) / 10
        : 0

    res.json({
      ok: true,
      data: {
        ingresosPen,
        ventasUsd,
        totalPresupuestadoPen,
        totalCostosPen: totalEjecutadoPen,
        resultadoOperativoPen,
        cumplimientoPct,
        desviacionPen,
        desviacionPct,
        presupuestoPorMes: presupMesRes.rows,
        costosPorConcepto: costosAreaRes.rows,
        cecosEnAlerta: ceCosAlertRes.rows,
        alertas: alertasRes.rows,
      },
    })
  } catch (error) {
    console.error('Error loading finance dashboard:', error)
    res.status(500).json({
      ok: false,
      message: 'No se pudo cargar el tablero de finanzas.',
    })
  }
})

app.get('/api/dashboard/gestion-humana', async (_req, res) => {
  try {
    const [
      trabRes,
      distSedeRes,
      asistRes,
      rendRes,
      costoGhRes,
      convRes,
      alertasRes,
    ] = await Promise.all([
      query(
        `SELECT
           COUNT(*)::int AS total,
           COUNT(*) FILTER (WHERE estado_trabajador = 'ACTIVO')::int AS activos,
           COUNT(*) FILTER (WHERE estado_trabajador <> 'ACTIVO')::int AS inactivos
         FROM trabajadores`,
      ),
      query(
        `SELECT
           COALESCE(d.nombre, 'Sin distrito') AS sede,
           COUNT(t.id_trabajador)::int AS cantidad
         FROM trabajadores t
         LEFT JOIN distritos d ON d.id_distrito = t.id_distrito
         GROUP BY d.nombre
         ORDER BY cantidad DESC
         LIMIT 5`,
      ),
      query(
        `SELECT
           COUNT(*)::int AS total_marcaciones,
           COUNT(*) FILTER (WHERE estado_asistencia = 'ASISTIO')::int AS asistieron,
           COUNT(*) FILTER (WHERE estado_asistencia = 'NO_ASISTIO')::int AS inasistencias,
           COUNT(*) FILTER (WHERE estado_asistencia = 'JUSTIFICADO')::int AS justificados
         FROM registros_asistencia`,
      ),
      query(
        `SELECT
           COUNT(*) FILTER (WHERE clasificacion_hpw = 'HPW')::int AS hpw,
           COUNT(*) FILTER (WHERE clasificacion_hpw = 'NO_HPW')::int AS no_hpw,
           ROUND(AVG(puntaje_productividad)::numeric, 1) AS avg_prod
         FROM rendimiento_trabajadores`,
      ),
      query(
        `SELECT COALESCE(SUM(pm.monto_ejecutado), 0)::numeric AS costo_personal_pen
         FROM presupuestos_mensuales pm
         JOIN centros_costo cc ON cc.id_ceco = pm.id_ceco
         JOIN areas a ON a.id_area = cc.id_area
         WHERE a.nombre = 'Gestion Humana'`,
      ),
      query(
        `SELECT estado, COUNT(*)::int AS cantidad
         FROM convocatorias
         GROUP BY estado`,
      ),
      query(
        `SELECT al.id_alerta, al.tipo, al.severidad, al.titulo, al.fecha_generacion
         FROM alertas_bi al
         LEFT JOIN areas ar ON ar.id_area = al.id_area
         WHERE ar.nombre = 'Gestion Humana' OR al.id_area IS NULL
         ORDER BY al.fecha_generacion DESC
         LIMIT 4`,
      ),
    ])

    const totalAsist = asistRes.rows[0]?.total_marcaciones || 0
    const asistieron = asistRes.rows[0]?.asistieron || 0
    const tasaAsistencia =
      totalAsist > 0 ? Math.round((asistieron / totalAsist) * 1000) / 10 : 0

    const totalTrab = trabRes.rows[0]?.total ?? 0
    const inactivos = trabRes.rows[0]?.inactivos ?? 0
    const rotacionPct =
      totalTrab > 0 ? Math.round((inactivos / totalTrab) * 1000) / 10 : 0

    const totalConvocatorias = convRes.rows.reduce(
      (sum, c) => sum + Number(c.cantidad || 0),
      0,
    )

    res.json({
      ok: true,
      data: {
        trabajadores: trabRes.rows[0],
        distribucionSede: distSedeRes.rows,
        asistencia: {
          colaboradores: trabRes.rows[0]?.activos ?? 0,
          tasa_asistencia: tasaAsistencia,
          total_marcaciones: totalAsist,
          asistieron,
          inasistencias: asistRes.rows[0]?.inasistencias ?? 0,
          justificados: asistRes.rows[0]?.justificados ?? 0,
        },
        rotacionPct,
        costoPersonalPen: Number(costoGhRes.rows[0]?.costo_personal_pen || 0),
        rendimiento: rendRes.rows[0],
        convocatorias: convRes.rows,
        totalConvocatorias,
        alertas: alertasRes.rows,
      },
    })
  } catch (error) {
    console.error('Error loading HR dashboard:', error)
    res.status(500).json({
      ok: false,
      message: 'No se pudo cargar el tablero de gestión humana.',
    })
  }
})

app.get('/api/areas/campo', async (_req, res) => {
  try {
    const [
      fundosRes,
      lotesRes,
      cosechaTotRes,
      cultivoRes,
      cosechasDetRes,
      campanasRes,
      syncRes,
      alertasRes,
    ] = await Promise.all([
      query(
        'SELECT COALESCE(SUM(hectareas_totales), 0)::numeric AS hectareas_disponibles FROM fundos WHERE activo = TRUE',
      ),
      query(
        `SELECT
           l.id_lote,
           l.codigo_lote,
           f.nombre AS fundo,
           COALESCE(d.nombre, 'Olmos') AS distrito,
           l.cultivo,
           l.variedad,
           l.area_ha,
           l.estado,
           COALESCE(SUM(c.toneladas_cosechadas), 0)::numeric AS toneladas_cosechadas,
           COALESCE(SUM(c.kg_cosechados), 0)::numeric AS kg_cosechados,
           COALESCE(SUM(c.jabas_recolectadas), 0)::int AS jabas
         FROM lotes_campo l
         JOIN fundos f ON f.id_fundo = l.id_fundo
         LEFT JOIN distritos d ON d.id_distrito = f.id_distrito
         LEFT JOIN cosechas_diarias c ON c.id_lote = l.id_lote
         GROUP BY l.id_lote, l.codigo_lote, f.nombre, d.nombre, l.cultivo, l.variedad, l.area_ha, l.estado
         ORDER BY l.id_lote`,
      ),
      query(
        `SELECT
           COALESCE(SUM(kg_cosechados), 0)::numeric AS total_kg,
           COALESCE(SUM(toneladas_cosechadas), 0)::numeric AS total_toneladas,
           COALESCE(SUM(jabas_recolectadas), 0)::int AS total_jabas
         FROM cosechas_diarias`,
      ),
      query(
        `SELECT
           l.cultivo,
           COALESCE(SUM(c.toneladas_cosechadas), 0)::numeric AS toneladas,
           COALESCE(SUM(l.area_ha), 0)::numeric AS hectareas
         FROM lotes_campo l
         LEFT JOIN cosechas_diarias c ON c.id_lote = l.id_lote
         GROUP BY l.cultivo
         ORDER BY toneladas DESC`,
      ),
      query(
        `SELECT
           c.id_cosecha,
           c.fecha_cosecha,
           c.turno,
           l.codigo_lote,
           f.nombre AS fundo,
           l.cultivo,
           c.kg_cosechados,
           c.toneladas_cosechadas,
           c.jabas_recolectadas
         FROM cosechas_diarias c
         JOIN lotes_campo l ON l.id_lote = c.id_lote
         JOIN fundos f ON f.id_fundo = l.id_fundo
         ORDER BY c.fecha_cosecha DESC, c.id_cosecha DESC
         LIMIT 20`,
      ),
      query(
        'SELECT id_periodo, nombre, fecha_inicio, fecha_fin, campana FROM periodos_rendimiento ORDER BY fecha_inicio DESC',
      ),
      query(
        "SELECT id_flujo, flujo, ultima_ejecucion, estado_ultima_ejecucion FROM vw_estado_sincronizacion WHERE area_origen = 'Campo'",
      ),
      query(
        `SELECT al.id_alerta, al.tipo, al.severidad, al.titulo, al.estado, al.fecha_generacion
         FROM alertas_bi al
         JOIN areas ar ON ar.id_area = al.id_area
         WHERE ar.nombre = 'Campo'
         ORDER BY al.fecha_generacion DESC`,
      ),
    ])

    const totalHaSembradas = lotesRes.rows.reduce(
      (sum, l) => sum + Number(l.area_ha || 0),
      0,
    )
    const hectareasDisponibles = Number(
      fundosRes.rows[0]?.hectareas_disponibles || 0,
    )
    const totalTon = Number(cosechaTotRes.rows[0]?.total_toneladas || 0)
    const rendimientoTonHa =
      totalHaSembradas > 0
        ? Math.round((totalTon / totalHaSembradas) * 10) / 10
        : 0

    res.json({
      ok: true,
      data: {
        hectareasDisponibles,
        totalHectareas: Math.round(totalHaSembradas * 10) / 10,
        totalToneladas: Math.round(totalTon * 10) / 10,
        totalJabas: cosechaTotRes.rows[0]?.total_jabas ?? 0,
        rendimientoTonHa,
        avanceCosechaPct:
          lotesRes.rows.length > 0
            ? Math.round(
                (lotesRes.rows.filter((l) => l.estado === 'COSECHA').length /
                  lotesRes.rows.length) *
                  1000,
              ) / 10
            : 0,
        totalLotes: lotesRes.rows.length,
        lotes: lotesRes.rows,
        porCultivo: cultivoRes.rows,
        cosechasDetalle: cosechasDetRes.rows,
        campanas: campanasRes.rows,
        flujosSync: syncRes.rows,
        alertas: alertasRes.rows,
        incidencias: alertasRes.rows.filter((a) => a.estado !== 'RESUELTA')
          .length,
      },
    })
  } catch (error) {
    console.error('Error loading Campo area:', error)
    res.status(500).json({
      ok: false,
      message: 'No se pudo cargar el análisis del área Campo.',
    })
  }
})

app.get('/api/areas/packing', async (_req, res) => {
  try {
    const [
      campoRecRes,
      packingRes,
      totalsRes,
      trazabilidadRes,
      calidadRes,
      syncRes,
      alertasRes,
    ] = await Promise.all([
      query(
        'SELECT COALESCE(SUM(toneladas_cosechadas), 0)::numeric AS recibido_campo_tn FROM cosechas_diarias',
      ),
      query(
        `SELECT
           lp.id_linea,
           lp.codigo,
           lp.nombre AS linea,
           lp.capacidad_ton_hora,
           lp.activa,
           COALESCE(SUM(pp.toneladas_ingresadas), 0)::numeric AS toneladas_ingresadas,
           COALESCE(SUM(pp.toneladas_exportables), 0)::numeric AS toneladas_exportables,
           COALESCE(SUM(pp.toneladas_descarte), 0)::numeric AS toneladas_descarte,
           COALESCE(SUM(pp.cajas_producidas), 0)::int AS cajas
         FROM lineas_packing lp
         LEFT JOIN produccion_packing pp ON pp.id_linea = lp.id_linea
         GROUP BY lp.id_linea, lp.codigo, lp.nombre, lp.capacidad_ton_hora, lp.activa
         ORDER BY lp.id_linea`,
      ),
      query(
        `SELECT
           COALESCE(SUM(kg_ingresados), 0)::numeric AS kg_ingresados,
           COALESCE(SUM(kg_exportables), 0)::numeric AS kg_exportables,
           COALESCE(SUM(kg_descarte), 0)::numeric AS kg_descarte,
           COALESCE(SUM(cajas_producidas), 0)::int AS total_cajas
         FROM produccion_packing`,
      ),
      query(
        `SELECT
           pp.id_produccion_packing,
           pp.fecha_proceso,
           pp.turno,
           lp.nombre AS linea,
           COALESCE(lc.codigo_lote, 'Sin lote') AS codigo_lote,
           COALESCE(lc.cultivo, 'Varios') AS cultivo,
           COALESCE(pp.calibre, 'Estándar') AS calibre,
           pp.toneladas_ingresadas,
           pp.toneladas_exportables,
           pp.toneladas_descarte,
           pp.cajas_producidas
         FROM produccion_packing pp
         JOIN lineas_packing lp ON lp.id_linea = pp.id_linea
         LEFT JOIN lotes_campo lc ON lc.id_lote = pp.id_lote
         ORDER BY pp.fecha_proceso DESC, pp.id_produccion_packing DESC
         LIMIT 20`,
      ),
      query(
        `SELECT ROUND(AVG((r.datos->>'porcentaje_calidad')::numeric), 1) AS calidad_prom
         FROM registros_dw r
         JOIN conjuntos_datos_dw c ON c.id_conjunto = r.id_conjunto
         WHERE c.nombre = 'dw_calidad_empaque'`,
      ),
      query(
        "SELECT id_flujo, flujo, ultima_ejecucion, estado_ultima_ejecucion FROM vw_estado_sincronizacion WHERE area_origen = 'Packing'",
      ),
      query(
        `SELECT al.id_alerta, al.tipo, al.severidad, al.titulo, al.estado, al.fecha_generacion
         FROM alertas_bi al
         JOIN areas ar ON ar.id_area = al.id_area
         WHERE ar.nombre = 'Packing'
         ORDER BY al.fecha_generacion DESC`,
      ),
    ])

    const ing = Number(totalsRes.rows[0]?.kg_ingresados || 0)
    const exp = Number(totalsRes.rows[0]?.kg_exportables || 0)
    const desc = Number(totalsRes.rows[0]?.kg_descarte || 0)
    const eficienciaPct = ing > 0 ? Math.round((exp / ing) * 1000) / 10 : 0
    const mermaPct = ing > 0 ? Math.round((desc / ing) * 1000) / 10 : 0

    res.json({
      ok: true,
      data: {
        recibidoCampoTn:
          Math.round(Number(campoRecRes.rows[0]?.recibido_campo_tn || 0) * 10) /
          10,
        toneladasProcesadas: Math.round((ing / 1000) * 10) / 10,
        toneladasExportables: Math.round((exp / 1000) * 10) / 10,
        toneladasDescarte: Math.round((desc / 1000) * 10) / 10,
        totalCajas: totalsRes.rows[0]?.total_cajas ?? 0,
        eficienciaPct,
        mermaPct,
        calidadPromedio: Number(calidadRes.rows[0]?.calidad_prom || 0),
        porLinea: packingRes.rows,
        trazabilidad: trazabilidadRes.rows,
        flujosSync: syncRes.rows,
        alertas: alertasRes.rows,
      },
    })
  } catch (error) {
    console.error('Error loading Packing area:', error)
    res.status(500).json({
      ok: false,
      message: 'No se pudo cargar el análisis del área Packing.',
    })
  }
})

app.get('/api/areas/gestion-humana', async (_req, res) => {
  try {
    const [
      trabRes,
      distRes,
      asistRes,
      rendRes,
      convRes,
      costoRes,
      calidadRes,
      syncRes,
      alertasRes,
    ] = await Promise.all([
      query(
        `SELECT
           COUNT(*)::int AS total,
           COUNT(*) FILTER (WHERE estado_trabajador = 'ACTIVO')::int AS activos,
           COUNT(*) FILTER (WHERE estado_trabajador <> 'ACTIVO')::int AS inactivos
         FROM trabajadores`,
      ),
      query(
        `SELECT
           COALESCE(d.nombre, 'Sin distrito') AS sede,
           COUNT(t.id_trabajador)::int AS cantidad
         FROM trabajadores t
         LEFT JOIN distritos d ON d.id_distrito = t.id_distrito
         GROUP BY d.nombre
         ORDER BY cantidad DESC`,
      ),
      query(
        `SELECT
           COUNT(*)::int AS total,
           COUNT(*) FILTER (WHERE estado_asistencia = 'ASISTIO')::int AS asistio,
           COUNT(*) FILTER (WHERE estado_asistencia = 'NO_ASISTIO')::int AS inasistencia,
           COUNT(*) FILTER (WHERE estado_asistencia = 'JUSTIFICADO')::int AS justificado
         FROM registros_asistencia`,
      ),
      query(
        `SELECT
           COUNT(*) FILTER (WHERE clasificacion_hpw = 'HPW')::int AS hpw,
           COUNT(*) FILTER (WHERE clasificacion_hpw = 'NO_HPW')::int AS no_hpw,
           ROUND(AVG(puntaje_productividad)::numeric, 1) AS avg_prod,
           ROUND(AVG(porcentaje_asistencia)::numeric, 1) AS avg_asist,
           ROUND(AVG(puntaje_calidad)::numeric, 1) AS avg_calidad,
           ROUND(AVG(dias_trabajados)::numeric, 1) AS avg_dias
         FROM rendimiento_trabajadores`,
      ),
      query(
        `SELECT id_convocatoria, titulo, campana, fecha_trabajo, turno, trabajadores_requeridos, estado
         FROM convocatorias
         ORDER BY fecha_trabajo DESC
         LIMIT 10`,
      ),
      query(
        `SELECT COALESCE(SUM(pm.monto_ejecutado), 0)::numeric AS costo_pen
         FROM presupuestos_mensuales pm
         JOIN centros_costo cc ON cc.id_ceco = pm.id_ceco
         JOIN areas a ON a.id_area = cc.id_area
         WHERE a.nombre = 'Gestion Humana'`,
      ),
      query(
        `SELECT
           COALESCE(SUM(registros_evaluados), 0)::int AS evaluados,
           COALESCE(SUM(registros_correctos), 0)::int AS correctos,
           COALESCE(SUM(registros_observados), 0)::int AS observados
         FROM resultados_calidad`,
      ),
      query(
        "SELECT id_flujo, flujo, ultima_ejecucion, estado_ultima_ejecucion FROM vw_estado_sincronizacion WHERE area_origen = 'Gestion Humana'",
      ),
      query(
        `SELECT al.id_alerta, al.tipo, al.severidad, al.titulo, al.estado, al.fecha_generacion
         FROM alertas_bi al
         JOIN areas ar ON ar.id_area = al.id_area
         WHERE ar.nombre = 'Gestion Humana'
         ORDER BY al.fecha_generacion DESC`,
      ),
    ])

    const total = trabRes.rows[0]?.total ?? 0
    const inactivos = trabRes.rows[0]?.inactivos ?? 0
    const rotacionPct =
      total > 0 ? Math.round((inactivos / total) * 1000) / 10 : 0

    res.json({
      ok: true,
      data: {
        trabajadores: trabRes.rows[0],
        rotacionPct,
        distribucionSede: distRes.rows,
        asistencia: asistRes.rows[0],
        rendimiento: rendRes.rows[0],
        convocatorias: convRes.rows,
        costoPersonalPen: Number(costoRes.rows[0]?.costo_pen || 0),
        calidadDatos: calidadRes.rows[0],
        flujosSync: syncRes.rows,
        alertas: alertasRes.rows,
      },
    })
  } catch (error) {
    console.error('Error loading Gestion Humana area:', error)
    res.status(500).json({
      ok: false,
      message: 'No se pudo cargar el análisis de Gestión Humana.',
    })
  }
})

app.get('/api/areas/comercial', async (_req, res) => {
  try {
    const [
      porProductoRes,
      porClienteRes,
      porMercadoRes,
      ordenesRes,
      syncRes,
      alertasRes,
    ] = await Promise.all([
      query(
        `SELECT
           dd.producto,
           COALESCE(SUM(dd.toneladas_despachadas), 0)::numeric AS toneladas,
           COALESCE(SUM(dd.cajas), 0)::int AS cajas,
           COALESCE(SUM(dd.subtotal), 0)::numeric AS importe_usd,
           ROUND(COALESCE(AVG(dd.precio_unitario), 0), 2) AS precio_prom
         FROM detalle_despachos dd
         JOIN ordenes_despacho od ON od.id_despacho = dd.id_despacho
         WHERE od.estado <> 'ANULADO'
         GROUP BY dd.producto
         ORDER BY importe_usd DESC`,
      ),
      query(
        `SELECT
           COALESCE(c.nombre_comercial, c.razon_social) AS cliente,
           c.tipo_cliente,
           c.pais,
           COUNT(DISTINCT od.id_despacho)::int AS ordenes,
           COALESCE(SUM(dd.toneladas_despachadas), 0)::numeric AS toneladas,
           COALESCE(SUM(od.monto_total), 0)::numeric AS importe_usd
         FROM clientes c
         JOIN ordenes_despacho od ON od.id_cliente = c.id_cliente
         LEFT JOIN detalle_despachos dd ON dd.id_despacho = od.id_despacho
         WHERE od.estado <> 'ANULADO'
         GROUP BY c.id_cliente, c.nombre_comercial, c.razon_social, c.tipo_cliente, c.pais
         ORDER BY importe_usd DESC`,
      ),
      query(
        `SELECT
           c.pais AS destino,
           COUNT(od.id_despacho)::int AS ordenes,
           COALESCE(SUM(od.monto_total), 0)::numeric AS importe_usd
         FROM ordenes_despacho od
         JOIN clientes c ON c.id_cliente = od.id_cliente
         WHERE od.estado <> 'ANULADO'
         GROUP BY c.pais
         ORDER BY importe_usd DESC`,
      ),
      query(
        `SELECT
           od.id_despacho,
           od.numero_guia_o_orden,
           COALESCE(c.nombre_comercial, c.razon_social) AS cliente,
           od.fecha_despacho,
           od.puerto_o_destino,
           od.moneda,
           od.monto_total,
           od.estado
         FROM ordenes_despacho od
         JOIN clientes c ON c.id_cliente = od.id_cliente
         ORDER BY od.fecha_despacho DESC
         LIMIT 15`,
      ),
      query(
        "SELECT id_flujo, flujo, ultima_ejecucion, estado_ultima_ejecucion FROM vw_estado_sincronizacion WHERE area_origen = 'Comercial'",
      ),
      query(
        `SELECT al.id_alerta, al.tipo, al.severidad, al.titulo, al.estado, al.fecha_generacion
         FROM alertas_bi al
         JOIN areas ar ON ar.id_area = al.id_area
         WHERE ar.nombre = 'Comercial'
         ORDER BY al.fecha_generacion DESC`,
      ),
    ])

    const totalVentasUsd = porMercadoRes.rows.reduce(
      (sum, m) => sum + Number(m.importe_usd || 0),
      0,
    )

    res.json({
      ok: true,
      data: {
        totalVentasUsd,
        porProducto: porProductoRes.rows,
        porCliente: porClienteRes.rows,
        porMercado: porMercadoRes.rows,
        ordenes: ordenesRes.rows,
        flujosSync: syncRes.rows,
        alertas: alertasRes.rows,
      },
    })
  } catch (error) {
    console.error('Error loading Comercial area:', error)
    res.status(500).json({
      ok: false,
      message: 'No se pudo cargar el análisis de Comercial.',
    })
  }
})

app.get('/api/areas/finanzas', async (_req, res) => {
  try {
    const [
      porAreaRes,
      porMesRes,
      ventasRes,
      campoRes,
      packingRes,
      syncRes,
      alertasRes,
    ] = await Promise.all([
      query(
        `SELECT
           cc.codigo,
           cc.nombre AS ceco,
           COALESCE(a.nombre, 'Corporativo') AS area,
           SUM(pm.monto_presupuestado)::numeric AS presupuestado,
           SUM(pm.monto_ejecutado)::numeric AS ejecutado
         FROM centros_costo cc
         JOIN presupuestos_mensuales pm ON pm.id_ceco = cc.id_ceco
         LEFT JOIN areas a ON a.id_area = cc.id_area
         GROUP BY cc.id_ceco, cc.codigo, cc.nombre, a.nombre
         ORDER BY ejecutado DESC`,
      ),
      query(
        `SELECT
           mes,
           SUM(monto_presupuestado)::numeric AS presupuestado,
           SUM(monto_ejecutado)::numeric AS ejecutado
         FROM presupuestos_mensuales
         GROUP BY mes
         ORDER BY mes`,
      ),
      query(
        "SELECT COALESCE(SUM(monto_total), 0)::numeric AS ventas_usd FROM ordenes_despacho WHERE estado <> 'ANULADO'",
      ),
      query(
        'SELECT COALESCE(SUM(toneladas_cosechadas), 0)::numeric AS campo_tn FROM cosechas_diarias',
      ),
      query(
        'SELECT COALESCE(SUM(toneladas_exportables), 0)::numeric AS packing_tn FROM produccion_packing',
      ),
      query(
        "SELECT id_flujo, flujo, ultima_ejecucion, estado_ultima_ejecucion FROM vw_estado_sincronizacion WHERE area_origen = 'Finanzas'",
      ),
      query(
        `SELECT al.id_alerta, al.tipo, al.severidad, al.titulo, al.estado, al.fecha_generacion
         FROM alertas_bi al
         JOIN areas ar ON ar.id_area = al.id_area
         WHERE ar.nombre = 'Finanzas'
         ORDER BY al.fecha_generacion DESC`,
      ),
    ])

    const totalPresup = porAreaRes.rows.reduce(
      (s, r) => s + Number(r.presupuestado || 0),
      0,
    )
    const totalEjec = porAreaRes.rows.reduce(
      (s, r) => s + Number(r.ejecutado || 0),
      0,
    )
    const ventasUsd = Number(ventasRes.rows[0]?.ventas_usd || 0)
    const ingresosPen = Math.round(ventasUsd * 3.75)

    res.json({
      ok: true,
      data: {
        ingresosPen,
        ventasUsd,
        totalPresupuestado: totalPresup,
        totalEjecutado: totalEjec,
        saldoDisponible: totalPresup - totalEjec,
        desviacion: totalEjec - totalPresup,
        cumplimientoPct:
          totalPresup > 0
            ? Math.round((totalEjec / totalPresup) * 1000) / 10
            : 0,
        porArea: porAreaRes.rows,
        porMes: porMesRes.rows,
        conciliacion: {
          campoTn: Math.round(Number(campoRes.rows[0]?.campo_tn || 0) * 10) / 10,
          packingTn:
            Math.round(Number(packingRes.rows[0]?.packing_tn || 0) * 10) / 10,
          ventasUsd,
        },
        flujosSync: syncRes.rows,
        alertas: alertasRes.rows,
      },
    })
  } catch (error) {
    console.error('Error loading Finanzas area:', error)
    res.status(500).json({
      ok: false,
      message: 'No se pudo cargar el análisis de Finanzas.',
    })
  }
})

app.get('/api/config/usuarios', async (_req, res) => {
  try {
    const result = await query(
      `
      SELECT
        u.id_usuario,
        u.nombre_usuario,
        u.nombres,
        u.apellidos,
        u.correo,
        u.esta_activo,
        u.ultimo_acceso,
        COALESCE(
          ARRAY_AGG(r.nombre) FILTER (WHERE r.nombre IS NOT NULL),
          '{}'
        ) AS roles
      FROM usuarios u
      LEFT JOIN usuarios_roles ur ON ur.id_usuario = u.id_usuario
      LEFT JOIN roles r ON r.id_rol = ur.id_rol
      GROUP BY u.id_usuario
      ORDER BY u.id_usuario
      `,
    )

    res.json({
      ok: true,
      data: result.rows.map((u) => ({
        ...u,
        correo: u.correo || u.nombre_usuario,
        estado: u.esta_activo ? 'ACTIVO' : 'INACTIVO',
      })),
    })
  } catch (error) {
    console.error('Error loading users config:', error)
    res.status(500).json({
      ok: false,
      message: 'No se pudo cargar la lista de usuarios.',
    })
  }
})

app.get('/api/jira/tickets', async (_req, res) => {
  try {
    const [ticketsRes, statsRes] = await Promise.all([
      query(
        `SELECT
           jt.id_ticket,
           jt.jira_issue_key,
           jt.estado_ticket,
           jt.estado_sincronizacion,
           jt.fecha_creacion,
           al.titulo,
           al.severidad
         FROM jira_tickets jt
         JOIN alertas_bi al ON al.id_alerta = jt.id_alerta
         ORDER BY jt.fecha_creacion DESC
         LIMIT 10`,
      ),
      query(
        `SELECT
           COUNT(*)::int AS total,
           COUNT(*) FILTER (WHERE COALESCE(estado_ticket, 'Pendiente') IN ('Por hacer', 'Abierto', 'En progreso', 'Pendiente'))::int AS abiertos,
           COUNT(*) FILTER (WHERE estado_ticket IN ('Resuelto', 'Cerrado'))::int AS resueltos
         FROM jira_tickets`,
      ),
    ])

    res.json({
      ok: true,
      data: {
        tickets: ticketsRes.rows,
        stats: statsRes.rows[0],
      },
    })
  } catch (error) {
    console.error('Error loading Jira tickets:', error)
    res.status(500).json({
      ok: false,
      message: 'No se pudieron cargar los tickets de Jira.',
    })
  }
})

const server = app.listen(port, () => {
  console.log(`One-Data BI API escuchando en http://localhost:${port}`)
})

process.on('SIGINT', async () => {
  server.close()
  await pool.end()
  process.exit(0)
})
