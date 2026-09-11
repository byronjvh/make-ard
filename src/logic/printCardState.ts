import type { PrintCardMetadata } from "./extractPrintCardMetadata";


interface PrintCardState {
    printCardMetadata: PrintCardMetadata | undefined;
    preview: string | undefined;
}

export const printCardState: PrintCardState = {
    printCardMetadata: undefined,
    preview: undefined,
};

export function setPrintCardState(
    metadata: PrintCardMetadata,
    image: string,
) {
    printCardState.printCardMetadata = metadata;
    printCardState.preview = image;
}
export function setPrintCardPreview(
    image: string,
) {
    printCardState.preview = image;
}
export function setPrintCardMetadata(
    metadata: PrintCardMetadata,
) {
    printCardState.printCardMetadata = metadata;
}

export function clearPrintCardMetadata() {
    printCardState.printCardMetadata = undefined;
}