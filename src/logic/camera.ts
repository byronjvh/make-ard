import * as THREE from "three";

export type CameraAngle =
    | "isometric"
    | "isometric2"
    | "front"
    | "back"
    | "left"
    | "right"
    | "top";

const CAMERA_DIRECTIONS: Record<
    CameraAngle,
    THREE.Vector3
> = {
    isometric: new THREE.Vector3(1, 1, 1),
    isometric2: new THREE.Vector3(-1, 1, -1),
    front: new THREE.Vector3(0, 0, 1),
    back: new THREE.Vector3(0, 0, -1),
    left: new THREE.Vector3(-1, 0, 0),
    right: new THREE.Vector3(1, 0, 0),
    top: new THREE.Vector3(0, 1, 0),
};

export function setCameraView(
    preview: any,
    angle: CameraAngle,
) {
    const camera = preview?.sceneManager.camera;
    const scene = preview?.sceneManager.scene;

    if (!camera || !scene) {
        console.error(
            "❌ No se encontró cámara o escena.",
        );
        return;
    }

    // ==========================================
    // BUSCAR EXTRUSIONES
    // ==========================================

    const extrusions =
        scene.getObjectByName("Extrusions");

    if (!extrusions) {
        console.error(
            "❌ No se encontró Extrusions.",
        );
        return;
    }

    // ==========================================
    // BOUNDS REALES DEL MODELO
    // ==========================================

    const box =
        new THREE.Box3().setFromObject(
            extrusions,
        );

    if (box.isEmpty()) {
        console.error(
            "❌ Los bounds del modelo están vacíos.",
        );
        return;
    }

    const center =
        new THREE.Vector3();

    box.getCenter(center);

    const size =
        new THREE.Vector3();

    box.getSize(size);

    // ==========================================
    // ESFERA ENVOLVENTE
    // ==========================================

    const sphere =
        new THREE.Sphere();

    box.getBoundingSphere(sphere);

    // ==========================================
    // DIRECCIÓN
    // ==========================================

    const direction =
        CAMERA_DIRECTIONS[angle]
            .clone()
            .normalize();

    // ==========================================
    // DISTANCIA
    // ==========================================

    const fov =
        THREE.MathUtils.degToRad(
            camera.fov ?? 25,
        );

    const radius =
        Math.max(
            sphere.radius,
            1,
        );

    let distance =
        radius /
        Math.tan(fov / 2);

    // Un poco de margen
    distance *= 1.25;

    // ==========================================
    // POSICIÓN
    // ==========================================

    const position =
        center.clone().add(
            direction.multiplyScalar(
                distance,
            ),
        );

    camera.position.copy(position);

    // ==========================================
    // CONTROLES
    // ==========================================

    const controls = preview.sceneManager.controls;

    if (controls) {
        controls.enabled = false;

        controls.target.copy(center);

        controls.update();
    }
    camera.lookAt(center);
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();

    return {
        direction,
    };
}

