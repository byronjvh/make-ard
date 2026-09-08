
export interface PrintCardUserData {
    modelName: string;
    description: string;
    printer: string;
    walls: string;
    signature: string;
}


export const defaultPrintCardUserData: PrintCardUserData = {
    modelName: "Nombre del modelo",
    description: "Descripción corta del modelo 3D",
    printer: "Flashforge AD5X",
    walls: "3",
    signature: "username",
};

