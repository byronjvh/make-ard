interface GCodeMove {
    lineIndex: number;

    command: string;
    originalLine: string;

    x: number;
    y: number;
    z: number;

    previousX: number;
    previousY: number;
    previousZ: number;

    e: number;
    extrusion: number;

    distance: number;

    isExtrusion: boolean;
}

interface PurgeCandidate {
    startLine: number;
    endLine: number;

    distance: number;
    extrusion: number;

    startX: number;
    startY: number;

    endX: number;
    endY: number;

    z: number;

    score: number;
}

interface PurgeOptions {
    // Movimiento mínimo para considerar una posible purga
    minLength?: number;

    // Extrusión mínima
    minExtrusion?: number;

    // Z máxima para considerar que está en la zona inicial
    maxZ?: number;

    // Distancia mínima respecto a otra extrusión
    minIsolation?: number;

    // Número máximo de movimientos que podemos analizar
    maxInitialLines?: number;

    // Score mínimo para eliminar
    minScore?: number;
}

interface PurgeResult {
    gcode: string;

    removed: boolean;

    removedLines: number[];

    candidates: PurgeCandidate[];
}