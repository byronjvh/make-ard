export interface PrintCardMetadata {

    modelName: string | undefined;

    dimensions:
    | {
        x: number;
        y: number;
        z: number;
    }
    | undefined;

    layerHeight: number | undefined;

    printTime: number | undefined;

    filamentUsed:
    | {
        total: number;
        byColor: number[];
    }
    | undefined;


    material: string | undefined;

    nozzleDiameter: number | undefined;

    infill: number | undefined;

    supports: boolean | undefined;

    printer: string | undefined;
}


export function extractPrintCardMetadata(
    gcode: string,
    filename?: string
): PrintCardMetadata {

    const metadata: PrintCardMetadata = {

        modelName:
            filename
                ?.replace(/\.[^/.]+$/, "")
            || undefined,

        dimensions: undefined,

        layerHeight: undefined,

        printTime: undefined,

        filamentUsed: undefined,

        material: undefined,

        nozzleDiameter: undefined,

        infill: undefined,

        supports: undefined,

        printer: undefined
    };

    const lines = gcode.split(/\r?\n/);

    // =====================================================
    // HELPERS
    // =====================================================

    function findMatch(
        patterns: RegExp[]
    ): string | undefined {

        for (const line of lines) {

            for (const pattern of patterns) {

                const match = line.match(pattern);

                if (match?.[1] !== undefined) {
                    return match[1].trim();
                }
            }
        }

        return undefined;
    }


    function findNumber(
        patterns: RegExp[]
    ): number | undefined {

        const value = findMatch(patterns);

        if (!value) return undefined;

        const number = parseFloat(value);

        return Number.isFinite(number)
            ? number
            : undefined;
    }


    // =====================================================
    // LAYER HEIGHT
    // =====================================================

    metadata.layerHeight = findNumber([
        /;\s*layer[_ ]height\s*[:=]\s*([\d.]+)/i,
        /;\s*layer_height\s*=\s*([\d.]+)/i,
        /;\s*layer height\s*=\s*([\d.]+)/i
    ]);


    // =====================================================
    // NOZZLE
    // =====================================================

    metadata.nozzleDiameter = findNumber([
        /;\s*nozzle[_ ]diameter\s*[:=]\s*([\d.]+)/i,
        /;\s*nozzle_diameter\s*=\s*([\d.]+)/i,
        /;\s*nozzle diameter\s*=\s*([\d.]+)/i
    ]);


    // =====================================================
    // MATERIAL
    // =====================================================

    metadata.material = findMatch([
        /;\s*filament[_ ]type\s*[:=]\s*(.+)/i,
        /;\s*material\s*[:=]\s*(.+)/i,
        /;\s*filament\s*type\s*[:=]\s*(.+)/i
    ]);


    // =====================================================
    // PRINTER
    // =====================================================

    metadata.printer = findMatch([
        /;\s*printer[_ ]model\s*[:=]\s*(.+)/i,
        /;\s*printer[_ ]model[_ ]name\s*[:=]\s*(.+)/i,
        /;\s*printer\s*[:=]\s*(.+)/i,
        /;\s*machine\s*[:=]\s*(.+)/i
    ]);


    // =====================================================
    // INFILL
    // =====================================================

    metadata.infill = findNumber([
        /;\s*fill[_ ]density\s*[:=]\s*([\d.]+)/i,
        /;\s*infill[_ ]density\s*[:=]\s*([\d.]+)/i,
        /;\s*infill\s*[:=]\s*([\d.]+)/i
    ]);


    // =====================================================
    // FILAMENTO
    // =====================================================

    const filamentText = findMatch([
        /;\s*filament\s*used\s*\[g\]\s*=\s*(.+)/i,
        /;\s*filament[_ ]used\s*[:=]\s*(.+)/i,
        /;\s*filament[_ ]weight\s*[:=]\s*(.+)/i
    ]);

    if (filamentText !== undefined) {

        const values = filamentText
            .split(",")
            .map(value => parseFloat(value.trim()))
            .filter(value => Number.isFinite(value));

        if (values.length > 0) {

            metadata.filamentUsed = {
                total: values.reduce(
                    (sum, value) => sum + value,
                    0
                ),

                byColor: values
            };
        }
    }


    // =====================================================
    // TIEMPO
    // =====================================================

    const printTimeText = findMatch([
        /;\s*estimated\s+printing\s+time(?:\s*\([^)]*\))?\s*[:=]\s*(.+)/i,
        /;\s*print\s*time\s*[:=]\s*(.+)/i,
        /;\s*estimated\s*time\s*[:=]\s*(.+)/i
    ]);

    if (printTimeText !== undefined) {
        metadata.printTime = parsePrintTime(printTimeText);
    }


    // =====================================================
    // SOPORTES
    // =====================================================

    const supportText = findMatch([
        /;\s*support[_ ]material\s*[:=]\s*(.+)/i,
        /;\s*supports\s*[:=]\s*(.+)/i,
        /;\s*support[_ ]enabled\s*[:=]\s*(.+)/i
    ]);

    if (supportText !== undefined) {

        metadata.supports =
            /true|yes|on|1|enabled/i.test(
                supportText
            );
    }


    // =====================================================
    // DIMENSIONES
    // =====================================================

    metadata.dimensions =
        calculateDimensions(gcode);


    return metadata;
}

