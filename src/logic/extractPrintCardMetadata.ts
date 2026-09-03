import type { GCodeBounds } from "./GCodeRemovePurgeLines";

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
    filename?: string,
    bounds?: GCodeBounds | null
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

    if (metadata.printer) {
        metadata.printer = metadata.printer
            .split("@")[0]
            .trim();
    }


    // =====================================================
    // INFILL
    // =====================================================

    metadata.infill = findNumber([
        /;\s*sparse_infill_density\s*[:=]\s*([\d.]+)%?/i,
        /;\s*fill_density\s*[:=]\s*([\d.]+)%?/i,
        /;\s*infill_density\s*[:=]\s*([\d.]+)%?/i,
        /;\s*infill\s*[:=]\s*([\d.]+)%?/i,

        /;\s*\*fill[\_ ]density\s*[:=]\s*([\d.]+)%?/i,
        /;\s*\*infill[\_ ]density\s*[:=]\s*([\d.]+)%?/i,
    ]);


    // =====================================================
    // FILAMENTO
    // =====================================================



    const filamentText = findMatch([
        /;\s*filament[\_ ]used\s*[:=]\s*(.+)/i,
        /;\s*filament[\_ ]weight\s*[:=]\s*(.+)/i
    ]);

    const filamentDensity = findNumber([
        /;\s*filament[\_ ]density\s*[:=]\s*([\d.]+)/i
    ]);

    const filamentDiameter = findNumber([
        /;\s*filament[\_ ]diameter\s*[:=]\s*([\d.]+)/i
    ]);

    if (filamentText !== undefined) {
        const values = filamentText
            .split(",")
            .map(value => {
                const match = value.trim().match(
                    /([\d.]+)\s*(kg|g|mg|m|mm)?/i
                );

                if (!match) return undefined;

                const amount = parseFloat(match[1]);
                const unit = match[2]?.toLowerCase() || "g";

                if (!Number.isFinite(amount)) return undefined;

                // Ya está expresado en gramos
                if (unit === "g") {
                    return amount;
                }

                // Kilogramos → gramos
                if (unit === "kg") {
                    return amount * 1000;
                }

                // Miligramos → gramos
                if (unit === "mg") {
                    return amount / 1000;
                }

                // Metros → gramos
                if (
                    unit === "m" &&
                    filamentDensity !== undefined &&
                    filamentDiameter !== undefined
                ) {
                    return filamentLengthToGrams(
                        amount,
                        filamentDiameter,
                        filamentDensity
                    );
                }

                return undefined;
            })
            .filter(
                (value): value is number =>
                    value !== undefined && Number.isFinite(value)
            );

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
        /;\s*\*support[\_ ]material\s*[:=]\s*(.+)/i,
        /;\s*\*supports\s*[:=]\s*(.+)/i,
        /;\s*\*support[\_ ]enabled\s*[:=]\s*(.+)/i,
    ]);

    if (supportText !== undefined) {

        metadata.supports =
            /true|yes|on|1|enabled/i.test(supportText);

    } else {

        const hasSupportType = lines.some(line =>
            /;\s*TYPE:\s*(SUPPORT|SUPPORT[-_ ]INTERFACE)\b/i.test(line)
        );

        if (hasSupportType) {
            metadata.supports = true;
        }
    }


    // =====================================================
    // DIMENSIONES
    // =====================================================

    metadata.dimensions = bounds
        ? {
            x: bounds.sizeX,
            y: bounds.sizeY,
            z: bounds.sizeZ,
        }
        : undefined;

    return metadata;
}

function filamentLengthToGrams(
    lengthMeters: number,
    diameterMm: number,
    density: number
): number {
    const lengthMm = lengthMeters * 1000;
    const radiusMm = diameterMm / 2;

    const volumeMm3 =
        lengthMm * Math.PI * radiusMm * radiusMm;

    const volumeCm3 = volumeMm3 / 1000;

    return volumeCm3 * density;
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