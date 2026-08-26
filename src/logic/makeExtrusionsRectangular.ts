import * as THREE from "three";

export function makeExtrusionsRectangular(scene: THREE.Scene) {

    const extrusions = scene.getObjectByName("Extrusions");

    if (!extrusions) {
        console.warn("❌ Extrusions no encontrado");
        return;
    }

    console.log("🔥 EXTRUSIONES → SECCIÓN REDONDEADA ACHATADA");

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

        // Altura de la sección.
        const halfHeight = 0.5;

        // Qué tan achatadas serán las partes superior
        // e inferior.
        //
        // 0.00 = esfera
        // 0.15 = ligeramente achatada
        // 0.25 = bastante achatada
        //
        const flatten = 0.15;

        // =====================================================
        // PROCESAR CADA GEOMETRÍA
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

            if (count < 4) continue;

            // -------------------------------------------------
            // CENTRO LOCAL
            // -------------------------------------------------

            let centerX = 0;
            let centerY = 0;
            let centerZ = 0;

            let validVertices = 0;

            for (
                let i = start;
                i < start + count;
                i++
            ) {

                const p = i * 3;

                const x = pos[p];
                const y = pos[p + 1];
                const z = pos[p + 2];

                if (
                    !Number.isFinite(x) ||
                    !Number.isFinite(y) ||
                    !Number.isFinite(z)
                ) {
                    continue;
                }

                centerX += x;
                centerY += y;
                centerZ += z;

                validVertices++;
            }

            if (validVertices === 0) continue;

            centerX /= validVertices;
            centerY /= validVertices;
            centerZ /= validVertices;

            // -------------------------------------------------
            // TRANSFORMACIÓN
            // -------------------------------------------------

            for (
                let i = start;
                i < start + count;
                i++
            ) {

                const p = i * 3;

                const x = pos[p];
                const y = pos[p + 1];
                const z = pos[p + 2];

                if (
                    !Number.isFinite(x) ||
                    !Number.isFinite(y) ||
                    !Number.isFinite(z)
                ) {
                    continue;
                }

                // ---------------------------------------------
                // Coordenada vertical normalizada
                // ---------------------------------------------

                let nz =
                    (z - centerZ) / halfHeight;

                nz = THREE.MathUtils.clamp(nz, -1, 1);

                // ---------------------------------------------
                // Achatamiento de los extremos.
                //
                // La zona central permanece redondeada.
                // Los extremos se vuelven más planos.
                // ---------------------------------------------

                const absZ = Math.abs(nz);

                const flattenFactor =
                    1 - flatten * Math.pow(absZ, 4);

                // ---------------------------------------------
                // Aplicamos únicamente una modificación
                // MUY ligera a la altura.
                // ---------------------------------------------

                const newZ =
                    centerZ +
                    nz *
                    halfHeight *
                    flattenFactor;

                pos[p + 2] = newZ;
            }
        }

        position.needsUpdate = true;

        geometry.computeBoundingBox();
        geometry.computeBoundingSphere();
    });

    console.log(
        "✅ Sección redondeada con extremos achatados"
    );
}