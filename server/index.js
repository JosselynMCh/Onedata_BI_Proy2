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

app.get('/api/config/resumen', async (_req, res) => {
  try {
    const [
      dbVerRes,
      lastSyncRes,
      usersCountRes,
      sourcesCountRes,
      alertsCountRes,
      auditCountRes,
    ] = await Promise.all([
      query('SELECT version() AS db_version'),
      query(
        "SELECT MAX(fin) AS ultima_sincronizacion FROM ejecuciones_flujo WHERE estado = 'EXITOSO'",
      ),
      query(
        `SELECT
           COUNT(*)::int AS total,
           COUNT(*) FILTER (WHERE esta_activo)::int AS activos
         FROM usuarios`,
      ),
      query(
        `SELECT
           COUNT(*)::int AS total,
           COUNT(*) FILTER (WHERE estado = 'ACTIVA')::int AS activas
         FROM fuentes_datos`,
      ),
      query(
        "SELECT COUNT(*)::int AS pendientes FROM alertas_bi WHERE estado = 'PENDIENTE'",
      ),
      query('SELECT COUNT(*)::int AS total FROM registros_auditoria'),
    ])

    const rawVersion = dbVerRes.rows[0]?.db_version || 'PostgreSQL'
    const shortVersion = rawVersion.split(',')[0]

    res.json({
      ok: true,
      data: {
        dbVersion: shortVersion,
        entorno: process.env.NODE_ENV === 'production' ? 'Producción' : 'Desarrollo / Producción',
        ultimaActualizacion: lastSyncRes.rows[0]?.ultima_sincronizacion || null,
        usuariosTotal: usersCountRes.rows[0]?.total || 0,
        usuariosActivos: usersCountRes.rows[0]?.activos || 0,
        fuentesTotal: sourcesCountRes.rows[0]?.total || 0,
        fuentesActivas: sourcesCountRes.rows[0]?.activas || 0,
        alertasPendientes: alertsCountRes.rows[0]?.pendientes || 0,
        registrosAuditoria: auditCountRes.rows[0]?.total || 0,
        jiraConfigured: isJiraConfigured(),
        jiraProjectKey: process.env.JIRA_PROJECT_KEY || null,
      },
    })
  } catch (error) {
    console.error('Error loading system config summary:', error)
    res.status(500).json({
      ok: false,
      message: 'No se pudo cargar el resumen del sistema.',
    })
  }
})

app.patch('/api/config/usuarios/:id/estado', async (req, res) => {
  const { id } = req.params
  const { esta_activo } = req.body ?? {}

  if (typeof esta_activo !== 'boolean') {
    return res
      .status(400)
      .json({ ok: false, message: 'Debes indicar esta_activo (boolean).' })
  }

  try {
    const updated = await query(
      `UPDATE usuarios
       SET esta_activo = $1
       WHERE id_usuario = $2
       RETURNING id_usuario, nombre_usuario, nombres, apellidos, correo, esta_activo`,
      [esta_activo, id],
    )
    if (updated.rows.length === 0) {
      return res
        .status(404)
        .json({ ok: false, message: 'Usuario no encontrado.' })
    }

    await query(
      `INSERT INTO registros_auditoria (id_usuario, accion, nombre_entidad, id_entidad, valores_nuevos)
       VALUES ($1, $2, 'usuarios', $3, $4::jsonb)`,
      [
        id,
        esta_activo ? 'ACTIVAR_USUARIO' : 'DESACTIVAR_USUARIO',
        id,
        JSON.stringify({ esta_activo }),
      ],
    )

    return res.json({
      ok: true,
      data: {
        ...updated.rows[0],
        estado: updated.rows[0].esta_activo ? 'ACTIVO' : 'INACTIVO',
      },
    })
  } catch (error) {
    console.error('Error updating user status:', error)
    return res
      .status(500)
      .json({ ok: false, message: 'No se pudo actualizar el usuario.' })
  }
})

