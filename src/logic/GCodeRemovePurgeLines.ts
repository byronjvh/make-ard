import { parseNumber } from "./GCodeMovParser"

export function removePurgeLines(
    gcode: string,
    options: PurgeOptions = {},
): PurgeResult {
    const {
        minLength = 30,
        minExtrusion = 0.5,
        maxZ = 0.6,
        minIsolation = 8,
        maxInitialLines = 5000,
        minScore = 65,
    } = options;

    const lines = gcode.split(/\r?\n/);

    const moves: GCodeMove[] = [];

    // ============================================
    // ESTADO DEL G-CODE
    // ============================================

    let x = 0;
    let y = 0;
    let z = 0;
    let e = 0;

    let absoluteXYZ = true;
    let absoluteE = true;

    // ============================================
    // PARSEAR MOVIMIENTOS
    // ============================================

    for (
        let lineIndex = 0;
        lineIndex < lines.length;
        lineIndex++
    ) {
        const originalLine = lines[lineIndex];

        const cleanLine = originalLine
            .split(";")[0]
            .trim();

        if (!cleanLine) continue;

        const command = cleanLine
            .split(/\s+/)[0]
            .toUpperCase();

        // ----------------------------------------
        // POSICIONAMIENTO
        // ----------------------------------------

        if (command === "G90") {
            absoluteXYZ = true;
            continue;
        }

        if (command === "G91") {
            absoluteXYZ = false;
            continue;
        }

        // ----------------------------------------
        // EXTRUSOR
        // ----------------------------------------

        if (command === "M82") {
            absoluteE = true;
            continue;
        }

        if (command === "M83") {
            absoluteE = false;
            continue;
        }

        // ----------------------------------------
        // RESET DE EXTRUSOR
        // ----------------------------------------

        if (command === "G92") {
            const newX = parseNumber(cleanLine, "X");
            const newY = parseNumber(cleanLine, "Y");
            const newZ = parseNumber(cleanLine, "Z");
            const newE = parseNumber(cleanLine, "E");

            if (newX !== null) x = newX;
            if (newY !== null) y = newY;
            if (newZ !== null) z = newZ;
            if (newE !== null) e = newE;

            continue;
        }

        // ----------------------------------------
        // MOVIMIENTO
        // ----------------------------------------

        if (
            command !== "G0" &&
            command !== "G1"
        ) {
            continue;
        }

        const previousX = x;
        const previousY = y;
        const previousZ = z;

        const newX = parseNumber(cleanLine, "X");
        const newY = parseNumber(cleanLine, "Y");
        const newZ = parseNumber(cleanLine, "Z");
        const newE = parseNumber(cleanLine, "E");

        if (newX !== null) {
            x = absoluteXYZ
                ? newX
                : x + newX;
        }

        if (newY !== null) {
            y = absoluteXYZ
                ? newY
                : y + newY;
        }

        if (newZ !== null) {
            z = absoluteXYZ
                ? newZ
                : z + newZ;
        }

        let extrusion = 0;

        if (newE !== null) {
            if (absoluteE) {
                extrusion = newE - e;
                e = newE;
            } else {
                extrusion = newE;
                e += newE;
            }
        }

        const dx = x - previousX;
        const dy = y - previousY;

        const distance = Math.sqrt(
            dx * dx +
            dy * dy,
        );

        const isExtrusion =
            extrusion > minExtrusion &&
            distance > 0;

        moves.push({
            lineIndex,

            command,
            originalLine,

            x,
            y,
            z,

            previousX,
            previousY,
            previousZ,

            e,
            extrusion,

            distance,

            isExtrusion,
        });

        // ========================================
        // NO NECESITAMOS ANALIZAR TODO EL GCODE
        // ========================================

        if (lineIndex > maxInitialLines) {
            break;
        }
    }

    // ============================================
    // EXTRUSIONES
    // ============================================

    const extrusionMoves = moves.filter(
        (move) => move.isExtrusion,
    );

    if (!extrusionMoves.length) {
        return {
            gcode,
            removed: false,
            removedLines: [],
            candidates: [],
        };
    }

    // ============================================
    // PRIMERA EXTRUSIÓN REAL
    // ============================================

    const firstExtrusionIndex =
        extrusionMoves[0].lineIndex;

    // ============================================
    // CANDIDATOS
    // ============================================

    const candidates: PurgeCandidate[] = [];

    for (
        let i = 0;
        i < extrusionMoves.length;
        i++
    ) {
        const move = extrusionMoves[i];

        // ----------------------------------------
        // PURGAS OCURREN AL PRINCIPIO
        // ----------------------------------------

        const linesFromStart =
            move.lineIndex -
            firstExtrusionIndex;

        if (linesFromStart > 1500) {
            break;
        }

        // ----------------------------------------
        // DEBE ESTAR CERCA DE LA PRIMERA CAPA
        // ----------------------------------------

        if (move.z > maxZ) {
            continue;
        }

        // ----------------------------------------
        // MOVIMIENTO LARGO
        // ----------------------------------------

        if (move.distance < minLength) {
            continue;
        }

        // ----------------------------------------
        // RELACIÓN EXTRUSIÓN / DISTANCIA
        // ----------------------------------------

        const extrusionPerMm =
            move.extrusion /
            move.distance;

        // Evitamos movimientos extremadamente pequeños
        if (extrusionPerMm <= 0) {
            continue;
        }

        // ----------------------------------------
        // DISTANCIA AL RESTO DE EXTRUSIONES
        // ----------------------------------------

        let nearestDistance = Infinity;

        for (
            let j = 0;
            j < extrusionMoves.length;
            j++
        ) {
            if (i === j) continue;

            const other = extrusionMoves[j];

            const dx =
                move.x - other.x;

            const dy =
                move.y - other.y;

            const distance = Math.sqrt(
                dx * dx +
                dy * dy,
            );

            if (
                distance <
                nearestDistance
            ) {
                nearestDistance = distance;
            }
        }

        // ========================================
        // SCORE
        // ========================================

        let score = 0;

        // Extrusión positiva
        score += 10;

        // Movimiento largo
        if (move.distance >= 50) {
            score += 20;
        } else if (move.distance >= 30) {
            score += 10;
        }

        // Muy temprano
        if (linesFromStart < 100) {
            score += 20;
        } else if (linesFromStart < 300) {
            score += 10;
        }

        // Primera capa
        if (move.z <= 0.4) {
            score += 15;
        }

        // Bien aislada
        if (
            nearestDistance >=
            minIsolation
        ) {
            score += 20;
        }

        // Muy aislada
        if (
            nearestDistance >= 20
        ) {
            score += 10;
        }

        if (score < minScore) {
            continue;
        }

        candidates.push({
            startLine:
                move.lineIndex,

            endLine:
                move.lineIndex,

            distance:
                move.distance,

            extrusion:
                move.extrusion,

            startX:
                move.previousX,

            startY:
                move.previousY,

            endX:
                move.x,

            endY:
                move.y,

            z:
                move.z,

            score,
        });
    }

    // ============================================
    // SI NO HAY CANDIDATOS
    // ============================================

    if (!candidates.length) {
        return {
            gcode,
            removed: false,
            removedLines: [],
            candidates: [],
        };
    }

    // ============================================
    // ORDENAR
    // ============================================

    candidates.sort(
        (a, b) =>
            a.startLine -
            b.startLine,
    );

    // ============================================
    // ELIMINAR MOVIMIENTOS
    // ============================================

    const removedLines = new Set<number>();

    for (const candidate of candidates) {
        removedLines.add(
            candidate.startLine,
        );
    }

    // ============================================
    // RECONSTRUIR G-CODE
    // ============================================

    const output: string[] = [];

    let lastRemovedLine = -1;

    for (
        let i = 0;
        i < lines.length;
        i++
    ) {
        if (
            removedLines.has(i)
        ) {
            lastRemovedLine = i;

            continue;
        }

        // ----------------------------------------
        // AL TERMINAR UNA PURGA
        // ----------------------------------------

        if (
            lastRemovedLine ===
            i - 1
        ) {
            const move =
                moves.find(
                    (m) =>
                        m.lineIndex ===
                        lastRemovedLine,
                );

            if (move) {
                output.push(
                    `G92 E${move.e}`,
                );
            }
        }

        output.push(lines[i]);
    }

    return {
        gcode:
            output.join("\n"),

        removed:
            removedLines.size > 0,

        removedLines:
            [...removedLines],

        candidates,
    };
}