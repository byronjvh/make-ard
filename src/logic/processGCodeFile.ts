import { GCodePreview } from "gcode-preview";
import { removePurgeLines } from "./GCodeRemovePurgeLines";
import { setCameraView } from "./camera";
import { extractPrintCardMetadata } from "./extractPrintCardMetadata";
import { modelCenter } from "./modelCenter";
import { makeExtrusionsRectangular } from "./makeExtrusionsRectangular";
import * as THREE from "three";

export async function processGCodeFile(file: File, canvas: HTMLCanvasElement) {

    let ok = false;

    const originalGCode = await file.text();

    const result = removePurgeLines(originalGCode);

    const gcode = result.gcode;
    const bounds = result.bounds;

    if (!bounds) {
        console.error("No se pudo calcular el volumen del G-code.");

        return;
    }

    // =================================================
    // PEQUEÑO MARGEN
    // =================================================

    const margin = 10;

    const buildVolume = {
        x: Math.max(bounds.sizeX + margin, 1),

        y: Math.max(bounds.sizeY + margin, 1),

        z: Math.max(bounds.sizeZ + margin, 1),
        smallGrid: false,
    };

    // =================================================
    // CREAR PREVIEW
    // =================================================
    let lineHeight = 0.4;
    const preview = new GCodePreview({
        canvas,

        buildVolume,

        renderTravel: false,
        renderExtrusion: true,
        renderTubes: true,
        extrusionWidth: 0.6,

        lineWidth: 1,
        lineHeight,

        extrusionColor: "#1e90ff",
    });

    const renderer = (preview.sceneManager as any).renderer;
    renderer.setClearColor(0x000000, 0);
    const scene = preview.sceneManager.scene;
    const camera = (preview.sceneManager as any).camera;
    renderer.render(scene, camera);

    scene.background = null;

    if (renderer) {
        console.log(
            "MSAA máximo disponible:",
            renderer.capabilities?.maxSamples,
        );

        console.log(
            "Antialias activo:",
            renderer.getContext?.().getContextAttributes?.().antialias,
        );
    }

    const buildVolumeFromScene =
        preview.sceneManager.scene.getObjectByName("BuildVolume");

    if (buildVolumeFromScene) {
        buildVolumeFromScene.visible = false;
    }

    // =================================================
    // PROCESAR
    // =================================================

    canvas.style.visibility = "hidden";

    await preview.processGCode(gcode);

    canvas.style.visibility = "visible";

    const extrusions: any =
        preview.sceneManager.scene.getObjectByName("Extrusions");

    extrusions?.traverse((object: any) => {
        if (!object.isMesh) return;

        const material = object.material;

        if (!material.isShaderMaterial) return;

        material.fragmentShader = material.fragmentShader.replace(
            "vec3 lightDir = normalize(vec3(-0.8, -0.2, -0.8));",
            "vec3 lightDir = normalize(vec3(0,-0.3,-1));",
        );
        material.fragmentShader = material.fragmentShader.replace(
            "float diff = max(dot(vNormal, -lightDir), 0.0) * directional;",
            "float diff = max(dot(vNormal, -lightDir), 0.35) * directional;",
        );

        material.uniforms.ambient.value = 0.28;
        material.uniforms.directional.value = 1.4;
        material.uniforms.brightness.value = 1.0;

        material.needsUpdate = true;
    });

    modelCenter(scene, buildVolume);

    makeExtrusionsRectangular(preview.sceneManager.scene);

    // Vista inicial
    setCameraView(preview, "isoFL");

    const initialImage = await captureCanvas(
        renderer,
        scene,
        camera,
        canvas,
    );

    ok = initialImage ? true : false;

    if (initialImage) {
        window.dispatchEvent(
            new CustomEvent("gcode-preview-ready", {
                detail: {
                    image: initialImage,
                    metadata: extractPrintCardMetadata(
                        gcode,
                        file.name,
                        bounds,
                    ),
                },
            }),
        );
    }

    return {
        ok,
        preview,
        renderer,
        scene,
        camera,
    };
}


export async function captureCanvas(
    renderer: THREE.WebGLRenderer,
    scene: THREE.Scene,
    camera: THREE.Camera,
    canvas: HTMLCanvasElement,
): Promise<string | undefined> {
    return new Promise((resolve) => {
        requestAnimationFrame(() => {
            renderer.render(scene, camera);

            canvas.toBlob((blob) => {
                if (!blob) {
                    resolve(undefined);
                    return;
                }

                resolve(URL.createObjectURL(blob));
            }, "image/png");
        });
    });
}