function parsePrintTime(
    value: string
): number | undefined {

    let seconds = 0;

    const hours = value.match(
        /(\d+(?:\.\d+)?)\s*h(?:ours?)?/i
    );

    const minutes = value.match(
        /(\d+(?:\.\d+)?)\s*m(?:in(?:ute)?s?)?/i
    );

    const secs = value.match(
        /(\d+(?:\.\d+)?)\s*s(?:ec(?:ond)?s?)?/i
    );

    if (hours) {
        seconds += parseFloat(hours[1]) * 3600;
    }

    if (minutes) {
        seconds += parseFloat(minutes[1]) * 60;
    }

    if (secs) {
        seconds += parseFloat(secs[1]);
    }

    return seconds > 0
        ? seconds
        : undefined;
}

function calculateDimensions(
    gcode: string
): PrintCardMetadata["dimensions"] {

    let minX = Infinity;
    let maxX = -Infinity;

    let minY = Infinity;
    let maxY = -Infinity;

    let minZ = Infinity;
    let maxZ = -Infinity;

    const lines = gcode.split(/\r?\n/);

    let x = 0;
    let y = 0;
    let z = 0;

    let absolutePositioning = true;

    for (const line of lines) {

        const clean = line
            .split(";")[0]
            .trim();

        if (!clean) continue;

        if (/^G90\b/i.test(clean)) {
            absolutePositioning = true;
            continue;
        }

        if (/^G91\b/i.test(clean)) {
            absolutePositioning = false;
            continue;
        }

        if (!/^G0?1\b/i.test(clean)) {
            continue;
        }

        const xMatch =
            clean.match(/\bX(-?\d+(?:\.\d+)?)/i);

        const yMatch =
            clean.match(/\bY(-?\d+(?:\.\d+)?)/i);

        const zMatch =
            clean.match(/\bZ(-?\d+(?:\.\d+)?)/i);

        if (xMatch) {

            const value = parseFloat(xMatch[1]);

            x = absolutePositioning
                ? value
                : x + value;
        }

        if (yMatch) {

            const value = parseFloat(yMatch[1]);

            y = absolutePositioning
                ? value
                : y + value;
        }

        if (zMatch) {

            const value = parseFloat(zMatch[1]);

            z = absolutePositioning
                ? value
                : z + value;
        }

        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);

        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);

        minZ = Math.min(minZ, z);
        maxZ = Math.max(maxZ, z);
    }

    if (
        !Number.isFinite(minX) ||
        !Number.isFinite(maxX) ||
        !Number.isFinite(minY) ||
        !Number.isFinite(maxY) ||
        !Number.isFinite(minZ) ||
        !Number.isFinite(maxZ)
    ) {
        return undefined;
    }

    return {
        x: Number((maxX - minX).toFixed(2)),
        y: Number((maxY - minY).toFixed(2)),
        z: Number((maxZ - minZ).toFixed(2))
    };
}