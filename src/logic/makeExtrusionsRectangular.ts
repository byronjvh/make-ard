import * as THREE from "three";

export function makeExtrusionsRectangular(scene: THREE.Scene) {

    const extrusions = scene.getObjectByName("Extrusions");

    if (!extrusions) {
        console.warn("❌ Extrusions no encontrado");
        return;
    }

    console.log("🔥 EXTRUSIONES → SECCIÓN CUADRADA");

    extrusions.traverse((obj) => {

        if (!(obj as any).isBatchedMesh) return;

        const batched = obj as THREE.BatchedMesh;
        const geometry = batched.geometry;

        const position = geometry.getAttribute("position");

        if (!position) return;

        const pos = position.array as Float32Array;

        const geometryInfo = (batched as any)._geometryInfo;

        if (!geometryInfo) {
            console.warn("❌ _geometryInfo no encontrado");
            return;
        }

        // =====================================================
        // CONFIGURACIÓN
        // =====================================================

        /*
         * Tamaño de la sección cuadrada.
         *
         * Si tu extrusionWidth es 1.2,
         * empieza probando 1.2 aquí también.
         *
         * width = altura = cuadrado
         */
        const squareSize = 0.8;

        const halfSize = squareSize * 0.5;

        // =====================================================
        // PROCESAR CADA EXTRUSIÓN
        // =====================================================

        for (
            let geometryId = 0;
            geometryId < geometryInfo.length;
            geometryId++
        ) {

            const info = geometryInfo[geometryId];

            if (!info || !info.active) continue;

            const start = info.vertexStart;
            const count = info.vertexCount;

            if (count <= 0) continue;

            // -------------------------------------------------
            // ENCONTRAR CENTRO VERTICAL
            // -------------------------------------------------

            let zMin = Infinity;
            let zMax = -Infinity;

            for (
                let i = start;
                i < start + count;
                i++
            ) {

                const p = i * 3;
                const z = pos[p + 2];

                if (!Number.isFinite(z)) continue;

                if (z < zMin) zMin = z;
                if (z > zMax) zMax = z;
            }

            if (
                !Number.isFinite(zMin) ||
                !Number.isFinite(zMax)
            ) {
                continue;
            }

            const centerZ = (zMin + zMax) * 0.5;

            // =================================================
            // CREAR DOS PLANOS EXACTOS
            // =================================================

            const bottomZ = centerZ - halfSize;
            const topZ = centerZ + halfSize;

            // -------------------------------------------------
            // NO TOCAMOS X
            // NO TOCAMOS Y
            //
            // Únicamente convertimos la sección en:
            //
            //       ─────────  top
            //       │        │
            //       │        │
            //       ─────────  bottom
            // -------------------------------------------------

            for (
                let i = start;
                i < start + count;
                i++
            ) {

                const p = i * 3;

                const z = pos[p + 2];

                if (!Number.isFinite(z)) continue;

                const originalZ = z;

                const normalized =
                    (originalZ - zMin) / (zMax - zMin);

                // Qué tanto conservamos la forma redondeada original.
                //
                // 0.00 = cuadrado completamente plano
                // 0.05 = redondeo muy ligero
                // 0.10 = redondeo ligero
                //
                const roundness = 0.01;

                // Curva suave alrededor de los extremos
                const smooth =
                    normalized * normalized * (3 - 2 * normalized);

                // Mezclamos entre sección perfectamente cuadrada
                // y una transición ligeramente redondeada.
                const rounded =
                    normalized * (1 - roundness) +
                    smooth * roundness;

                pos[p + 2] =
                    bottomZ +
                    rounded * (topZ - bottomZ);
            }
        }

        position.needsUpdate = true;

        // =====================================================
        // BOUNDS
        // =====================================================

        geometry.computeBoundingBox();
        geometry.computeBoundingSphere();
        geometry.computeVertexNormals()

        if (geometry.attributes.normal) {
            geometry.attributes.normal.needsUpdate = true;
        }

    });

    console.log("✅ Sección cuadrada aplicada");
}