-- Source of truth for the SQLite schema. Idempotent: applied on every backend startup.

CREATE TABLE IF NOT EXISTS tareas (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    descripcion         VARCHAR(500) NOT NULL,
    fecha_prevista      DATE         NOT NULL,
    estado              VARCHAR(20)  NOT NULL DEFAULT 'pendiente'
        CHECK (estado IN ('pendiente', 'iniciada', 'completado')),
    responsable         VARCHAR(20)  NOT NULL
        CHECK (responsable IN ('Nacho', 'Gonzalo', 'María', 'Papá', 'Mamá')),
    notas               TEXT,
    orden               INTEGER      NOT NULL DEFAULT 0,
    fecha_creacion      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_tareas_fecha_prevista ON tareas(fecha_prevista);
CREATE INDEX IF NOT EXISTS idx_tareas_estado        ON tareas(estado);
CREATE INDEX IF NOT EXISTS idx_tareas_responsable   ON tareas(responsable);
-- idx_tareas_estado_orden is created from the in-place migration in
-- backend/app/database.py so it works on both fresh installs and DBs
-- created before the `orden` column existed.
