CREATE TABLE roles (
    id_rol BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL UNIQUE,
    descripcion VARCHAR(250)
);

CREATE TABLE usuarios (
    id_usuario BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre_usuario VARCHAR(60) NOT NULL UNIQUE,
    hash_contrasena TEXT NOT NULL, -- Guardar hash seguro, nunca contrasena en texto plano
    nombres VARCHAR(100) NOT NULL,
    apellidos VARCHAR(100) NOT NULL,
    correo VARCHAR(150) UNIQUE,
    telefono VARCHAR(25),
    foto_base64 TEXT,
    esta_activo BOOLEAN NOT NULL DEFAULT TRUE,
    ultimo_acceso TIMESTAMPTZ,
    fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    fecha_modificacion TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE usuarios_roles (
    id_usuario BIGINT NOT NULL REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
    id_rol BIGINT NOT NULL REFERENCES roles(id_rol),
    fecha_asignacion TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (id_usuario, id_rol)
);

CREATE TABLE regiones (
    id_region BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE provincias (
    id_provincia BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_region BIGINT NOT NULL REFERENCES regiones(id_region),
    nombre VARCHAR(100) NOT NULL,
    UNIQUE (id_region, nombre),
    UNIQUE (id_provincia, id_region)
);

CREATE TABLE distritos (
    id_distrito BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_provincia BIGINT NOT NULL REFERENCES provincias(id_provincia),
    nombre VARCHAR(120) NOT NULL,
    esta_activo BOOLEAN NOT NULL DEFAULT TRUE,
    UNIQUE (id_provincia, nombre)
);

CREATE TABLE zonas (
    id_zona BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre VARCHAR(120) NOT NULL,
    descripcion TEXT,
    id_usuario_lider BIGINT REFERENCES usuarios(id_usuario) ON DELETE SET NULL,
    esta_activo BOOLEAN NOT NULL DEFAULT TRUE,
    UNIQUE (nombre)
);

CREATE TABLE zonas_distritos (
    id_zona BIGINT NOT NULL REFERENCES zonas(id_zona) ON DELETE CASCADE,
    id_distrito BIGINT NOT NULL REFERENCES distritos(id_distrito),
    PRIMARY KEY (id_zona, id_distrito)
);

-- 2. TRABAJADORES Y RENDIMIENTO HPW
CREATE TABLE trabajadores (
    id_trabajador BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    tipo_documento VARCHAR(20) NOT NULL DEFAULT 'DNI',
    numero_documento VARCHAR(25) NOT NULL UNIQUE,
    nombres VARCHAR(100) NOT NULL,
    apellidos VARCHAR(100) NOT NULL,
    telefono VARCHAR(25),
    id_distrito BIGINT REFERENCES distritos(id_distrito),
    direccion TEXT,
    paradero_preferido VARCHAR(200),
    fecha_contratacion DATE,
    estado_trabajador VARCHAR(20) NOT NULL DEFAULT 'ACTIVO'
        CHECK (estado_trabajador IN ('ACTIVO','INACTIVO','SUSPENDIDO')),
    consentimiento_gps BOOLEAN NOT NULL DEFAULT FALSE,
    fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    fecha_modificacion TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE periodos_rendimiento (
    id_periodo BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre VARCHAR(120) NOT NULL,
    fecha_inicio DATE NOT NULL,
    fecha_fin DATE NOT NULL,
    campana VARCHAR(120),
    CHECK (fecha_fin >= fecha_inicio),
    UNIQUE (nombre, fecha_inicio, fecha_fin)
);

CREATE TABLE rendimiento_trabajadores (
    performance_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_trabajador BIGINT NOT NULL REFERENCES trabajadores(id_trabajador) ON DELETE CASCADE,
    id_periodo BIGINT NOT NULL REFERENCES periodos_rendimiento(id_periodo),
    dias_trabajados NUMERIC(8,2) NOT NULL DEFAULT 0 CHECK (dias_trabajados >= 0),
    puntaje_productividad NUMERIC(6,2) CHECK (puntaje_productividad BETWEEN 0 AND 100),
    porcentaje_asistencia NUMERIC(6,2) CHECK (porcentaje_asistencia BETWEEN 0 AND 100),
    puntaje_calidad NUMERIC(6,2) CHECK (puntaje_calidad BETWEEN 0 AND 100),
    puntaje_hpw NUMERIC(6,2) CHECK (puntaje_hpw BETWEEN 0 AND 100),
    clasificacion_hpw VARCHAR(20) NOT NULL DEFAULT 'NO_CLASIFICADO'
        CHECK (clasificacion_hpw IN ('HPW','NO_HPW','NO_CLASIFICADO')),
    fecha_evaluacion TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    notas_fuente TEXT,
    UNIQUE (id_trabajador, id_periodo)
);

-- 3. CONVOCATORIAS Y RESULTADOS DEL ALGORITMO
CREATE TABLE convocatorias (
    id_convocatoria BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    titulo VARCHAR(180) NOT NULL,
    campana VARCHAR(120),
    fecha_trabajo DATE NOT NULL,
    turno VARCHAR(30) NOT NULL CHECK (turno IN ('MANANA','TARDE','NOCHE','COMPLETO')),
    id_zona BIGINT REFERENCES zonas(id_zona),
    id_distrito BIGINT REFERENCES distritos(id_distrito),
    trabajadores_requeridos INTEGER NOT NULL CHECK (trabajadores_requeridos > 0),
    estado VARCHAR(25) NOT NULL DEFAULT 'BORRADOR'
        CHECK (estado IN ('BORRADOR','PROGRAMADA','ENVIADA','EN_PROCESO','CERRADA','CANCELADA')),
    creado_por BIGINT REFERENCES usuarios(id_usuario) ON DELETE SET NULL,
    fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    fecha_modificacion TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE ejecuciones_algoritmo (
    id_ejecucion_algoritmo BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    tipo_ejecucion VARCHAR(30) NOT NULL
        CHECK (tipo_ejecucion IN ('SELECCION_HPW','OPTIMIZACION_RUTAS','PREDICCION')),
    id_convocatoria BIGINT REFERENCES convocatorias(id_convocatoria) ON DELETE SET NULL,
    nombre_algoritmo VARCHAR(120) NOT NULL,
    version_algoritmo VARCHAR(60),
    parametros JSONB NOT NULL DEFAULT '{}'::JSONB,
    resumen_entrada JSONB NOT NULL DEFAULT '{}'::JSONB,
    resumen_salida JSONB NOT NULL DEFAULT '{}'::JSONB,
    estado_ejecucion VARCHAR(20) NOT NULL DEFAULT 'COMPLETADO'
        CHECK (estado_ejecucion IN ('PENDIENTE','EJECUTANDO','COMPLETADO','ERROR')),
    fecha_inicio_ejecucion TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    fecha_fin_ejecucion TIMESTAMPTZ,
    ejecutado_por BIGINT REFERENCES usuarios(id_usuario) ON DELETE SET NULL
);

CREATE TABLE candidatos_convocatoria (
    id_candidato BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_convocatoria BIGINT NOT NULL REFERENCES convocatorias(id_convocatoria) ON DELETE CASCADE,
    id_trabajador BIGINT NOT NULL REFERENCES trabajadores(id_trabajador),
    id_ejecucion_algoritmo BIGINT REFERENCES ejecuciones_algoritmo(id_ejecucion_algoritmo) ON DELETE SET NULL,
    puntaje_hpw NUMERIC(6,2) CHECK (puntaje_hpw BETWEEN 0 AND 100),
    costo_transporte_estimado NUMERIC(10,2) CHECK (costo_transporte_estimado >= 0),
    distancia_km NUMERIC(10,2) CHECK (distancia_km >= 0),
    puntaje_seleccion NUMERIC(8,3),
    motivo_seleccion TEXT,
    estado_invitacion VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE'
        CHECK (estado_invitacion IN ('PENDIENTE','ENVIADA','ACEPTADA','RECHAZADA','SIN_RESPUESTA')),
    fecha_invitacion TIMESTAMPTZ,
    fecha_respuesta TIMESTAMPTZ,
    estado_asistencia VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE'
        CHECK (estado_asistencia IN ('PENDIENTE','ASISTIO','NO_ASISTIO','JUSTIFICADO')),
    UNIQUE (id_convocatoria, id_trabajador)
);

-- 4. TRANSPORTE, BUSES, RUTAS Y PARADEROS
CREATE TABLE proveedores_transporte (
    id_proveedor BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    razon_social VARCHAR(160) NOT NULL,
    ruc VARCHAR(20),
    nombre_contacto VARCHAR(120),
    telefono VARCHAR(25),
    esta_activo BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE buses (
    bus_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_proveedor BIGINT REFERENCES proveedores_transporte(id_proveedor),
    numero_placa VARCHAR(15) NOT NULL UNIQUE,
    codigo_interno VARCHAR(40) UNIQUE,
    capacidad INTEGER NOT NULL CHECK (capacidad > 0),
    id_dispositivo_gps VARCHAR(100) UNIQUE,
    proveedor_gps VARCHAR(60) DEFAULT 'CERTISAT',
    estado_bus VARCHAR(20) NOT NULL DEFAULT 'DISPONIBLE'
        CHECK (estado_bus IN ('DISPONIBLE','ASIGNADO','EN_RUTA','MANTENIMIENTO','INACTIVO'))
);

CREATE TABLE rutas (
    id_ruta BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre VARCHAR(160) NOT NULL,
    descripcion_origen VARCHAR(250),
    descripcion_destino VARCHAR(250),
    distancia_estimada_km NUMERIC(10,2) CHECK (distancia_estimada_km >= 0),
    duracion_estimada_minutos INTEGER CHECK (duracion_estimada_minutos >= 0),
    esta_activo BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE paraderos_ruta (
    id_paradero BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_ruta BIGINT NOT NULL REFERENCES rutas(id_ruta) ON DELETE CASCADE,
    nombre_paradero VARCHAR(160) NOT NULL,
    direccion TEXT,
    id_distrito BIGINT REFERENCES distritos(id_distrito),
    latitud NUMERIC(10,7),
    longitud NUMERIC(10,7),
    orden_paradero INTEGER NOT NULL CHECK (orden_paradero > 0),
    hora_llegada_prevista TIME,
    UNIQUE (id_ruta, orden_paradero),
    CHECK (latitud IS NULL OR latitud BETWEEN -90 AND 90),
    CHECK (longitud IS NULL OR longitud BETWEEN -180 AND 180)
);

CREATE TABLE viajes_transporte (
    id_viaje BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_convocatoria BIGINT NOT NULL REFERENCES convocatorias(id_convocatoria),
    id_ruta BIGINT NOT NULL REFERENCES rutas(id_ruta),
    bus_id BIGINT NOT NULL REFERENCES buses(bus_id),
    fecha_hora_salida TIMESTAMPTZ,
    fecha_hora_llegada_estimada TIMESTAMPTZ,
    fecha_hora_llegada_real TIMESTAMPTZ,
    pasajeros_previstos INTEGER NOT NULL DEFAULT 0 CHECK (pasajeros_previstos >= 0),
    pasajeros_reales INTEGER CHECK (pasajeros_reales >= 0),
    estado_viaje VARCHAR(20) NOT NULL DEFAULT 'PROGRAMADO'
        CHECK (estado_viaje IN ('PROGRAMADO','EN_CAMINO','LLEGADA','CANCELADO')),
    asignado_por BIGINT REFERENCES usuarios(id_usuario) ON DELETE SET NULL
);

CREATE TABLE pasajeros_viaje (
    id_viaje BIGINT NOT NULL REFERENCES viajes_transporte(id_viaje) ON DELETE CASCADE,
    id_trabajador BIGINT NOT NULL REFERENCES trabajadores(id_trabajador),
    id_paradero_abordaje BIGINT REFERENCES paraderos_ruta(id_paradero),
    estado_abordaje VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE'
        CHECK (estado_abordaje IN ('PENDIENTE','ABORDO','NO_ABORDO')),
    fecha_abordaje TIMESTAMPTZ,
    PRIMARY KEY (id_viaje, id_trabajador)
);

CREATE TABLE posiciones_gps (
    id_posicion_gps BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    bus_id BIGINT NOT NULL REFERENCES buses(bus_id) ON DELETE CASCADE,
    id_viaje BIGINT REFERENCES viajes_transporte(id_viaje) ON DELETE SET NULL,
    latitud NUMERIC(10,7) NOT NULL CHECK (latitud BETWEEN -90 AND 90),
    longitud NUMERIC(10,7) NOT NULL CHECK (longitud BETWEEN -180 AND 180),
    velocidad_kmh NUMERIC(7,2) CHECK (velocidad_kmh >= 0),
    direccion_rumbo NUMERIC(6,2),
    fecha_registro TIMESTAMPTZ NOT NULL,
    fecha_recepcion TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. COSTOS, ASISTENCIA Y KPI
CREATE TABLE costos_transporte (
    id_costo_transporte BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_viaje BIGINT NOT NULL REFERENCES viajes_transporte(id_viaje) ON DELETE CASCADE,
    tipo_costo VARCHAR(30) NOT NULL
        CHECK (tipo_costo IN ('FLETE','COMBUSTIBLE','PEAJE','OTRO')),
    importe NUMERIC(12,2) NOT NULL CHECK (importe >= 0),
    moneda CHAR(3) NOT NULL DEFAULT 'PEN',
    descripcion TEXT,
    fecha_registro TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    registrado_por BIGINT REFERENCES usuarios(id_usuario) ON DELETE SET NULL
);

CREATE TABLE registros_asistencia (
    id_asistencia BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_convocatoria BIGINT NOT NULL REFERENCES convocatorias(id_convocatoria) ON DELETE CASCADE,
    id_trabajador BIGINT NOT NULL REFERENCES trabajadores(id_trabajador),
    estado_asistencia VARCHAR(20) NOT NULL
        CHECK (estado_asistencia IN ('ASISTIO','NO_ASISTIO','JUSTIFICADO')),
    fecha_registro_entrada TIMESTAMPTZ,
    registrado_por BIGINT REFERENCES usuarios(id_usuario) ON DELETE SET NULL,
    observaciones TEXT,
    UNIQUE (id_convocatoria, id_trabajador)
);

CREATE TABLE notificaciones (
    id_notificacion BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_usuario BIGINT REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
    id_trabajador BIGINT REFERENCES trabajadores(id_trabajador) ON DELETE CASCADE,
    titulo VARCHAR(180) NOT NULL,
    message TEXT NOT NULL,
    canal VARCHAR(20) NOT NULL DEFAULT 'APP'
        CHECK (canal IN ('APP','SMS','WHATSAPP','EMAIL','SISTEMA')),
    estado_notificacion VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE'
        CHECK (estado_notificacion IN ('PENDIENTE','ENVIADA','LEIDA','ERROR')),
    fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    fecha_envio TIMESTAMPTZ,
    fecha_lectura TIMESTAMPTZ,
    CHECK (id_usuario IS NOT NULL OR id_trabajador IS NOT NULL)
);

-- 6. AUDITORIA
CREATE TABLE registros_auditoria (
    id_auditoria BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_usuario BIGINT REFERENCES usuarios(id_usuario) ON DELETE SET NULL,
    accion VARCHAR(80) NOT NULL,
    nombre_entidad VARCHAR(100) NOT NULL,
    id_entidad BIGINT,
    valores_anteriores JSONB,
    valores_nuevos JSONB,
    direccion_ip INET,
    fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. INDICES PARA CONSULTAS FRECUENTES
CREATE INDEX indice_workers_district ON trabajadores(id_distrito);
CREATE INDEX indice_worker_performance_period ON rendimiento_trabajadores(id_periodo, clasificacion_hpw);
CREATE INDEX indice_convocations_date_status ON convocatorias(fecha_trabajo, estado);
CREATE INDEX indice_candidates_convocation_status ON candidatos_convocatoria(id_convocatoria, estado_invitacion);
CREATE INDEX indice_candidates_worker ON candidatos_convocatoria(id_trabajador);
CREATE INDEX indice_trips_convocation ON viajes_transporte(id_convocatoria);
CREATE INDEX indice_gps_bus_recorded ON posiciones_gps(bus_id, fecha_registro DESC);
CREATE INDEX indice_gps_trip_recorded ON posiciones_gps(id_viaje, fecha_registro DESC);
CREATE INDEX indice_costs_trip ON costos_transporte(id_viaje);
CREATE INDEX indice_notifications_user_status ON notificaciones(id_usuario, estado_notificacion);
CREATE INDEX indice_audit_entity ON registros_auditoria(nombre_entidad, id_entidad, fecha_creacion DESC);

-- 8. VISTAS PARA EL DASHBOARD
CREATE OR REPLACE VIEW vista_costo_transporte_por_persona AS
SELECT
    t.id_viaje,
    t.id_convocatoria,
    t.bus_id,
    COALESCE(SUM(tc.importe), 0)::NUMERIC(12,2) AS costo_total_transporte,
    COALESCE(t.pasajeros_reales, t.pasajeros_previstos, 0) AS cantidad_pasajeros,
    CASE
        WHEN COALESCE(t.pasajeros_reales, t.pasajeros_previstos, 0) > 0
        THEN ROUND(
            COALESCE(SUM(tc.importe), 0) /
            COALESCE(t.pasajeros_reales, t.pasajeros_previstos)::NUMERIC, 2
        )
        ELSE NULL
    END AS costo_por_persona
FROM viajes_transporte t
LEFT JOIN costos_transporte tc ON tc.id_viaje = t.id_viaje
GROUP BY t.id_viaje, t.id_convocatoria, t.bus_id, t.pasajeros_reales, t.pasajeros_previstos;

CREATE OR REPLACE VIEW vista_reingreso_hpw AS
SELECT
    c.id_convocatoria,
    c.fecha_trabajo,
    c.campana,
    COUNT(*) FILTER (WHERE cp.puntaje_hpw IS NOT NULL) AS trabajadores_hpw_evaluados,
    COUNT(*) FILTER (
        WHERE cp.puntaje_hpw >= 70 AND ar.estado_asistencia = 'ASISTIO'
    ) AS trabajadores_hpw_reingresados,
    CASE
        WHEN COUNT(*) FILTER (WHERE cp.puntaje_hpw >= 70) > 0
        THEN ROUND(
            100.0 * COUNT(*) FILTER (
                WHERE cp.puntaje_hpw >= 70 AND ar.estado_asistencia = 'ASISTIO'
            ) /
            COUNT(*) FILTER (WHERE cp.puntaje_hpw >= 70), 2
        )
        ELSE 0
    END AS porcentaje_reingreso_hpw
FROM convocatorias c
JOIN candidatos_convocatoria cp ON cp.id_convocatoria = c.id_convocatoria
LEFT JOIN registros_asistencia ar
    ON ar.id_convocatoria = c.id_convocatoria AND ar.id_trabajador = cp.id_trabajador
GROUP BY c.id_convocatoria, c.fecha_trabajo, c.campana;

CREATE OR REPLACE VIEW vista_indicadores_dashboard AS
SELECT
    (SELECT ROUND(AVG(costo_por_persona), 2)
     FROM vista_costo_transporte_por_persona
     WHERE costo_por_persona IS NOT NULL) AS costo_promedio_transporte_persona,
    (SELECT ROUND(AVG(porcentaje_reingreso_hpw), 2)
     FROM vista_reingreso_hpw) AS porcentaje_promedio_reingreso_hpw,
    (SELECT COUNT(*) FROM distritos WHERE esta_activo = TRUE) AS distritos_activos,
    (SELECT COUNT(*) FROM trabajadores WHERE estado_trabajador = 'ACTIVO') AS trabajadores_activos,
    (SELECT COUNT(*) FROM convocatorias
     WHERE fecha_trabajo >= CURRENT_DATE AND estado IN ('PROGRAMADA','ENVIADA','EN_PROCESO')
    ) AS convocatorias_proximas;

-- 9. DATOS INICIALES DE ROLES Y REGIONES
INSERT INTO roles (nombre, descripcion) VALUES
('ADMINISTRADOR', 'Acceso integral y administracion del sistema'),
('RECLUTAMIENTO', 'Gestion de trabajadores y convocatorias'),
('LIDER_ZONA', 'Gestion de convocatorias y seguimiento de su zona'),
('TRANSPORTE', 'Gestion de buses, rutas, viajes y costos'),
('ANALISTA_MO', 'Analisis de mano de obra, rendimiento y KPI'),
('GERENCIA', 'Consulta de indicadores y reportes')
ON CONFLICT (nombre) DO NOTHING;

INSERT INTO regiones (nombre) VALUES ('Lambayeque'), ('Piura')
ON CONFLICT (nombre) DO NOTHING;

-- 10. TRIGGER PARA ACTUALIZAR fecha_modificacion
CREATE OR REPLACE FUNCTION actualizar_fecha_modificacion()
RETURNS TRIGGER AS $$
BEGIN
    NEW.fecha_modificacion = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER disparador_users_updated_at
BEFORE UPDATE ON usuarios
FOR EACH ROW EXECUTE FUNCTION actualizar_fecha_modificacion();

CREATE TRIGGER disparador_workers_updated_at
BEFORE UPDATE ON trabajadores
FOR EACH ROW EXECUTE FUNCTION actualizar_fecha_modificacion();

CREATE TRIGGER disparador_convocations_updated_at
BEFORE UPDATE ON convocatorias
FOR EACH ROW EXECUTE FUNCTION actualizar_fecha_modificacion();

COMMIT;


---


-- ==========================================
-- ALTER TABLE: DATOS ADICIONALES DE USUARIOS
-- ==========================================

ALTER TABLE usuarios
ADD COLUMN IF NOT EXISTS foto_perfil_url TEXT;

ALTER TABLE usuarios
ADD COLUMN IF NOT EXISTS foto_perfil_nombre VARCHAR(255);

ALTER TABLE usuarios
ADD COLUMN IF NOT EXISTS fecha_actualizacion_foto TIMESTAMPTZ;

-- ==========================================
-- ALTER TABLE: PREFERENCIAS DEL SISTEMA
-- ==========================================

ALTER TABLE usuarios
ADD COLUMN IF NOT EXISTS idioma VARCHAR(10) NOT NULL DEFAULT 'es';

ALTER TABLE usuarios
ADD COLUMN IF NOT EXISTS tema VARCHAR(15) NOT NULL DEFAULT 'CLARO';

ALTER TABLE usuarios
ADD COLUMN IF NOT EXISTS notificaciones_email BOOLEAN NOT NULL DEFAULT TRUE;

-- Preferencias individuales de notificaciones
ALTER TABLE usuarios
ADD COLUMN IF NOT EXISTS preferencias_notificacion JSONB
NOT NULL DEFAULT '{
    "convocatorias_hpw": true,
    "transporte_rutas": true,
    "reportes_alertas": true,
    "notificaciones_sistema": true
}'::JSONB;

----------------------


-- =========================================================
-- SCRIPT COMPLEMENTARIO: ONE-DATA BI (INTEGRADO A LA BD 1)
-- PostgreSQL 14+ | Sin esquemas adicionales
-- Nota: Se reutilizan 'usuarios', 'roles' y 'registros_auditoria'
-- de la base de datos principal para evitar duplicidad.
-- =========================================================

-- 1. AREAS CORPORATIVAS (Campo, Packing, Gestion Humana, Comercial, Finanzas)
CREATE TABLE IF NOT EXISTS areas (
    id_area BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre VARCHAR(80) NOT NULL UNIQUE,
    descripcion TEXT,
    estado BOOLEAN NOT NULL DEFAULT TRUE,
    fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO areas (nombre, descripcion) VALUES
('Campo', 'Produccion y operaciones agricolas'),
('Packing', 'Procesamiento y empaque de productos'),
('Gestion Humana', 'Personal, asistencia y recursos humanos'),
('Comercial', 'Ventas, clientes y comercializacion'),
('Finanzas', 'Presupuestos, costos y resultados financieros')
ON CONFLICT (nombre) DO NOTHING;

-- Roles adicionales de gobierno / BI en la tabla 'roles' existente
INSERT INTO roles (nombre, descripcion) VALUES
('DIRECTORIO', 'Acceso ejecutivo corporativo'),
('GERENCIA_GENERAL', 'Supervision general del negocio'),
('GERENTE_AREA', 'Gestion de indicadores de un area'),
('SUBGERENTE', 'Supervision operativa y presupuestal'),
('ANALISTA', 'Consulta y analisis de informacion')
ON CONFLICT (nombre) DO NOTHING;

-- Vinculo opcional de usuario con su area corporativa principal
ALTER TABLE usuarios
ADD COLUMN IF NOT EXISTS id_area BIGINT REFERENCES areas(id_area) ON DELETE SET NULL;

-- 2. FUENTES DE DATOS (APO14)
CREATE TABLE IF NOT EXISTS fuentes_datos (
    id_fuente BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_area BIGINT NOT NULL REFERENCES areas(id_area),
    nombre VARCHAR(120) NOT NULL,
    tipo VARCHAR(30) NOT NULL
        CHECK (tipo IN (
            'BASE_DATOS', 'API', 'ARCHIVO',
            'ERP', 'SISTEMA_EXTERNO', 'OTRO'
        )),
    sistema_origen VARCHAR(120),
    descripcion TEXT,
    configuracion JSONB NOT NULL DEFAULT '{}'::JSONB,
    intervalo_sincronizacion_min INTEGER NOT NULL DEFAULT 60
        CHECK (intervalo_sincronizacion_min > 0),
    ultima_sincronizacion TIMESTAMPTZ,
    estado VARCHAR(20) NOT NULL DEFAULT 'ACTIVA'
        CHECK (estado IN ('ACTIVA', 'INACTIVA', 'ERROR')),
    fecha_registro TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (id_area, nombre)
);

-- 3. FLUJOS DE DATOS Y CICLO DE VIDA (APO14.08.4)
CREATE TABLE IF NOT EXISTS flujos_datos (
    id_flujo BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre VARCHAR(150) NOT NULL UNIQUE,
    descripcion TEXT,
    area_origen_id BIGINT REFERENCES areas(id_area),
    area_destino_id BIGINT REFERENCES areas(id_area),
    fuente_origen_id BIGINT REFERENCES fuentes_datos(id_fuente),
    fuente_destino_id BIGINT REFERENCES fuentes_datos(id_fuente),
    frecuencia VARCHAR(30) NOT NULL DEFAULT 'HORARIA',
    estado VARCHAR(20) NOT NULL DEFAULT 'ACTIVO'
        CHECK (estado IN ('ACTIVO', 'PAUSADO', 'INACTIVO')),
    creado_por BIGINT REFERENCES usuarios(id_usuario) ON DELETE SET NULL,
    fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS etapas_ciclo_datos (
    id_etapa BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_flujo BIGINT NOT NULL REFERENCES flujos_datos(id_flujo) ON DELETE CASCADE,
    nombre VARCHAR(120) NOT NULL,
    orden INTEGER NOT NULL CHECK (orden > 0),
    tipo_etapa VARCHAR(30) NOT NULL
        CHECK (tipo_etapa IN (
            'EXTRACCION', 'TRANSFORMACION', 'VALIDACION',
            'CARGA', 'ALMACENAMIENTO', 'CONSUMO', 'ARCHIVO'
        )),
    descripcion TEXT,
    politica_retencion_dias INTEGER
        CHECK (politica_retencion_dias IS NULL OR politica_retencion_dias >= 0),
    UNIQUE (id_flujo, orden)
);

CREATE TABLE IF NOT EXISTS ejecuciones_flujo (
    id_ejecucion BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_flujo BIGINT NOT NULL REFERENCES flujos_datos(id_flujo),
    inicio TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    fin TIMESTAMPTZ,
    estado VARCHAR(20) NOT NULL DEFAULT 'EN_PROCESO'
        CHECK (estado IN (
            'EN_PROCESO', 'EXITOSO', 'FALLIDO',
            'ADVERTENCIA', 'CANCELADO'
        )),
    registros_leidos BIGINT NOT NULL DEFAULT 0 CHECK (registros_leidos >= 0),
    registros_procesados BIGINT NOT NULL DEFAULT 0 CHECK (registros_procesados >= 0),
    registros_rechazados BIGINT NOT NULL DEFAULT 0 CHECK (registros_rechazados >= 0),
    mensaje_error TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
    CHECK (fin IS NULL OR fin >= inicio)
);

-- 4. CALIDAD DE DATOS
CREATE TABLE IF NOT EXISTS reglas_calidad (
    id_regla BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_fuente BIGINT REFERENCES fuentes_datos(id_fuente),
    nombre VARCHAR(120) NOT NULL,
    descripcion TEXT,
    tipo_regla VARCHAR(30) NOT NULL
        CHECK (tipo_regla IN (
            'COMPLETITUD', 'UNICIDAD', 'CONSISTENCIA',
            'VALIDEZ', 'INTEGRIDAD', 'ACTUALIDAD'
        )),
    criterio JSONB NOT NULL DEFAULT '{}'::JSONB,
    obligatoria BOOLEAN NOT NULL DEFAULT TRUE,
    activa BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS resultados_calidad (
    id_resultado BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_regla BIGINT NOT NULL REFERENCES reglas_calidad(id_regla),
    id_ejecucion BIGINT REFERENCES ejecuciones_flujo(id_ejecucion),
    fecha_evaluacion TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    registros_evaluados BIGINT NOT NULL DEFAULT 0 CHECK (registros_evaluados >= 0),
    registros_correctos BIGINT NOT NULL DEFAULT 0 CHECK (registros_correctos >= 0),
    registros_observados BIGINT NOT NULL DEFAULT 0 CHECK (registros_observados >= 0),
    observaciones TEXT,
    CHECK (registros_correctos + registros_observados <= registros_evaluados)
);

-- 5. DATA WAREHOUSE UNIFICADO
CREATE TABLE IF NOT EXISTS conjuntos_datos_dw (
    id_conjunto BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_area BIGINT NOT NULL REFERENCES areas(id_area),
    nombre VARCHAR(120) NOT NULL UNIQUE,
    descripcion TEXT,
    granularidad VARCHAR(120),
    esquema JSONB NOT NULL DEFAULT '{}'::JSONB,
    fecha_actualizacion TIMESTAMPTZ,
    estado VARCHAR(15) NOT NULL DEFAULT 'ACTIVO'
        CHECK (estado IN ('ACTIVO', 'INACTIVO'))
);

CREATE TABLE IF NOT EXISTS registros_dw (
    id_registro BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_conjunto BIGINT NOT NULL REFERENCES conjuntos_datos_dw(id_conjunto),
    id_fuente BIGINT REFERENCES fuentes_datos(id_fuente),
    id_ejecucion BIGINT REFERENCES ejecuciones_flujo(id_ejecucion),
    clave_origen VARCHAR(200),
    datos JSONB NOT NULL,
    hash_registro VARCHAR(128),
    fecha_origen TIMESTAMPTZ,
    fecha_carga TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (id_fuente, clave_origen, id_conjunto)
);

CREATE INDEX IF NOT EXISTS idx_registros_dw_conjunto_fecha
    ON registros_dw (id_conjunto, fecha_carga DESC);

CREATE INDEX IF NOT EXISTS idx_registros_dw_datos
    ON registros_dw USING GIN (datos);

-- 6. DASHBOARDS Y MIGRACION (KPI 1)
CREATE TABLE IF NOT EXISTS dashboards (
    id_dashboard BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre VARCHAR(150) NOT NULL UNIQUE,
    descripcion TEXT,
    categoria VARCHAR(40) NOT NULL
        CHECK (categoria IN (
            'CORPORATIVO', 'CAMPO', 'PACKING',
            'GESTION_HUMANA', 'COMERCIAL',
            'FINANZAS', 'OPERACIONES'
        )),
    url_interna TEXT,
    propietario_id BIGINT REFERENCES usuarios(id_usuario) ON DELETE SET NULL,
    estado VARCHAR(20) NOT NULL DEFAULT 'ACTIVO'
        CHECK (estado IN ('ACTIVO', 'INACTIVO', 'MANTENIMIENTO')),
    migrado BOOLEAN NOT NULL DEFAULT FALSE,
    fecha_migracion TIMESTAMPTZ,
    fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (
        (migrado = FALSE AND fecha_migracion IS NULL)
        OR
        (migrado = TRUE AND fecha_migracion IS NOT NULL)
    )
);

CREATE TABLE IF NOT EXISTS dashboards_areas (
    id_dashboard BIGINT NOT NULL REFERENCES dashboards(id_dashboard) ON DELETE CASCADE,
    id_area BIGINT NOT NULL REFERENCES areas(id_area),
    PRIMARY KEY (id_dashboard, id_area)
);

CREATE TABLE IF NOT EXISTS dashboards_conjuntos_datos (
    id_dashboard BIGINT NOT NULL REFERENCES dashboards(id_dashboard) ON DELETE CASCADE,
    id_conjunto BIGINT NOT NULL REFERENCES conjuntos_datos_dw(id_conjunto),
    PRIMARY KEY (id_dashboard, id_conjunto)
);

CREATE TABLE IF NOT EXISTS historial_migracion_dashboards (
    id_migracion BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_dashboard BIGINT NOT NULL REFERENCES dashboards(id_dashboard),
    fecha_inicio TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    fecha_fin TIMESTAMPTZ,
    estado VARCHAR(20) NOT NULL DEFAULT 'EN_PROCESO'
        CHECK (estado IN (
            'EN_PROCESO', 'EXITOSA', 'FALLIDA', 'REVERSADA'
        )),
    version_origen VARCHAR(60),
    version_destino VARCHAR(60),
    responsable_id BIGINT REFERENCES usuarios(id_usuario) ON DELETE SET NULL,
    observaciones TEXT,
    CHECK (fecha_fin IS NULL OR fecha_fin >= fecha_inicio)
);

-- 7. DISPONIBILIDAD DEL SERVICIO (KPI 2 >= 99.5%)
CREATE TABLE IF NOT EXISTS incidentes_servicio (
    id_incidente BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    servicio VARCHAR(100) NOT NULL DEFAULT 'DASHBOARDS',
    inicio TIMESTAMPTZ NOT NULL,
    fin TIMESTAMPTZ,
    causa TEXT,
    estado VARCHAR(20) NOT NULL DEFAULT 'ABIERTO'
        CHECK (estado IN ('ABIERTO', 'RESUELTO', 'CERRADO')),
    registrado_por BIGINT REFERENCES usuarios(id_usuario) ON DELETE SET NULL,
    CHECK (fin IS NULL OR fin >= inicio),
    CHECK (
        (estado = 'ABIERTO' AND fin IS NULL)
        OR
        (estado IN ('RESUELTO', 'CERRADO') AND fin IS NOT NULL)
    )
);

CREATE TABLE IF NOT EXISTS comprobaciones_servicio (
    id_comprobacion BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    servicio VARCHAR(100) NOT NULL DEFAULT 'DASHBOARDS',
    fecha_comprobacion TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    disponible BOOLEAN NOT NULL,
    tiempo_respuesta_ms INTEGER
        CHECK (tiempo_respuesta_ms IS NULL OR tiempo_respuesta_ms >= 0),
    detalle TEXT
);

CREATE INDEX IF NOT EXISTS idx_comprobaciones_servicio_fecha
    ON comprobaciones_servicio (servicio, fecha_comprobacion DESC);

-- 8. ALERTAS BI, NOTIFICACIONES DE ALERTA Y JIRA SERVICE MANAGEMENT
CREATE TABLE IF NOT EXISTS alertas_bi (
    id_alerta BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_area BIGINT REFERENCES areas(id_area),
    id_fuente BIGINT REFERENCES fuentes_datos(id_fuente),
    id_flujo BIGINT REFERENCES flujos_datos(id_flujo),
    id_ejecucion BIGINT REFERENCES ejecuciones_flujo(id_ejecucion),
    id_incidente BIGINT REFERENCES incidentes_servicio(id_incidente),
    tipo VARCHAR(35) NOT NULL
        CHECK (tipo IN (
            'SINCRONIZACION', 'CALIDAD_DATOS', 'DISPONIBILIDAD',
            'ACTUALIZACION', 'INTEGRACION', 'SEGURIDAD', 'OTRA'
        )),
    severidad VARCHAR(15) NOT NULL DEFAULT 'MEDIA'
        CHECK (severidad IN ('BAJA', 'MEDIA', 'ALTA', 'CRITICA')),
    titulo VARCHAR(180) NOT NULL,
    mensaje TEXT NOT NULL,
    fecha_generacion TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    estado VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE'
        CHECK (estado IN (
            'PENDIENTE', 'EN_ATENCION', 'RESUELTA', 'DESCARTADA'
        )),
    asignado_a BIGINT REFERENCES usuarios(id_usuario) ON DELETE SET NULL,
    fecha_resolucion TIMESTAMPTZ,
    CHECK (
        (estado = 'RESUELTA' AND fecha_resolucion IS NOT NULL)
        OR
        (estado <> 'RESUELTA' AND fecha_resolucion IS NULL)
    )
);

CREATE TABLE IF NOT EXISTS notificaciones_alerta (
    id_notificacion_alerta BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_alerta BIGINT NOT NULL REFERENCES alertas_bi(id_alerta) ON DELETE CASCADE,
    id_usuario BIGINT NOT NULL REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
    fecha_envio TIMESTAMPTZ,
    fecha_lectura TIMESTAMPTZ,
    canal VARCHAR(20) NOT NULL DEFAULT 'INTERNO'
        CHECK (canal IN ('INTERNO', 'CORREO', 'JIRA')),
    estado VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE'
        CHECK (estado IN ('PENDIENTE', 'ENVIADA', 'FALLIDA', 'LEIDA'))
);

CREATE TABLE IF NOT EXISTS jira_tickets (
    id_ticket BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_alerta BIGINT NOT NULL UNIQUE REFERENCES alertas_bi(id_alerta) ON DELETE CASCADE,
    jira_issue_key VARCHAR(40) UNIQUE,
    jira_issue_id VARCHAR(80),
    proyecto_jira VARCHAR(80),
    url_ticket TEXT,
    estado_sincronizacion VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE'
        CHECK (estado_sincronizacion IN (
            'PENDIENTE', 'SINCRONIZADO', 'ERROR'
        )),
    estado_ticket VARCHAR(40),
    fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ultima_sincronizacion TIMESTAMPTZ,
    detalle_error TEXT
);

-- 9. VISTAS DE KPI Y MONITOREO ONE-DATA BI
CREATE OR REPLACE VIEW vw_kpi_migracion_dashboards AS
SELECT
    COUNT(*) FILTER (WHERE estado = 'ACTIVO') AS total_dashboards,
    COUNT(*) FILTER (WHERE estado = 'ACTIVO' AND migrado = TRUE) AS dashboards_migrados,
    ROUND(
        100.0 * COUNT(*) FILTER (WHERE estado = 'ACTIVO' AND migrado = TRUE)
        / NULLIF(COUNT(*) FILTER (WHERE estado = 'ACTIVO'), 0), 2
    ) AS porcentaje_migrado,
    CASE
        WHEN COUNT(*) FILTER (WHERE estado = 'ACTIVO') = 0 THEN 'SIN DATOS'
        WHEN COUNT(*) FILTER (WHERE estado = 'ACTIVO' AND migrado = TRUE)
             = COUNT(*) FILTER (WHERE estado = 'ACTIVO') THEN 'CUMPLIDO'
        ELSE 'EN PROCESO'
    END AS estado_kpi
FROM dashboards;

CREATE OR REPLACE VIEW vw_kpi_disponibilidad_diaria AS
SELECT
    servicio,
    fecha_comprobacion::DATE AS fecha,
    COUNT(*) AS total_comprobaciones,
    COUNT(*) FILTER (WHERE disponible = TRUE) AS comprobaciones_exitosas,
    ROUND(
        100.0 * COUNT(*) FILTER (WHERE disponible = TRUE)
        / NULLIF(COUNT(*), 0), 3
    ) AS disponibilidad_porcentaje,
    CASE
        WHEN 100.0 * COUNT(*) FILTER (WHERE disponible = TRUE)
             / NULLIF(COUNT(*), 0) >= 99.5 THEN 'CUMPLIDO'
        ELSE 'FUERA DE OBJETIVO'
    END AS estado_kpi
FROM comprobaciones_servicio
GROUP BY servicio, fecha_comprobacion::DATE;

CREATE OR REPLACE VIEW vw_estado_sincronizacion AS
SELECT
    f.id_flujo,
    f.nombre AS flujo,
    f.estado AS estado_flujo,
    a.nombre AS area_origen,
    MAX(e.inicio) AS ultima_ejecucion,
    COUNT(e.id_ejecucion) FILTER (WHERE e.estado = 'FALLIDO') AS ejecuciones_fallidas,
    COUNT(e.id_ejecucion) FILTER (WHERE e.estado = 'EXITOSO') AS ejecuciones_exitosas,
    (
        SELECT e2.estado
        FROM ejecuciones_flujo e2
        WHERE e2.id_flujo = f.id_flujo
        ORDER BY e2.inicio DESC
        LIMIT 1
    ) AS estado_ultima_ejecucion
FROM flujos_datos f
LEFT JOIN areas a ON a.id_area = f.area_origen_id
LEFT JOIN ejecuciones_flujo e ON e.id_flujo = f.id_flujo
GROUP BY f.id_flujo, f.nombre, f.estado, a.nombre;

CREATE OR REPLACE VIEW vw_alertas_pendientes AS
SELECT
    al.id_alerta,
    al.tipo,
    al.severidad,
    al.titulo,
    al.mensaje,
    al.fecha_generacion,
    ar.nombre AS area,
    fu.nombre AS fuente,
    al.estado,
    jt.jira_issue_key,
    jt.estado_sincronizacion AS estado_jira
FROM alertas_bi al
LEFT JOIN areas ar ON ar.id_area = al.id_area
LEFT JOIN fuentes_datos fu ON fu.id_fuente = al.id_fuente
LEFT JOIN jira_tickets jt ON jt.id_alerta = al.id_alerta
WHERE al.estado IN ('PENDIENTE', 'EN_ATENCION');

CREATE OR REPLACE VIEW vw_resumen_area AS
SELECT
    a.id_area,
    a.nombre AS area,
    (SELECT COUNT(*) FROM fuentes_datos f WHERE f.id_area = a.id_area) AS total_fuentes,
    (SELECT COUNT(*) FROM fuentes_datos f WHERE f.id_area = a.id_area AND f.estado = 'ACTIVA') AS fuentes_activas,
    (SELECT COUNT(*) FROM flujos_datos fl WHERE fl.area_origen_id = a.id_area) AS total_flujos,
    (SELECT COUNT(*) FROM flujos_datos fl WHERE fl.area_origen_id = a.id_area AND fl.estado = 'ACTIVO') AS flujos_activos,
    (SELECT COUNT(*) FROM alertas_bi al WHERE al.id_area = a.id_area AND al.estado IN ('PENDIENTE', 'EN_ATENCION')) AS alertas_pendientes
FROM areas a;



-- =========================================================
-- CORRECCIONES E INTEGRIDAD EN ESQUEMA BASE
-- =========================================================

ALTER TABLE posiciones_gps
    DROP CONSTRAINT IF EXISTS posiciones_gps_direccion_rumbo_check,
    ADD CONSTRAINT posiciones_gps_direccion_rumbo_check
        CHECK (direccion_rumbo IS NULL OR (direccion_rumbo >= 0 AND direccion_rumbo <= 360));

CREATE INDEX IF NOT EXISTS idx_usuarios_roles_rol ON usuarios_roles(id_rol);
CREATE INDEX IF NOT EXISTS idx_provincias_region ON provincias(id_region);
CREATE INDEX IF NOT EXISTS idx_distritos_provincia ON distritos(id_provincia);
CREATE INDEX IF NOT EXISTS idx_zonas_distritos_distrito ON zonas_distritos(id_distrito);
CREATE INDEX IF NOT EXISTS idx_rendimiento_trabajador ON rendimiento_trabajadores(id_trabajador);
CREATE INDEX IF NOT EXISTS idx_viajes_bus ON viajes_transporte(bus_id);
CREATE INDEX IF NOT EXISTS idx_pasajeros_viaje_trabajador ON pasajeros_viaje(id_trabajador);
CREATE INDEX IF NOT EXISTS idx_notificaciones_trabajador ON notificaciones(id_trabajador);

-- =========================================================
-- 1. CAMPO: FUNDOS, LOTES Y TONELADAS COSECHADAS
-- =========================================================

CREATE TABLE IF NOT EXISTS fundos (
    id_fundo BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre VARCHAR(120) NOT NULL UNIQUE,
    id_distrito BIGINT REFERENCES distritos(id_distrito),
    hectareas_totales NUMERIC(10,2) CHECK (hectareas_totales IS NULL OR hectareas_totales >= 0),
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS lotes_campo (
    id_lote BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_fundo BIGINT NOT NULL REFERENCES fundos(id_fundo) ON DELETE CASCADE,
    codigo_lote VARCHAR(60) NOT NULL,
    cultivo VARCHAR(80) NOT NULL,
    variedad VARCHAR(80),
    area_ha NUMERIC(10,2) CHECK (area_ha IS NULL OR area_ha >= 0),
    estado VARCHAR(20) NOT NULL DEFAULT 'ACTIVO'
        CHECK (estado IN ('ACTIVO', 'COSECHA', 'DESCANSO', 'INACTIVO')),
    UNIQUE (id_fundo, codigo_lote)
);

CREATE TABLE IF NOT EXISTS cosechas_diarias (
    id_cosecha BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_lote BIGINT NOT NULL REFERENCES lotes_campo(id_lote),
    fecha_cosecha DATE NOT NULL,
    turno VARCHAR(20) NOT NULL DEFAULT 'MANANA'
        CHECK (turno IN ('MANANA', 'TARDE', 'NOCHE', 'COMPLETO')),
    kg_cosechados NUMERIC(12,2) NOT NULL CHECK (kg_cosechados >= 0),
    toneladas_cosechadas NUMERIC(12,4) GENERATED ALWAYS AS (kg_cosechados / 1000.0) STORED,
    jabas_recolectadas INTEGER CHECK (jabas_recolectadas IS NULL OR jabas_recolectadas >= 0),
    registrado_por BIGINT REFERENCES usuarios(id_usuario) ON DELETE SET NULL,
    fecha_registro TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (id_lote, fecha_cosecha, turno)
);

CREATE INDEX IF NOT EXISTS idx_cosechas_fecha ON cosechas_diarias(fecha_cosecha DESC);

-- =========================================================
-- 2. PACKING: LINEAS Y TONELADAS PROCESADAS / EXPORTADAS
-- =========================================================

CREATE TABLE IF NOT EXISTS lineas_packing (
    id_linea BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    codigo VARCHAR(40) NOT NULL UNIQUE,
    nombre VARCHAR(120) NOT NULL,
    capacidad_ton_hora NUMERIC(8,2) CHECK (capacidad_ton_hora IS NULL OR capacidad_ton_hora > 0),
    activa BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS produccion_packing (
    id_produccion_packing BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_linea BIGINT NOT NULL REFERENCES lineas_packing(id_linea),
    id_lote BIGINT REFERENCES lotes_campo(id_lote),
    fecha_proceso DATE NOT NULL,
    turno VARCHAR(20) NOT NULL DEFAULT 'MANANA'
        CHECK (turno IN ('MANANA', 'TARDE', 'NOCHE', 'COMPLETO')),
    calibre VARCHAR(40),
    kg_ingresados NUMERIC(12,2) NOT NULL CHECK (kg_ingresados >= 0),
    toneladas_ingresadas NUMERIC(12,4) GENERATED ALWAYS AS (kg_ingresados / 1000.0) STORED,
    kg_exportables NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (kg_exportables >= 0),
    toneladas_exportables NUMERIC(12,4) GENERATED ALWAYS AS (kg_exportables / 1000.0) STORED,
    kg_descarte NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (kg_descarte >= 0),
    toneladas_descarte NUMERIC(12,4) GENERATED ALWAYS AS (kg_descarte / 1000.0) STORED,
    cajas_producidas INTEGER NOT NULL DEFAULT 0 CHECK (cajas_producidas >= 0),
    registrado_por BIGINT REFERENCES usuarios(id_usuario) ON DELETE SET NULL,
    fecha_registro TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (kg_exportables + kg_descarte <= kg_ingresados + 0.01)
);

CREATE INDEX IF NOT EXISTS idx_produccion_packing_fecha ON produccion_packing(fecha_proceso DESC);
CREATE INDEX IF NOT EXISTS idx_produccion_packing_linea ON produccion_packing(id_linea, fecha_proceso DESC);

-- =========================================================
-- 3. COMERCIAL: CLIENTES Y DESPACHOS EN TONELADAS
-- =========================================================

CREATE TABLE IF NOT EXISTS clientes (
    id_cliente BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    codigo_cliente VARCHAR(40) UNIQUE,
    razon_social VARCHAR(180) NOT NULL,
    nombre_comercial VARCHAR(180),
    tipo_cliente VARCHAR(25) NOT NULL DEFAULT 'EXPORTACION'
        CHECK (tipo_cliente IN ('EXPORTACION', 'NACIONAL', 'MAYORISTA', 'INSTITUCIONAL')),
    numero_identificacion VARCHAR(40),
    pais VARCHAR(80) NOT NULL DEFAULT 'Peru',
    ciudad VARCHAR(100),
    correo_contacto VARCHAR(150),
    telefono_contacto VARCHAR(30),
    estado VARCHAR(20) NOT NULL DEFAULT 'ACTIVO'
        CHECK (estado IN ('ACTIVO', 'INACTIVO', 'SUSPENDIDO')),
    fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ordenes_despacho (
    id_despacho BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    numero_guia_o_orden VARCHAR(60) NOT NULL UNIQUE,
    id_cliente BIGINT NOT NULL REFERENCES clientes(id_cliente),
    fecha_despacho DATE NOT NULL,
    puerto_o_destino VARCHAR(160),
    moneda CHAR(3) NOT NULL DEFAULT 'USD'
        CHECK (moneda IN ('USD', 'PEN', 'EUR')),
    monto_total NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (monto_total >= 0),
    estado VARCHAR(20) NOT NULL DEFAULT 'PROGRAMADO'
        CHECK (estado IN ('PROGRAMADO', 'EN_TRANSITO', 'ENTREGADO', 'OBSERVADO', 'ANULADO')),
    registrado_por BIGINT REFERENCES usuarios(id_usuario) ON DELETE SET NULL,
    fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS detalle_despachos (
    id_detalle_despacho BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_despacho BIGINT NOT NULL REFERENCES ordenes_despacho(id_despacho) ON DELETE CASCADE,
    id_lote BIGINT REFERENCES lotes_campo(id_lote),
    producto VARCHAR(120) NOT NULL,
    presentacion VARCHAR(80),
    calibre VARCHAR(40),
    cajas INTEGER NOT NULL DEFAULT 0 CHECK (cajas >= 0),
    kg_despachados NUMERIC(12,2) NOT NULL CHECK (kg_despachados >= 0),
    toneladas_despachadas NUMERIC(12,4) GENERATED ALWAYS AS (kg_despachados / 1000.0) STORED,
    precio_unitario NUMERIC(12,4) CHECK (precio_unitario IS NULL OR precio_unitario >= 0),
    subtotal NUMERIC(14,2) CHECK (subtotal IS NULL OR subtotal >= 0)
);

CREATE INDEX IF NOT EXISTS idx_ordenes_despacho_cliente_fecha
    ON ordenes_despacho(id_cliente, fecha_despacho DESC);
CREATE INDEX IF NOT EXISTS idx_detalle_despachos_despacho
    ON detalle_despachos(id_despacho);

-- =========================================================
-- 4. FINANZAS: CENTROS DE COSTO Y PRESUPUESTOS
-- =========================================================

CREATE TABLE IF NOT EXISTS centros_costo (
    id_ceco BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    codigo VARCHAR(40) NOT NULL UNIQUE,
    nombre VARCHAR(140) NOT NULL,
    id_area BIGINT REFERENCES areas(id_area),
    activo BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS presupuestos_mensuales (
    id_presupuesto BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_ceco BIGINT NOT NULL REFERENCES centros_costo(id_ceco),
    anio SMALLINT NOT NULL CHECK (anio BETWEEN 2020 AND 2100),
    mes SMALLINT NOT NULL CHECK (mes BETWEEN 1 AND 12),
    moneda CHAR(3) NOT NULL DEFAULT 'PEN' CHECK (moneda IN ('PEN', 'USD', 'EUR')),
    monto_presupuestado NUMERIC(14,2) NOT NULL CHECK (monto_presupuestado >= 0),
    monto_ejecutado NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (monto_ejecutado >= 0),
    actualizado_por BIGINT REFERENCES usuarios(id_usuario) ON DELETE SET NULL,
    fecha_actualizacion TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (id_ceco, anio, mes, moneda)
);


