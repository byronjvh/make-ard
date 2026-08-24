import * as THREE from "three";

export type CameraAngle =
    | "isometric"
    | "front"
    | "back"
    | "left"
    | "right"
    | "top";

function isDescendantOf(object: THREE.Object3D, root: THREE.Object3D): boolean {
    let current: THREE.Object3D | null = object;

    while (current) {
        if (current === root) return true;
        current = current.parent;
    }

    return false;
}

function findExcludedRoots(scene: THREE.Scene, names: string[]): THREE.Object3D[] {
    const roots: THREE.Object3D[] = [];

    scene.traverse((object) => {
        if (names.includes(object.name)) {
            roots.push(object);
        }
    });

    return roots;
}

function getModelBounds(
    scene: THREE.Scene,
    exclude: THREE.Object3D[] = [],
) {
    const box = new THREE.Box3();
    let found = false;

    scene.updateMatrixWorld(true);

    scene.traverse((object: any) => {
        if (!object.geometry) return;

        if (exclude.some((ex) => isDescendantOf(object, ex))) return;

        const geometry = object.geometry;

        if (!geometry.boundingBox) {
            geometry.computeBoundingBox();
        }

        if (!geometry.boundingBox) return;

        const worldBox = geometry.boundingBox.clone();
        worldBox.applyMatrix4(object.matrixWorld);

        box.union(worldBox);
        found = true;
    });

    if (!found || box.isEmpty()) {
        return null;
    }

    const center = new THREE.Vector3();
    const size = new THREE.Vector3();

    box.getCenter(center);
    box.getSize(size);

    return { box, center, size };
}

const ANGLE_DIRECTIONS: Record<CameraAngle, () => THREE.Vector3> = {
    isometric: () => new THREE.Vector3(1, 1, 1).normalize(),
    front: () => new THREE.Vector3(0, 0, 1),
    back: () => new THREE.Vector3(0, 0, -1),
    left: () => new THREE.Vector3(-1, 0, 0),
    right: () => new THREE.Vector3(1, 0, 0),
    top: () => new THREE.Vector3(0, 1, 0.0001).normalize(),
};

// Nombres de objetos que NO son el modelo y deben ignorarse
// al calcular el bounding box (grid, ejes, plataforma, etc.)
const EXCLUDED_OBJECT_NAMES = ["BuildVolume"];

export function setCameraView(
    preview: any,
    angle: CameraAngle = "isometric",
) {
    const camera = preview?.sceneManager?.camera;
    const scene = preview?.sceneManager?.scene;

    if (!camera || !scene) {
        console.warn("No se encontró cámara o escena.");
        return;
    }

    const exclude = findExcludedRoots(scene, EXCLUDED_OBJECT_NAMES);

    const model = getModelBounds(scene, exclude);

    if (!model) {
        console.warn("No se encontró el modelo.");
        return;
    }

    const { center, size } = model;

    const radius = size.length() / 2;

    const fovRad = (camera.fov * Math.PI) / 180;
    const fitDistance = radius / Math.sin(fovRad / 2);

    const distance = fitDistance * 1.3;

    const direction = ANGLE_DIRECTIONS[angle]();

    camera.position
        .copy(center)
        .add(direction.multiplyScalar(distance));

    camera.near = Math.max(distance / 100, 0.01);
    camera.far = distance * 10;
    camera.updateProjectionMatrix();

    camera.up.set(0, 1, 0);
    camera.lookAt(center);

    // Fuerza el render del frame ya que los controles están
    // desactivados y no hay loop de animación garantizado
    preview.render?.();
}