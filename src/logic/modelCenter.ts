import * as THREE from "three";

export function modelCenter(scene: THREE.Scene, buildVolume: { x: number; y: number; z: number, smallGrid: boolean }) {
    const extrusions = scene.getObjectByName("Extrusions");

    if (!extrusions) {
        console.error("❌ No se encontró el grupo Extrusions");
    } else {

        const box = new THREE.Box3().setFromObject(extrusions);

        const modelCenter = new THREE.Vector3();

        box.getCenter(modelCenter);

        const volumeCenter = new THREE.Vector3(
            buildVolume.x / 2,
            buildVolume.z / 2,
            -buildVolume.y / 2,
        );

        const offset = new THREE.Vector3().subVectors(
            volumeCenter,
            modelCenter,
        );

        extrusions.position.add(offset);

        const newBox = new THREE.Box3().setFromObject(extrusions);

        const newCenter = new THREE.Vector3();

        newBox.getCenter(newCenter);

    }
}