import type { PrintCardMetadata } from "./extractPrintCardMetadata";


interface PrintCardState {
    printCardMetadata: PrintCardMetadata | undefined;
    preview: string | undefined;
}

export const printCardState: PrintCardState = {
    printCardMetadata: undefined,
    preview: undefined,
};

export function setPrintCardMetadata(
    metadata: PrintCardMetadata,
    image: string,
) {
    printCardState.printCardMetadata = metadata;
    printCardState.preview = image;
}