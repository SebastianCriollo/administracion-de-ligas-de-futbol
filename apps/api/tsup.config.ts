import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/main.ts"],
  format: "esm",
  clean: true,
  sourcemap: true,
  // Los paquetes del workspace son fuente TS: se embeben en el bundle.
  // Las dependencias de node_modules quedan externas (las instala el contenedor).
  noExternal: [/^@ligas\//],
  // Prisma es CJS con requires dinámicos y engine nativo: siempre externo.
  external: ["@prisma/client", ".prisma/client"],
});