app.get('/api/config/fuentes', async (_req, res) => {
  try {
    const result = await query(
      `SELECT
         fd.id_fuente,
         fd.nombre,
         fd.tipo,
         fd.sistema_origen,
         fd.descripcion,
         fd.intervalo_sincronizacion_min,
         fd.ultima_sincronizacion,
         fd.estado,
         a.nombre AS area,
         (SELECT COUNT(*)::int FROM flujos_datos fl WHERE fl.fuente_origen_id = fd.id_fuente) AS flujos_asociados
       FROM fuentes_datos fd
       JOIN areas a ON a.id_area = fd.id_area
       ORDER BY fd.id_fuente`,
    )
    res.json({ ok: true, data: result.rows })
  } catch (error) {
    console.error('Error loading fuentes:', error)
    res.status(500).json({
      ok: false,
      message: 'No se pudieron cargar las fuentes de datos.',
    })
  }
})

app.patch('/api/config/fuentes/:id/estado', async (req, res) => {
  const { id } = req.params
  const { estado } = req.body ?? {}

  if (!['ACTIVA', 'INACTIVA'].includes(estado)) {
    return res
      .status(400)
      .json({ ok: false, message: 'Estado inválido (ACTIVA o INACTIVA).' })
  }

  try {
    const updated = await query(
      `UPDATE fuentes_datos SET estado = $1 WHERE id_fuente = $2 RETURNING *`,
      [estado, id],
    )
    if (updated.rows.length === 0) {
      return res
        .status(404)
        .json({ ok: false, message: 'Fuente no encontrada.' })
    }

    await query(
      `INSERT INTO registros_auditoria (accion, nombre_entidad, id_entidad, valores_nuevos)
       VALUES ($1, 'fuentes_datos', $2, $3::jsonb)`,
      [
        estado === 'ACTIVA' ? 'ACTIVAR_FUENTE' : 'DESACTIVAR_FUENTE',
        id,
        JSON.stringify({ nombre: updated.rows[0].nombre, estado }),
      ],
    )

    return res.json({ ok: true, data: updated.rows[0] })
  } catch (error) {
    console.error('Error updating fuente state:', error)
    return res
      .status(500)
      .json({ ok: false, message: 'No se pudo actualizar la fuente.' })
  }
})

app.post('/api/config/fuentes/:id/sync', async (req, res) => {
  const { id } = req.params
  try {
    const updated = await query(
      `UPDATE fuentes_datos
       SET ultima_sincronizacion = CURRENT_TIMESTAMP, estado = 'ACTIVA'
       WHERE id_fuente = $1
       RETURNING *`,
      [id],
    )
    if (updated.rows.length === 0) {
      return res
        .status(404)
        .json({ ok: false, message: 'Fuente no encontrada.' })
    }

    const flowsRes = await query(
      'SELECT id_flujo FROM flujos_datos WHERE fuente_origen_id = $1',
      [id],
    )
    for (const fl of flowsRes.rows) {
      await query(
        `INSERT INTO ejecuciones_flujo (id_flujo, inicio, fin, estado, registros_leidos, registros_procesados, registros_rechazados)
         VALUES ($1, CURRENT_TIMESTAMP - INTERVAL '2 seconds', CURRENT_TIMESTAMP, 'EXITOSO', 120, 120, 0)`,
        [fl.id_flujo],
      )
    }

    await query(
      `INSERT INTO registros_auditoria (accion, nombre_entidad, id_entidad, valores_nuevos)
       VALUES ('SINCRONIZAR_FUENTE', 'fuentes_datos', $1, $2::jsonb)`,
      [
        id,
        JSON.stringify({
          nombre: updated.rows[0].nombre,
          flujos_ejecutados: flowsRes.rows.length,
        }),
      ],
    )

    return res.json({ ok: true, data: updated.rows[0] })
  } catch (error) {
    console.error('Error syncing fuente:', error)
    return res
      .status(500)
      .json({ ok: false, message: 'Error al sincronizar la fuente.' })
  }
})

