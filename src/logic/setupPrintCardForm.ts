import type { FormattedPrintCardMetadata } from "./formatMetadata";
import type { PrintCardUserData } from "./PrintCardUserData";

export type PrintCardFormData = FormattedPrintCardMetadata &
    PrintCardUserData;

let printCardFormData: PrintCardFormData;

export function setupPrintCardForm(form: HTMLFormElement) {
    if (!form) return;
    const updateFormData = () => {
        const data = Object.fromEntries(
            new FormData(form),
        ) as unknown as PrintCardFormData;

        printCardFormData = data;
        window.dispatchEvent(
            new CustomEvent("print-card-form-update", {
                detail: printCardFormData,
            }),
        );
    };

    form.addEventListener("input", updateFormData);
}