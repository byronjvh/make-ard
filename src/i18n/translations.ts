export type Language = keyof typeof translations;

const LANGUAGE_KEY = "language";

export function getInitialLanguage(): Language {
    const savedLanguage = localStorage.getItem(LANGUAGE_KEY);

    if (savedLanguage === "en" || savedLanguage === "es") {
        return savedLanguage;
    }

    return "en";
}

export function setStoredLanguage(language: Language) {
    localStorage.setItem(LANGUAGE_KEY, language);
}

export function getStoredLanguage(): Language {
    return getInitialLanguage();
}

export const translations = {
    en: {
        siteTitle: "Make-ard - 3D Printing Model Cards",
        titleStart: "Your printer makes the part;",
        titleEnd: "makes the Print Card",
        description: "Create cards with your model's data in seconds, choose a theme, and share them wherever you want",

        drop: "Drop your G-code or image here",
        dropFile: "No file selected",
        dropLocal: "or click to search your computer",
        dimensions: "Dimensions",
        material: "Material",
        layerHeight: "Layer height",
        disclaimer: "Uploading your G-code—where supported—allows you to generate a preview of your model and extract print metadata. You can also start with an image.",
        repository: "Repository",
        view: "View",
        zoom: "Zoom",
        theme: "Theme",
        shadow: "Shadow",
        border: "Border",
        crop: "Crop",
        crops: {
            cover: "Cover",
            contain: "Preserve"
        },
        views: {
            isoFL: "Isometric FL",
            isoFR: "Isometric FR",
            isoBL: "Isometric BL",
            isoBR: "Isometric BR",
            front: "Front",
            back: "Back",
            left: "Left",
            right: "Right",
            top: "Top",
            bottom: "Bottom"
        },
        zooms: {
            Standard: "Standard",
            "Close-up": "Close-up",
            Far: "Far"
        },
        formTitle: "MODEL DATA",
        formName: "Model name",
        formDescription: "Model description",
        formDescriptionPlaceholder: "Example: Dinosaur toy, 3D printed.",
        formFile: "File",
        formTime: "Print time",
        formFilament: "Filament used",
        formInfill: "Infill",
        formWalls: "Walls",
        formNozzle: "Nozzle",
        formSupports: "Supports",
        formPrinter: "Printer",
        formSignature: "Signature",
        formDownload: "Download Print Card",
        supportTitle: "Support Make-ard",
        supportDescription: "Coffee or code, every contribution helps Make-ard grow a little further.",
        supportCoffee: "Buy me a coffee",
        supportGithub: "Contribute on GitHub",
        footer: "Made with ☕ & code · © 2026 Make-ard",
    },

    es: {
        siteTitle: "Make-ard - Tarjetas para modelos 3D",
        titleStart: "Tu impresora hace la pieza,",
        titleEnd: "hace la ficha",
        description: "Genera cards con los datos de tu modelo en segundos, elige un theme y compártelas donde quieras",

        drop: "Suelta tu G-code o imagen aquí",
        dropFile: "Ningún archivo seleccionado",
        dropLocal: "o haz clic para buscar en tu equipo",
        dimensions: "Dimensiones",
        material: "Material",
        layerHeight: "Altura de capa",
        disclaimer: "Cargar tu G-code, en casos compatibles, permite generar una vista previa de tu modelo y extraer metadatos de impresión. También puedes comenzar con una imagen.",
        repository: "Repositorio",
        view: "Vista",
        zoom: "Zoom",
        theme: "Tema",
        shadow: "Sombra",
        border: "Borde",
        crop: "Encuadre",
        crops: {
            cover: "Cubrir",
            contain: "Preservar"
        },
        views: {
            isoFL: "Isometrica FI",
            isoFR: "Isometrica FD",
            isoBL: "Isometrica PI",
            isoBR: "Isometrica PD",
            front: "Frontal",
            back: "Posterior",
            left: "Izquierda",
            right: "Derecha",
            top: "Arriba",
            bottom: "Abajo"
        },
        zooms: {
            Standard: "Estandar",
            "Close-up": "Cerca",
            Far: "Lejos"
        },
        formTitle: "DATOS DEL MODELO",
        formName: "Nombre del modelo",
        formDescription: "Descripción del modelo",
        formDescriptionPlaceholder: "Ej. Juguete infantil de dinosaurio, impreso en 3D.",
        formFile: "Archivo",
        formTime: "Tiempo impresión",
        formFilament: "Filamento usado",
        formInfill: "Relleno",
        formWalls: "Paredes",
        formNozzle: "Boquilla",
        formSupports: "Soportes",
        formPrinter: "Impresora",
        formSignature: "Firma",
        formDownload: "Descargar Print Card",
        supportTitle: "Apoya Make-ard",
        supportDescription: "Con un café o con código, cada aporte ayuda a que el proyecto siga creciendo",
        supportCoffee: "Invítame un café",
        supportGithub: "Contribuye en GitHub",
        footer: "Hecho con ☕ y código · © 2026 Make-ard",
    },
};