app.get('/api/config/notificaciones', async (_req, res) => {
  try {
    const [alertsRes, statsRes] = await Promise.all([
      query(
        `SELECT id_alerta, tipo, severidad, titulo, mensaje, estado, fecha_generacion
         FROM alertas_bi
         ORDER BY fecha_generacion DESC
         LIMIT 20`,
      ),
      query(
        `SELECT
           COUNT(*)::int AS total,
           COUNT(*) FILTER (WHERE estado = 'PENDIENTE')::int AS pendientes,
           COUNT(*) FILTER (WHERE estado = 'RESUELTA')::int AS resueltas,
           COUNT(*) FILTER (WHERE severidad = 'CRITICA' AND estado = 'PENDIENTE')::int AS criticas
         FROM alertas_bi`,
      ),
    ])

    res.json({
      ok: true,
      data: {
        alertas: alertsRes.rows,
        stats: statsRes.rows[0],
      },
    })
  } catch (error) {
    console.error('Error loading notifications config:', error)
    res.status(500).json({
      ok: false,
      message: 'No se pudieron cargar las alertas del sistema.',
    })
  }
})

app.patch('/api/config/notificaciones/:id/resolver', async (req, res) => {
  const { id } = req.params
  try {
    const updated = await query(
      `UPDATE alertas_bi SET estado = 'RESUELTA' WHERE id_alerta = $1 RETURNING *`,
      [id],
    )
    if (updated.rows.length === 0) {
      return res
        .status(404)
        .json({ ok: false, message: 'Alerta no encontrada.' })
    }

    await query(
      `INSERT INTO registros_auditoria (accion, nombre_entidad, id_entidad, valores_nuevos)
       VALUES ('RESOLVER_ALERTA', 'alertas_bi', $1, $2::jsonb)`,
      [id, JSON.stringify({ titulo: updated.rows[0].titulo })],
    )

    return res.json({ ok: true, data: updated.rows[0] })
  } catch (error) {
    console.error('Error resolving alert:', error)
    return res
      .status(500)
      .json({ ok: false, message: 'No se pudo resolver la alerta.' })
  }
})

