import type { PrintCardMetadata } from "./extractPrintCardMetadata";

export interface FormattedPrintCardMetadata {
    modelName: string | undefined;
    dimensions: string | undefined;
    layerHeight: string | undefined;
    printTime: string | undefined;
    filamentUsed: string | undefined;
    material: string | undefined;
    nozzleDiameter: string | undefined;
    infill: string | undefined;
    supports: string | undefined;
    printer: string | undefined;
}

export function formatMetadata(
    metadata: PrintCardMetadata
): FormattedPrintCardMetadata {

    // Dimensiones redondeadas hacia arriba
    const dimensions = metadata.dimensions
        ? `${Math.ceil(metadata.dimensions.x)}×` +
        `${Math.ceil(metadata.dimensions.y)}×` +
        `${Math.ceil(metadata.dimensions.z)} mm`
        : undefined;

    // Materiales únicos, manteniendo el orden original
    const material = metadata.material
        ? [...new Set(
            metadata.material
                .split(/[:;,]/)
                .map(material => material.trim())
                .filter(Boolean)
        )].join(", ")
        : undefined;

    // Altura de capa
    const layerHeight = metadata.layerHeight !== undefined
        ? `${metadata.layerHeight} mm`
        : undefined;

    // Tiempo de impresión
    const printTime = metadata.printTime !== undefined
        ? formatPrintTime(metadata.printTime)
        : undefined;

    // Filamento utilizado
    const filamentUsed = metadata.filamentUsed
        ? `${metadata.filamentUsed.total} g`
        : undefined;

    // Boquilla
    const nozzleDiameter = metadata.nozzleDiameter !== undefined
        ? `${metadata.nozzleDiameter} mm`
        : undefined;

    // Infill
    const infill = metadata.infill !== undefined
        ? `${metadata.infill}%`
        : undefined;

    // Soportes
    const supports = metadata.supports !== undefined
        ? metadata.supports ? "Sí" : "No"
        : undefined;

    return {
        modelName: metadata.modelName,
        dimensions,
        layerHeight,
        printTime,
        filamentUsed,
        material,
        nozzleDiameter,
        infill,
        supports,
        printer: metadata.printer
    };
}

function formatPrintTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (hours > 0) {
        return `${hours}h ${minutes}min`;
    }

    return `${minutes}min`;
}