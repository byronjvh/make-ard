export function getGCodeBounds(gcode: string) {
    let x = 0;
    let y = 0;
    let z = 0;

    let minX = Infinity;
    let minY = Infinity;
    let minZ = Infinity;

    let maxX = -Infinity;
    let maxY = -Infinity;
    let maxZ = -Infinity;

    const lines = gcode.split(/\r?\n/);

    for (const rawLine of lines) {
        // Quitar comentarios
        const line = rawLine.split(";")[0].trim();

        if (!line) continue;

        const command = line.toUpperCase();

        // Solo nos interesan movimientos
        if (!command.startsWith("G0") && !command.startsWith("G1")) {
            continue;
        }

        const xMatch = command.match(/\bX(-?\d*\.?\d+)/);

        const yMatch = command.match(/\bY(-?\d*\.?\d+)/);

        const zMatch = command.match(/\bZ(-?\d*\.?\d+)/);

        if (xMatch) {
            x = Number(xMatch[1]);
        }

        if (yMatch) {
            y = Number(yMatch[1]);
        }

        if (zMatch) {
            z = Number(zMatch[1]);
        }

        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        minZ = Math.min(minZ, z);

        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
        maxZ = Math.max(maxZ, z);
    }

    if (
        !Number.isFinite(minX) ||
        !Number.isFinite(minY) ||
        !Number.isFinite(minZ)
    ) {
        return null;
    }

    return {
        minX,
        minY,
        minZ,

        maxX,
        maxY,
        maxZ,

        sizeX: maxX - minX,
        sizeY: maxY - minY,
        sizeZ: maxZ - minZ,

        centerX: (minX + maxX) / 2,
        centerY: (minY + maxY) / 2,
        centerZ: (minZ + maxZ) / 2,
    };

}