app.get('/api/config/auditoria', async (req, res) => {
  const { q = '', accion = '' } = req.query ?? {}
  try {
    const conditions = []
    const params = []

    if (q.trim()) {
      params.push(`%${q.trim()}%`)
      const idx = params.length
      conditions.push(
        `(ra.accion ILIKE $${idx} OR ra.nombre_entidad ILIKE $${idx} OR COALESCE(u.nombre_usuario, '') ILIKE $${idx} OR COALESCE(u.nombres, '') ILIKE $${idx})`,
      )
    }

    if (accion.trim()) {
      params.push(accion.trim())
      conditions.push(`ra.accion = $${params.length}`)
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

    const [logsRes, statsRes, actionsRes] = await Promise.all([
      query(
        `SELECT
           ra.id_auditoria,
           ra.id_usuario,
           ra.accion,
           ra.nombre_entidad,
           ra.id_entidad,
           ra.valores_nuevos,
           HOST(ra.direccion_ip) AS direccion_ip,
           ra.fecha_creacion,
           COALESCE(NULLIF(TRIM(CONCAT(u.nombres, ' ', u.apellidos)), ''), u.nombre_usuario, 'Sistema') AS usuario
         FROM registros_auditoria ra
         LEFT JOIN usuarios u ON u.id_usuario = ra.id_usuario
         ${whereClause}
         ORDER BY ra.fecha_creacion DESC
         LIMIT 100`,
        params,
      ),
      query(
        `SELECT
           COUNT(*)::int AS total,
           COUNT(*) FILTER (WHERE fecha_creacion >= CURRENT_DATE)::int AS hoy,
           COUNT(DISTINCT nombre_entidad)::int AS entidades,
           COUNT(DISTINCT id_usuario)::int AS usuarios
         FROM registros_auditoria`,
      ),
      query(
        `SELECT DISTINCT accion FROM registros_auditoria ORDER BY accion`,
      ),
    ])

    res.json({
      ok: true,
      data: {
        registros: logsRes.rows,
        stats: statsRes.rows[0],
        acciones: actionsRes.rows.map((r) => r.accion),
      },
    })
  } catch (error) {
    console.error('Error loading audit logs:', error)
    res.status(500).json({
      ok: false,
      message: 'No se pudo cargar el registro de auditoría.',
    })
  }
})

app.post('/api/config/audit-log', async (req, res) => {
  const { accion = 'ACTUALIZAR_CONFIGURACION', nombre_entidad = 'configuracion', detalle = {} } = req.body ?? {}
  try {
    await query(
      `INSERT INTO registros_auditoria (accion, nombre_entidad, valores_nuevos)
       VALUES ($1, $2, $3::jsonb)`,
      [accion, nombre_entidad, JSON.stringify(detalle)],
    )
    res.status(201).json({ ok: true })
  } catch (error) {
    console.error('Error writing audit log:', error)
    res.status(500).json({ ok: false, message: 'No se pudo registrar en auditoría.' })
  }
})

function isJiraConfigured() {
  return Boolean(
    process.env.JIRA_BASE_URL &&
      process.env.JIRA_EMAIL &&
      process.env.JIRA_API_TOKEN &&
      process.env.JIRA_PROJECT_KEY,
  )
}

async function jiraRequest(path, options = {}) {
  const baseUrl = process.env.JIRA_BASE_URL.replace(/\/+$/, '')
  const auth = Buffer.from(
    `${process.env.JIRA_EMAIL}:${process.env.JIRA_API_TOKEN}`,
  ).toString('base64')

  const res = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      Authorization: `Basic ${auth}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  })

  if (!res.ok) {
    const errText = await res.text()
    throw new Error(`Jira API ${res.status}: ${errText.slice(0, 250)}`)
  }

  return res.status === 204 ? null : res.json()
}

function mapSeverityToJiraPriority(severidad) {
  switch (severidad) {
    case 'CRITICA':
      return 'Highest'
    case 'ALTA':
      return 'High'
    case 'MEDIA':
      return 'Medium'
    default:
      return 'Low'
  }
}

function mapJiraPriorityToSeverity(priorityName) {
  const p = (priorityName || '').toLowerCase()
  if (p.includes('highest') || p.includes('crit')) return 'CRITICA'
  if (p.includes('high') || p.includes('alta')) return 'ALTA'
  if (p.includes('low') || p.includes('baja')) return 'BAJA'
  return 'MEDIA'
}

function isResolvedJiraStatus(statusName) {
  const s = (statusName || '').trim().toLowerCase()
  return ['resuelto', 'cerrado', 'finalizada', 'finalizado', 'done'].includes(s)
}

async function resolveJiraIssueType() {
  if (process.env.JIRA_ISSUE_TYPE) return process.env.JIRA_ISSUE_TYPE
  const proj = await jiraRequest(
    `/rest/api/3/project/${encodeURIComponent(process.env.JIRA_PROJECT_KEY)}`,
  )
  const types = (proj?.issueTypes || []).filter((t) => !t.subtask)
  const preferred = types.find((t) =>
    ['task', 'tarea', 'incident', 'incidente'].includes(
      (t.name || '').toLowerCase(),
    ),
  )
  return preferred?.name || types[0]?.name || 'Task'
}

function findJiraTransition(transitions, desiredStatus) {
  const list = transitions || []
  const wanted = (desiredStatus || '').trim().toLowerCase()

  const exact = list.find(
    (t) =>
      (t.to?.name || '').trim().toLowerCase() === wanted ||
      (t.name || '').trim().toLowerCase() === wanted,
  )
  if (exact) return exact

  const groups = [
    ['tareas por hacer', 'por hacer', 'to do', 'abierto', 'pendiente'],
    ['en curso', 'en progreso', 'in progress'],
    ['finalizada', 'finalizado', 'resuelto', 'cerrado', 'done'],
  ]
  const group = groups.find((g) => g.includes(wanted)) || [wanted]

  return list.find((t) => {
    const toName = (t.to?.name || '').trim().toLowerCase()
    const trName = (t.name || '').trim().toLowerCase()
    return group.some((alias) => toName === alias || trName === alias)
  })
}

async function syncJiraIssuesFromCloud() {
  if (!isJiraConfigured()) return 0

  const projectKey = process.env.JIRA_PROJECT_KEY
  const baseUrl = process.env.JIRA_BASE_URL.replace(/\/+$/, '')
  const search = await jiraRequest(
    `/rest/api/3/search/jql?jql=${encodeURIComponent(`project = "${projectKey}" ORDER BY created DESC`)}&fields=summary,status,priority,created,updated&maxResults=50`,
  )

  let synced = 0
  for (const issue of search?.issues || []) {
    const summary = issue.fields?.summary || issue.key
    const statusName = issue.fields?.status?.name || 'Tareas por hacer'
    const severity = mapJiraPriorityToSeverity(issue.fields?.priority?.name)
    const urlTicket = `${baseUrl}/browse/${issue.key}`
    const alertState = isResolvedJiraStatus(statusName) ? 'RESUELTA' : 'PENDIENTE'
    const createdAt = issue.fields?.created
      ? new Date(issue.fields.created)
      : new Date()

    const byKey = await query(
      'SELECT id_ticket, id_alerta FROM jira_tickets WHERE jira_issue_key = $1',
      [issue.key],
    )

    if (byKey.rows.length > 0) {
      const row = byKey.rows[0]
      await query(
        `UPDATE jira_tickets
         SET proyecto_jira = $1, url_ticket = $2, estado_ticket = $3,
             estado_sincronizacion = 'SINCRONIZADO',
             ultima_sincronizacion = CURRENT_TIMESTAMP, detalle_error = NULL
         WHERE id_ticket = $4`,
        [projectKey, urlTicket, statusName, row.id_ticket],
      )
      await query(
        'UPDATE alertas_bi SET titulo = $1, severidad = $2, estado = $3 WHERE id_alerta = $4',
        [summary, severity, alertState, row.id_alerta],
      )
      synced++
      continue
    }

    const byTitle = await query(
      `SELECT jt.id_ticket, jt.id_alerta
       FROM jira_tickets jt
       JOIN alertas_bi al ON al.id_alerta = jt.id_alerta
       WHERE jt.jira_issue_key IS NULL AND LOWER(al.titulo) = LOWER($1)
       LIMIT 1`,
      [summary],
    )

    if (byTitle.rows.length > 0) {
      const row = byTitle.rows[0]
      await query(
        `UPDATE jira_tickets
         SET jira_issue_key = $1, jira_issue_id = $2, proyecto_jira = $3,
             url_ticket = $4, estado_ticket = $5,
             estado_sincronizacion = 'SINCRONIZADO',
             ultima_sincronizacion = CURRENT_TIMESTAMP, detalle_error = NULL
         WHERE id_ticket = $6`,
        [issue.key, issue.id, projectKey, urlTicket, statusName, row.id_ticket],
      )
      await query(
        'UPDATE alertas_bi SET severidad = $1, estado = $2 WHERE id_alerta = $3',
        [severity, alertState, row.id_alerta],
      )
      synced++
      continue
    }

    const newAlert = await query(
      `INSERT INTO alertas_bi (tipo, severidad, titulo, mensaje, estado, fecha_generacion)
       VALUES ('INTEGRACION', $1, $2, $3, $4, $5)
       RETURNING id_alerta`,
      [severity, summary, `Sincronizado desde Jira (${issue.key})`, alertState, createdAt],
    )
    await query(
      `INSERT INTO jira_tickets (
         id_alerta, jira_issue_key, jira_issue_id, proyecto_jira,
         url_ticket, estado_sincronizacion, estado_ticket,
         fecha_creacion, ultima_sincronizacion
       )
       VALUES ($1, $2, $3, $4, $5, 'SINCRONIZADO', $6, $7, CURRENT_TIMESTAMP)`,
      [
        newAlert.rows[0].id_alerta,
        issue.key,
        issue.id,
        projectKey,
        urlTicket,
        statusName,
        createdAt,
      ],
    )
    synced++
  }

  return synced
}

app.get('/api/jira/tickets', async (_req, res) => {
  try {
    if (isJiraConfigured()) {
      try {
        await syncJiraIssuesFromCloud()
      } catch (syncErr) {
        console.error('Jira auto-sync warning:', syncErr.message)
      }
    }

    const projectFilter = isJiraConfigured() ? process.env.JIRA_PROJECT_KEY : null
    const whereClause = projectFilter ? 'WHERE jt.proyecto_jira = $1' : ''
    const params = projectFilter ? [projectFilter] : []

    const [ticketsRes, statsRes, alertasSinTicketRes] = await Promise.all([
      query(
        `SELECT
           jt.id_ticket,
           jt.id_alerta,
           jt.jira_issue_key,
           jt.proyecto_jira,
           jt.url_ticket,
           jt.estado_ticket,
           jt.estado_sincronizacion,
           jt.detalle_error,
           jt.fecha_creacion,
           jt.ultima_sincronizacion,
           al.titulo,
           al.mensaje,
           al.severidad
         FROM jira_tickets jt
         JOIN alertas_bi al ON al.id_alerta = jt.id_alerta
         ${whereClause}
         ORDER BY jt.fecha_creacion DESC
         LIMIT 25`,
        params,
      ),
      query(
        `SELECT
           COUNT(*)::int AS total,
           COUNT(*) FILTER (WHERE LOWER(COALESCE(estado_ticket, 'Pendiente')) NOT IN ('resuelto', 'cerrado', 'finalizada', 'finalizado', 'done'))::int AS abiertos,
           COUNT(*) FILTER (WHERE LOWER(COALESCE(estado_ticket, '')) IN ('resuelto', 'cerrado', 'finalizada', 'finalizado', 'done'))::int AS resueltos
         FROM jira_tickets jt
         ${whereClause}`,
        params,
      ),
      query(
        `SELECT al.id_alerta, al.titulo, al.severidad
         FROM alertas_bi al
         LEFT JOIN jira_tickets jt ON jt.id_alerta = al.id_alerta
         WHERE jt.id_ticket IS NULL
         ORDER BY al.fecha_generacion DESC`,
      ),
    ])

    res.json({
      ok: true,
      data: {
        jiraConfigured: isJiraConfigured(),
        projectKey: process.env.JIRA_PROJECT_KEY || null,
        tickets: ticketsRes.rows,
        stats: statsRes.rows[0],
        alertasSinTicket: alertasSinTicketRes.rows,
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

app.post('/api/jira/tickets', async (req, res) => {
  const { id_alerta, titulo, mensaje, severidad = 'MEDIA' } = req.body ?? {}

  if (!id_alerta && !titulo?.trim()) {
    return res.status(400).json({
      ok: false,
      message: 'Debes indicar un título o seleccionar una alerta.',
    })
  }

  try {
    let alertaId = id_alerta
    let alertTitle = titulo?.trim()
    let alertMsg = mensaje?.trim() || alertTitle
    let alertSev = severidad

    if (!alertaId) {
      const newAlert = await query(
        `INSERT INTO alertas_bi (tipo, severidad, titulo, mensaje, estado)
         VALUES ('INTEGRACION', $1, $2, $3, 'PENDIENTE')
         RETURNING id_alerta, titulo, mensaje, severidad`,
        [alertSev, alertTitle, alertMsg],
      )
      alertaId = newAlert.rows[0].id_alerta
    } else {
      const existing = await query(
        'SELECT id_alerta, titulo, mensaje, severidad FROM alertas_bi WHERE id_alerta = $1',
        [alertaId],
      )
      if (existing.rows.length === 0) {
        return res
          .status(404)
          .json({ ok: false, message: 'Alerta no encontrada.' })
      }
      alertTitle = existing.rows[0].titulo
      alertMsg = existing.rows[0].mensaje
      alertSev = existing.rows[0].severidad
    }

    let jiraKey = null
    let jiraId = null
    let urlTicket = null
    let estadoSync = 'PENDIENTE'
    let estadoTicket = 'Abierto'
    let detalleError = null

    if (isJiraConfigured()) {
      try {
        const issueTypeName = await resolveJiraIssueType()

        const created = await jiraRequest('/rest/api/3/issue', {
          method: 'POST',
          body: JSON.stringify({
            fields: {
              project: { key: process.env.JIRA_PROJECT_KEY },
              summary: alertTitle,
              description: {
                type: 'doc',
                version: 1,
                content: [
                  {
                    type: 'paragraph',
                    content: [{ type: 'text', text: alertMsg }],
                  },
                ],
              },
              issuetype: { name: issueTypeName },
              priority: { name: mapSeverityToJiraPriority(alertSev) },
            },
          }),
        })

        jiraKey = created.key
        jiraId = created.id
        urlTicket = `${process.env.JIRA_BASE_URL.replace(/\/+$/, '')}/browse/${created.key}`
        estadoSync = 'SINCRONIZADO'
        estadoTicket = 'Tareas por hacer'
      } catch (err) {
        estadoSync = 'ERROR'
        detalleError = err.message
      }
    }

    const inserted = await query(
      `INSERT INTO jira_tickets (
         id_alerta, jira_issue_key, jira_issue_id, proyecto_jira,
         url_ticket, estado_sincronizacion, estado_ticket,
         ultima_sincronizacion, detalle_error
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        alertaId,
        jiraKey,
        jiraId,
        process.env.JIRA_PROJECT_KEY || 'ONEDATA',
        urlTicket,
        estadoSync,
        estadoTicket,
        estadoSync === 'SINCRONIZADO' ? new Date() : null,
        detalleError,
      ],
    )

    return res.status(201).json({
      ok: true,
      ticket: inserted.rows[0],
      syncedWithJira: estadoSync === 'SINCRONIZADO',
    })
  } catch (error) {
    console.error('Error creating Jira ticket:', error)
    return res.status(500).json({
      ok: false,
      message: 'No se pudo crear el ticket.',
    })
  }
})

