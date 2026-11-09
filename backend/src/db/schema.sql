-- ==============================================================================
-- UNISHARE - ESQUEMA DE BASE DE DATOS (PostgreSQL)
-- Plataforma móvil colaborativa para préstamo e intercambio universitario
-- ==============================================================================

-- Extensión para generación de UUIDs (opcional/recomendado)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ------------------------------------------------------------------------------
-- 1. TIPOS ENUMERADOS (DOMINIOS CONTROLADOS)
-- ------------------------------------------------------------------------------
CREATE TYPE rol_usuario AS ENUM ('estudiante', 'docente', 'administrativo', 'administrador');
CREATE TYPE estado_cuenta AS ENUM ('activo', 'suspendido', 'pendiente_verificacion', 'inactivo');
CREATE TYPE categoria_objeto AS ENUM ('libros_academico', 'herramientas', 'electronica_gadgets', 'laboratorio', 'deportes_recreacion', 'papeleria', 'otros');
CREATE TYPE tipo_disponibilidad AS ENUM ('prestamo', 'trueque', 'ambos');
CREATE TYPE estado_objeto AS ENUM ('disponible', 'en_prestamo', 'intercambiado', 'reservado', 'inactivo');
CREATE TYPE tipo_solicitud AS ENUM ('prestamo', 'trueque');
CREATE TYPE estado_solicitud AS ENUM ('pendiente', 'aceptada', 'rechazada', 'cancelada');
CREATE TYPE estado_prestamo AS ENUM ('activo', 'devuelto', 'atrasado', 'en_disputa');
CREATE TYPE estado_trueque AS ENUM ('acordado', 'completado', 'cancelado', 'en_disputa');
CREATE TYPE tipo_elemento_reporte AS ENUM ('usuario', 'objeto', 'solicitud', 'comentario');
CREATE TYPE estado_reporte AS ENUM ('pendiente', 'en_revision', 'resuelto', 'descartado');

