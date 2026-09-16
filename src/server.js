import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { postsRouter } from "./routes/posts.routes.js";
import { prisma } from "./lib/prisma.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3333;

const app = express();

app.use(cors());
app.use(express.json());

// Serve o frontend da pasta /public em http://localhost:3333
app.use(express.static(path.join(__dirname, "..", "public")));

// Rotas da API
app.use("/api/posts", postsRouter);

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", uptime: process.uptime() });
});

// Rota de API não encontrada
app.use("/api", (req, res) => {
  res.status(404).json({ error: `Rota ${req.method} ${req.originalUrl} não existe.` });
});

// Tratamento central de erros
app.use((error, req, res, next) => {
  console.error(error);

  // Erros conhecidos do Prisma
  if (error.code === "P2002") {
    return res.status(409).json({ error: "Já existe um post com esse slug/título." });
  }
  if (error.code === "P2025") {
    return res.status(404).json({ error: "Post não encontrado." });
  }

  res.status(500).json({ error: "Erro interno do servidor." });
});

const server = app.listen(PORT, () => {
  console.log(`\n  API no ar:      http://localhost:${PORT}/api/posts`);
  console.log(`  Frontend no ar: http://localhost:${PORT}\n`);
});

// Encerra o servidor e a conexão com o banco de forma limpa
for (const sinal of ["SIGINT", "SIGTERM"]) {
  process.on(sinal, async () => {
    await prisma.$disconnect();
    server.close(() => process.exit(0));
  });
}