app.patch('/api/jira/tickets/:id', async (req, res) => {
  const { id } = req.params
  const { estado_ticket } = req.body ?? {}

  if (!estado_ticket) {
    return res
      .status(400)
      .json({ ok: false, message: 'Debes indicar el nuevo estado.' })
  }

  try {
    const ticketRes = await query(
      'SELECT * FROM jira_tickets WHERE id_ticket = $1',
      [id],
    )
    if (ticketRes.rows.length === 0) {
      return res
        .status(404)
        .json({ ok: false, message: 'Ticket no encontrado.' })
    }

    const ticket = ticketRes.rows[0]
    let nextStatus = estado_ticket

    if (isJiraConfigured() && ticket.jira_issue_key) {
      try {
        const transRes = await jiraRequest(
          `/rest/api/3/issue/${ticket.jira_issue_key}/transitions`,
        )
        const target = findJiraTransition(transRes.transitions, estado_ticket)
        if (target) {
          await jiraRequest(
            `/rest/api/3/issue/${ticket.jira_issue_key}/transitions`,
            {
              method: 'POST',
              body: JSON.stringify({ transition: { id: target.id } }),
            },
          )
          nextStatus = target.to?.name || estado_ticket
        }
      } catch (err) {
        console.error('Jira transition warning:', err.message)
      }
    }

    const updated = await query(
      `UPDATE jira_tickets
       SET estado_ticket = $1, ultima_sincronizacion = CURRENT_TIMESTAMP
       WHERE id_ticket = $2
       RETURNING *`,
      [nextStatus, id],
    )

    await query('UPDATE alertas_bi SET estado = $1 WHERE id_alerta = $2', [
      isResolvedJiraStatus(nextStatus) ? 'RESUELTA' : 'PENDIENTE',
      ticket.id_alerta,
    ])

    return res.json({ ok: true, ticket: updated.rows[0] })
  } catch (error) {
    console.error('Error updating Jira ticket:', error)
    return res.status(500).json({
      ok: false,
      message: 'No se pudo actualizar el estado del ticket.',
    })
  }
})

