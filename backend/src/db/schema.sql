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
CREATE TYPE estado_prestamo AS ENUM ('PENDIENTE', 'ACTIVA', 'RECHAZADA', 'DEVUELTA', 'VENCIDO');
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
    profile_image TEXT, -- URL o Base64 de la imagen de perfil del usuario (HU-04)
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
-- 5. TABLA: prestamos (HU-12 a HU-15)
-- ------------------------------------------------------------------------------
CREATE TABLE prestamos (
    id SERIAL PRIMARY KEY,
    id_solicitud INT, -- Opcional / nullable para compatibilidad con esquemas anteriores
    objeto_id INT NOT NULL REFERENCES objetos(id) ON DELETE CASCADE,
    solicitante_id INT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    propietario_id INT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    fecha_inicio DATE NOT NULL DEFAULT CURRENT_DATE,
    fecha_fin DATE NOT NULL DEFAULT CURRENT_DATE,
    fecha_vencimiento DATE, -- Opcional / retrocompatibilidad con esquemas anteriores
    estado VARCHAR(30) DEFAULT 'PENDIENTE' NOT NULL, -- 'PENDIENTE', 'ACTIVA', 'RECHAZADA', 'DEVUELTA', 'VENCIDO'
    fecha_devolucion_real TIMESTAMPTZ,
    mensaje TEXT,
    creado_en TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    actualizado_en TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    
    CONSTRAINT chk_prestamo_estado CHECK (estado IN ('PENDIENTE', 'ACTIVA', 'RECHAZADA', 'DEVUELTA', 'VENCIDO')),
    CONSTRAINT chk_fechas_prestamo CHECK (fecha_fin >= fecha_inicio)
);

-- Índices préstamos
CREATE INDEX idx_prestamos_objeto ON prestamos(objeto_id);
CREATE INDEX idx_prestamos_solicitante ON prestamos(solicitante_id);
CREATE INDEX idx_prestamos_propietario ON prestamos(propietario_id);
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
-- 7. TABLA: calificaciones (HU-05)
-- ------------------------------------------------------------------------------
CREATE TABLE calificaciones (
    id SERIAL PRIMARY KEY,
    prestamo_id INT NOT NULL REFERENCES prestamos(id) ON DELETE CASCADE,
    evaluador_id INT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    evaluado_id INT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    id_usuario_calificador INT, -- Opcional / compatibilidad con esquemas anteriores
    id_usuario_calificado INT,  -- Opcional / compatibilidad con esquemas anteriores
    puntuacion SMALLINT NOT NULL CHECK (puntuacion >= 1 AND puntuacion <= 5),
    comentario TEXT,
    creado_en TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    
    CONSTRAINT uq_calificacion_prestamo_evaluador UNIQUE (prestamo_id, evaluador_id),
    CONSTRAINT chk_auto_calificacion CHECK (evaluador_id <> evaluado_id)
);

-- Índices calificaciones
CREATE INDEX idx_calificaciones_evaluado ON calificaciones(evaluado_id);
CREATE INDEX idx_calificaciones_evaluador ON calificaciones(evaluador_id);
CREATE INDEX idx_calificaciones_prestamo ON calificaciones(prestamo_id);

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
