import * as THREE from "three";

export function makeExtrusionsRectangular(scene: THREE.Scene) {

    const extrusions = scene.getObjectByName("Extrusions");

    if (!extrusions) {
        console.warn("❌ Extrusions no encontrado");
        return;
    }

    extrusions.traverse((obj) => {

        if (!(obj as any).isBatchedMesh) return;

        const batched = obj as THREE.BatchedMesh;
        const geometry = batched.geometry;

        const position = geometry.getAttribute("position");

        if (!position) return;

        const pos = position.array as Float32Array;

        // =====================================================
        // CONFIGURACIÓN
        // =====================================================

        const zStep = 0.5;

        // Ensanchamiento lateral.
        //
        // 1.00 = sin cambio
        // 1.03 = +3 %
        // 1.05 = +5 %
        // 1.08 = +8 %
        //
        const xyScale = 1.05;

        // =====================================================
        // PROCESAR
        // =====================================================

        for (let i = 0; i < position.count; i++) {

            const p = i * 3;

            let x = pos[p];
            let y = pos[p + 1];
            let z = pos[p + 2];

            if (
                !Number.isFinite(x) ||
                !Number.isFinite(y) ||
                !Number.isFinite(z)
            ) {
                continue;
            }

            // -------------------------------------------------
            // 1. CUADRATIZAR Z
            // -------------------------------------------------

            const zCenter =
                Math.round(z / zStep) * zStep;

            if (z > zCenter) {

                z = zCenter + zStep;

            } else {

                z = zCenter - zStep;
            }

            pos[p + 2] = z;

            // -------------------------------------------------
            // 2. ENSANCHAMIENTO LATERAL
            //
            // IMPORTANTE:
            //
            // No hacemos:
            //
            // x *= xyScale
            // y *= xyScale
            //
            // porque eso movería la geometría.
            //
            // En su lugar, posteriormente debemos aplicar
            // el ensanchamiento alrededor del centro de cada
            // extrusión.
            // -------------------------------------------------
        }

        position.needsUpdate = true;

        geometry.computeBoundingBox();
        geometry.computeBoundingSphere();

    });
}