app.post('/api/jira/sync', async (_req, res) => {
  if (!isJiraConfigured()) {
    return res.status(400).json({
      ok: false,
      message:
        'Faltan variables de Jira (JIRA_BASE_URL, JIRA_EMAIL, JIRA_API_TOKEN, JIRA_PROJECT_KEY) en el backend.',
    })
  }

  try {
    let syncedCount = await syncJiraIssuesFromCloud()

    const pendingRows = await query(
      `SELECT jt.*, al.titulo, al.mensaje, al.severidad
       FROM jira_tickets jt
       JOIN alertas_bi al ON al.id_alerta = jt.id_alerta
       WHERE jt.jira_issue_key IS NULL`,
    )

    if (pendingRows.rows.length > 0) {
      const issueTypeName = await resolveJiraIssueType()
      for (const row of pendingRows.rows) {
        try {
          const created = await jiraRequest('/rest/api/3/issue', {
            method: 'POST',
            body: JSON.stringify({
              fields: {
                project: { key: process.env.JIRA_PROJECT_KEY },
                summary: row.titulo,
                description: {
                  type: 'doc',
                  version: 1,
                  content: [
                    {
                      type: 'paragraph',
                      content: [
                        { type: 'text', text: row.mensaje || row.titulo },
                      ],
                    },
                  ],
                },
                issuetype: { name: issueTypeName },
                priority: { name: mapSeverityToJiraPriority(row.severidad) },
              },
            }),
          })
          const urlTicket = `${process.env.JIRA_BASE_URL.replace(/\/+$/, '')}/browse/${created.key}`
          await query(
            `UPDATE jira_tickets
             SET jira_issue_key = $1, jira_issue_id = $2, proyecto_jira = $3,
                 url_ticket = $4, estado_sincronizacion = 'SINCRONIZADO',
                 estado_ticket = 'Tareas por hacer',
                 ultima_sincronizacion = CURRENT_TIMESTAMP, detalle_error = NULL
             WHERE id_ticket = $5`,
            [
              created.key,
              created.id,
              process.env.JIRA_PROJECT_KEY,
              urlTicket,
              row.id_ticket,
            ],
          )
          syncedCount++
        } catch (err) {
          await query(
            `UPDATE jira_tickets
             SET estado_sincronizacion = 'ERROR', detalle_error = $1
             WHERE id_ticket = $2`,
            [err.message, row.id_ticket],
          )
        }
      }
    }

    return res.json({
      ok: true,
      syncedCount,
      message: `${syncedCount} tickets sincronizados con Jira Cloud.`,
    })
  } catch (error) {
    console.error('Error syncing with Jira:', error)
    return res.status(500).json({
      ok: false,
      message: 'Error al sincronizar con Jira Cloud.',
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
