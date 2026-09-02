import type { GCodeMove, PurgeCandidate, PurgeOptions, PurgeResult } from "./gcode";
import { parseNumber } from "./GCodeMovParser"

export interface GCodeBounds {
    minX: number;
    minY: number;
    minZ: number;
    maxX: number;
    maxY: number;
    maxZ: number;
    sizeX: number;
    sizeY: number;
    sizeZ: number;
    centerX: number;
    centerY: number;
    centerZ: number;
}

export function removePurgeLines(
    gcode: string,
    options: PurgeOptions = {},
): PurgeResult {
    const {
        minLength = 30,
        minExtrusion = 0.5,
        maxZ = 0.6,
        minIsolation = 8,
        minScore = 65,
    } = options;

    const lines = gcode.split(/\r?\n/);

    // Algunos slicers, especialmente PrusaSlicer/EasyPrint,
    // separan claramente el start G-code de la purga con ;LAYER:0.
    const firstLayerIndex = lines.findIndex(
        (line) => /^;\s*LAYER:0\b/i.test(line.trim()),
    );

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

        if (command !== "G0" && command !== "G1") {
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

        const hasExtrusion =
            extrusion > 0 &&
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
            hasExtrusion,
        });
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
            bounds: null
        };
    }

    // ============================================
    // CANDIDATOS
    // ============================================

    const candidates: PurgeCandidate[] = [];

    // ============================================
    // ESTRATEGIA 1: PURGA PRE-LAYER
    // ============================================
    //
    // Si existe ;LAYER:0, todo movimiento que:
    //   - extruya,
    //   - ocurra antes de ;LAYER:0
    //
    // pertenece al proceso de purga/cebado del start
    // G-code en los slicers que utilizan este formato.
    //
    // Esto evita depender de la distancia al modelo.
    // Es importante porque una purga puede estar muy
    // cerca del modelo, como ocurre en algunos G-code.

    const preLayerPurgeMoves = extrusionMoves.filter(
        (move) =>
            firstLayerIndex !== -1 &&
            move.lineIndex < firstLayerIndex,
    );

    if (preLayerPurgeMoves.length) {
        for (const move of preLayerPurgeMoves) {
            candidates.push({
                startLine: move.lineIndex,
                endLine: move.lineIndex,
                distance: move.distance,
                extrusion: move.extrusion,
                startX: move.previousX,
                startY: move.previousY,
                endX: move.x,
                endY: move.y,
                z: move.z,
                score: 100,
            });
        }
    } else {
        // ========================================
        // ESTRATEGIA 2: FALLBACK
        // ========================================
        //
        // Para G-code que no tiene ;LAYER:0,
        // conservamos el detector original basado
        // en longitud, altura, aislamiento y posición.

        const firstExtrusionIndex =
            extrusionMoves[0].lineIndex;

        for (
            let i = 0;
            i < extrusionMoves.length;
            i++
        ) {
            const move = extrusionMoves[i];

            const linesFromStart =
                move.lineIndex -
                firstExtrusionIndex;

            if (linesFromStart > 1500) {
                break;
            }

            if (move.z > maxZ) {
                continue;
            }

            if (move.distance < minLength) {
                continue;
            }

            const extrusionPerMm =
                move.extrusion /
                move.distance;

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

            // ----------------------------------------
            // SCORE
            // ----------------------------------------

            let score = 0;

            score += 10;

            if (move.distance >= 50) {
                score += 20;
            } else if (move.distance >= 30) {
                score += 10;
            }

            if (linesFromStart < 100) {
                score += 20;
            } else if (linesFromStart < 300) {
                score += 10;
            }

            if (move.z <= 0.4) {
                score += 15;
            }

            if (nearestDistance >= minIsolation) {
                score += 20;
            }

            if (nearestDistance >= 20) {
                score += 10;
            }

            if (score < minScore) {
                continue;
            }

            candidates.push({
                startLine: move.lineIndex,
                endLine: move.lineIndex,
                distance: move.distance,
                extrusion: move.extrusion,
                startX: move.previousX,
                startY: move.previousY,
                endX: move.x,
                endY: move.y,
                z: move.z,
                score,
            });
        }
    }

    // ============================================
    // SI NO HAY CANDIDATOS
    // ============================================

    // No hacer return.
    // Aunque no haya purga, debemos continuar
    // para calcular los bounds del modelo.

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

    const preLayerCandidates = candidates.filter(
        (candidate) =>
            firstLayerIndex !== -1 &&
            candidate.startLine < firstLayerIndex
    );

    if (preLayerCandidates.length > 0) {
        const purgeStart = preLayerCandidates[0].startLine;
        const purgeEnd =
            preLayerCandidates[preLayerCandidates.length - 1].startLine;

        for (let i = purgeStart; i <= purgeEnd; i++) {
            const line = lines[i];
            const cleanLine = line.split(";")[0].trim();

            if (/^(G0|G1)\b/i.test(cleanLine)) {
                removedLines.add(i);
            }
        }
    } else {
        for (const candidate of candidates) {
            removedLines.add(candidate.startLine);
        }
    }

    const modelMoves = moves.filter(
        move =>
            move.hasExtrusion &&
            !removedLines.has(move.lineIndex)
    );

    let boundsMinX = Infinity;
    let boundsMinY = Infinity;
    let boundsMinZ = Infinity;

    let boundsMaxX = -Infinity;
    let boundsMaxY = -Infinity;
    let boundsMaxZ = -Infinity;

    for (const move of modelMoves) {
        boundsMinX = Math.min(
            boundsMinX,
            move.previousX,
            move.x
        );

        boundsMinY = Math.min(
            boundsMinY,
            move.previousY,
            move.y
        );

        boundsMinZ = Math.min(
            boundsMinZ,
            move.previousZ,
            move.z
        );

        boundsMaxX = Math.max(
            boundsMaxX,
            move.previousX,
            move.x
        );

        boundsMaxY = Math.max(
            boundsMaxY,
            move.previousY,
            move.y
        );

        boundsMaxZ = Math.max(
            boundsMaxZ,
            move.previousZ,
            move.z
        );
    }

    const bounds: GCodeBounds | null =
        Number.isFinite(boundsMinX) &&
            Number.isFinite(boundsMinY) &&
            Number.isFinite(boundsMinZ)
            ? {
                minX: boundsMinX,
                minY: boundsMinY,
                minZ: boundsMinZ,

                maxX: boundsMaxX,
                maxY: boundsMaxY,
                maxZ: boundsMaxZ,

                sizeX: boundsMaxX - boundsMinX,
                sizeY: boundsMaxY - boundsMinY,
                sizeZ: boundsMaxZ - boundsMinZ,

                centerX:
                    (boundsMinX + boundsMaxX) / 2,

                centerY:
                    (boundsMinY + boundsMaxY) / 2,

                centerZ:
                    (boundsMinZ + boundsMaxZ) / 2,
            }
            : null;

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
        if (removedLines.has(i)) {
            lastRemovedLine = i;
            continue;
        }

        // ----------------------------------------
        // AL TERMINAR UNA PURGA
        // ----------------------------------------
        //
        // Si ya existe un G92 E después de la purga,
        // no añadimos otro.
        //
        // Si no existe, reseteamos el extrusor a 0.
        // Esto evita que las extrusiones eliminadas
        // alteren el estado del parser del modelo.

        if (lastRemovedLine === i - 1) {
            const hasFollowingG92E = lines
                .slice(i, firstLayerIndex !== -1
                    ? firstLayerIndex
                    : Math.min(i + 20, lines.length))
                .some((line) =>
                    /^\s*G92\b.*\bE[-+]?(?:\d*\.?\d+)/i.test(
                        line.split(";")[0],
                    ),
                );

            if (!hasFollowingG92E) {
                output.push("G92 E0");
            }
        }

        output.push(lines[i]);
    }

    return {
        gcode: output.join("\n"),
        removed: removedLines.size > 0,
        removedLines: [...removedLines],
        candidates,
        bounds
    };
}