-- ------------------------------------------------------------------------------
-- 2. TABLA: usuarios
-- ------------------------------------------------------------------------------
CREATE TABLE usuarios (
    id SERIAL PRIMARY KEY,
    uid_auth VARCHAR(128) UNIQUE DEFAULT uuid_generate_v4()::text, -- Identificador único complementario
    nombre VARCHAR(120) NOT NULL,
    correo VARCHAR(150) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL, -- Hash seguro con bcrypt
    foto_perfil VARCHAR(500),
    ubicacion_general VARCHAR(150) NOT NULL, -- ej. Campus Central, Facultad de Ingeniería
    reputacion NUMERIC(3,2) DEFAULT 5.00 CHECK (reputacion >= 1.00 AND reputacion <= 5.00),
    rol rol_usuario DEFAULT 'estudiante' NOT NULL,
    estado_cuenta estado_cuenta DEFAULT 'activo' NOT NULL,
    fecha_registro TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Índices usuarios
CREATE INDEX idx_usuarios_correo ON usuarios(correo);
CREATE INDEX idx_usuarios_uid_auth ON usuarios(uid_auth);

-- ------------------------------------------------------------------------------
-- 3. TABLA: objetos
-- ------------------------------------------------------------------------------
CREATE TABLE objetos (
    id SERIAL PRIMARY KEY,
    id_usuario INT NOT NULL,
    nombre VARCHAR(150) NOT NULL,
    descripcion TEXT NOT NULL,
    categoria categoria_objeto NOT NULL,
    tipo_disponibilidad tipo_disponibilidad NOT NULL,
    ubicacion VARCHAR(150) NOT NULL, -- ej. Casillero Fac. Ciencias / Biblioteca
    imagenes TEXT[] DEFAULT '{}', -- Array con URLs de imágenes
    estado estado_objeto DEFAULT 'disponible' NOT NULL,
    fecha_publicacion TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    
    CONSTRAINT fk_objeto_usuario FOREIGN KEY (id_usuario) 
        REFERENCES usuarios(id) ON DELETE CASCADE
);

-- Índices objetos
CREATE INDEX idx_objetos_usuario ON objetos(id_usuario);
CREATE INDEX idx_objetos_categoria ON objetos(categoria);
CREATE INDEX idx_objetos_estado ON objetos(estado);

-- ------------------------------------------------------------------------------
-- 4. TABLA: solicitudes
-- ------------------------------------------------------------------------------
CREATE TABLE solicitudes (
    id SERIAL PRIMARY KEY,
    id_objeto INT NOT NULL,
    id_solicitante INT NOT NULL,
    tipo_solicitud tipo_solicitud NOT NULL,
    mensaje TEXT,
    fecha_solicitud TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    estado estado_solicitud DEFAULT 'pendiente' NOT NULL,
    
    CONSTRAINT fk_solicitud_objeto FOREIGN KEY (id_objeto) 
        REFERENCES objetos(id) ON DELETE RESTRICT,
    CONSTRAINT fk_solicitud_solicitante FOREIGN KEY (id_solicitante) 
        REFERENCES usuarios(id) ON DELETE CASCADE
);

-- Índices solicitudes
CREATE INDEX idx_solicitudes_objeto ON solicitudes(id_objeto);
CREATE INDEX idx_solicitudes_solicitante ON solicitudes(id_solicitante);
CREATE INDEX idx_solicitudes_estado ON solicitudes(estado);

-- ------------------------------------------------------------------------------
-- 5. TABLA: prestamos
-- ------------------------------------------------------------------------------
CREATE TABLE prestamos (
    id SERIAL PRIMARY KEY,
    id_solicitud INT UNIQUE NOT NULL, -- Una solicitud aprobada deriva en exactamente un préstamo
    fecha_inicio TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    fecha_vencimiento TIMESTAMPTZ NOT NULL,
    fecha_devolucion TIMESTAMPTZ,
    estado estado_prestamo DEFAULT 'activo' NOT NULL,
    
    CONSTRAINT fk_prestamo_solicitud FOREIGN KEY (id_solicitud) 
        REFERENCES solicitudes(id) ON DELETE RESTRICT,
    CONSTRAINT chk_fechas_prestamo CHECK (fecha_vencimiento >= fecha_inicio),
    CONSTRAINT chk_devolucion_valida CHECK (fecha_devolucion IS NULL OR fecha_devolucion >= fecha_inicio)
);

-- Índices préstamos
CREATE INDEX idx_prestamos_solicitud ON prestamos(id_solicitud);
CREATE INDEX idx_prestamos_estado ON prestamos(estado);

-- ------------------------------------------------------------------------------
-- 6. TABLA: trueques
-- ------------------------------------------------------------------------------
CREATE TABLE trueques (
    id SERIAL PRIMARY KEY,
    id_solicitud INT UNIQUE NOT NULL, -- Una solicitud aprobada deriva en exactamente un trueque
    id_objeto_ofrecido INT NOT NULL, -- Objeto entregado a cambio por el solicitante
    fecha_trueque TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    punto_encuentro VARCHAR(200) NOT NULL, -- ej. Cafetería Edificio A
    estado estado_trueque DEFAULT 'acordado' NOT NULL,
    
    CONSTRAINT fk_trueque_solicitud FOREIGN KEY (id_solicitud) 
        REFERENCES solicitudes(id) ON DELETE RESTRICT,
    CONSTRAINT fk_trueque_objeto_ofrecido FOREIGN KEY (id_objeto_ofrecido) 
        REFERENCES objetos(id) ON DELETE RESTRICT
);

-- Índices trueques
CREATE INDEX idx_trueques_solicitud ON trueques(id_solicitud);
CREATE INDEX idx_trueques_objeto_ofrecido ON trueques(id_objeto_ofrecido);

-- ------------------------------------------------------------------------------
-- 7. TABLA: calificaciones
-- ------------------------------------------------------------------------------
CREATE TABLE calificaciones (
    id SERIAL PRIMARY KEY,
    id_usuario_calificador INT NOT NULL,
    id_usuario_calificado INT NOT NULL,
    id_prestamo INT,
    id_trueque INT,
    puntuacion SMALLINT NOT NULL CHECK (puntuacion >= 1 AND puntuacion <= 5),
    comentario TEXT,
    fecha_creacion TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    
    CONSTRAINT fk_calif_calificador FOREIGN KEY (id_usuario_calificador) 
        REFERENCES usuarios(id) ON DELETE CASCADE,
    CONSTRAINT fk_calif_calificado FOREIGN KEY (id_usuario_calificado) 
        REFERENCES usuarios(id) ON DELETE CASCADE,
    CONSTRAINT fk_calif_prestamo FOREIGN KEY (id_prestamo) 
        REFERENCES prestamos(id) ON DELETE SET NULL,
    CONSTRAINT fk_calif_trueque FOREIGN KEY (id_trueque) 
        REFERENCES trueques(id) ON DELETE SET NULL,
    CONSTRAINT chk_auto_calificacion CHECK (id_usuario_calificador <> id_usuario_calificado),
    -- Regla de integridad: debe relacionarse o bien con un préstamo o con un trueque
    CONSTRAINT chk_origen_transaccion CHECK (
        (id_prestamo IS NOT NULL AND id_trueque IS NULL) OR 
        (id_prestamo IS NULL AND id_trueque IS NOT NULL)
    )
);

-- Índices calificaciones
CREATE INDEX idx_calificaciones_calificado ON calificaciones(id_usuario_calificado);
CREATE INDEX idx_calificaciones_prestamo ON calificaciones(id_prestamo);
CREATE INDEX idx_calificaciones_trueque ON calificaciones(id_trueque);

-- ------------------------------------------------------------------------------
-- 8. TABLA: notificaciones
-- ------------------------------------------------------------------------------
CREATE TABLE notificaciones (
    id SERIAL PRIMARY KEY,
    id_usuario INT NOT NULL,
    tipo VARCHAR(50) NOT NULL, -- ej. 'NUEVA_SOLICITUD', 'SOLICITUD_ACEPTADA', 'RECORDATORIO_DEVOLUCION'
    mensaje TEXT NOT NULL,
    id_transaccion INT, -- ID referencial opcional hacia solicitud/préstamo/trueque
    estado_lectura BOOLEAN DEFAULT FALSE NOT NULL,
    fecha_creacion TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    
    CONSTRAINT fk_notificacion_usuario FOREIGN KEY (id_usuario) 
        REFERENCES usuarios(id) ON DELETE CASCADE
);

-- Índices notificaciones
CREATE INDEX idx_notificaciones_usuario ON notificaciones(id_usuario);
CREATE INDEX idx_notificaciones_leido ON notificaciones(id_usuario, estado_lectura);

-- ------------------------------------------------------------------------------
-- 9. TABLA: reportes
-- ------------------------------------------------------------------------------
CREATE TABLE reportes (
    id SERIAL PRIMARY KEY,
    id_usuario_reportante INT NOT NULL,
    tipo_elemento tipo_elemento_reporte NOT NULL,
    id_elemento_reportado INT NOT NULL,
    motivo VARCHAR(150) NOT NULL,
    descripcion TEXT,
    estado estado_reporte DEFAULT 'pendiente' NOT NULL,
    fecha_creacion TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    
    CONSTRAINT fk_reporte_usuario FOREIGN KEY (id_usuario_reportante) 
        REFERENCES usuarios(id) ON DELETE CASCADE
);

-- Índices reportes
CREATE INDEX idx_reportes_estado ON reportes(estado);
CREATE INDEX idx_reportes_reportante ON reportes(id_usuario_reportante);
