import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { slugify } from "../utils/slug.js";

export const postsRouter = Router();

/** Valida o corpo da requisição e devolve os dados prontos ou uma lista de erros. */
function validatePost(body, { partial = false } = {}) {
  const errors = [];
  const data = {};

  const has = (field) => body[field] !== undefined && body[field] !== null;

  if (!partial || has("title")) {
    const title = String(body.title ?? "").trim();
    if (title.length < 3) errors.push("O título precisa ter no mínimo 3 caracteres.");
    if (title.length > 160) errors.push("O título pode ter no máximo 160 caracteres.");
    data.title = title;
  }

  if (!partial || has("content")) {
    const content = String(body.content ?? "").trim();
    if (content.length < 10) errors.push("O conteúdo precisa ter no mínimo 10 caracteres.");
    data.content = content;
  }

  if (has("excerpt")) {
    const excerpt = String(body.excerpt).trim();
    data.excerpt = excerpt.length ? excerpt.slice(0, 240) : null;
  }

  if (has("author")) {
    const author = String(body.author).trim();
    data.author = author.length ? author.slice(0, 80) : "Anônimo";
  }

  if (has("published")) {
    data.published = body.published === true || body.published === "true";
  }

  if (has("slug")) {
    const slug = slugify(body.slug);
    if (slug) data.slug = slug;
  } else if (data.title) {
    data.slug = slugify(data.title);
  }

  return { data, errors };
}

/** GET /api/posts  → lista com filtros ?status=published|draft e ?q=texto */
postsRouter.get("/", async (req, res, next) => {
  try {
    const { status, q } = req.query;

    const where = {};
    if (status === "published") where.published = true;
    if (status === "draft") where.published = false;
    if (q) {
      where.OR = [
        { title: { contains: String(q), mode: "insensitive" } },
        { content: { contains: String(q), mode: "insensitive" } },
      ];
    }

    const posts = await prisma.post.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    res.json({ total: posts.length, data: posts });
  } catch (error) {
    next(error);
  }
});

/** GET /api/posts/slug/:slug → busca pela URL amigável */
postsRouter.get("/slug/:slug", async (req, res, next) => {
  try {
    const post = await prisma.post.findUnique({ where: { slug: req.params.slug } });
    if (!post) return res.status(404).json({ error: "Post não encontrado." });
    res.json(post);
  } catch (error) {
    next(error);
  }
});

/** GET /api/posts/:id */
postsRouter.get("/:id", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ error: "ID inválido." });

    const post = await prisma.post.findUnique({ where: { id } });
    if (!post) return res.status(404).json({ error: "Post não encontrado." });
    res.json(post);
  } catch (error) {
    next(error);
  }
});

/** POST /api/posts → cria */
postsRouter.post("/", async (req, res, next) => {
  try {
    const { data, errors } = validatePost(req.body);
    if (errors.length) return res.status(400).json({ error: errors.join(" ") });

    const post = await prisma.post.create({ data });
    res.status(201).json(post);
  } catch (error) {
    next(error);
  }
});

/** PUT /api/posts/:id → atualiza (aceita envio parcial dos campos) */
postsRouter.put("/:id", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ error: "ID inválido." });

    const { data, errors } = validatePost(req.body, { partial: true });
    if (errors.length) return res.status(400).json({ error: errors.join(" ") });
    if (!Object.keys(data).length) {
      return res.status(400).json({ error: "Envie ao menos um campo para atualizar." });
    }

    const post = await prisma.post.update({ where: { id }, data });
    res.json(post);
  } catch (error) {
    next(error);
  }
});

/** PATCH /api/posts/:id/publish → alterna entre publicado e rascunho */
postsRouter.patch("/:id/publish", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ error: "ID inválido." });

    const atual = await prisma.post.findUnique({ where: { id } });
    if (!atual) return res.status(404).json({ error: "Post não encontrado." });

    const post = await prisma.post.update({
      where: { id },
      data: { published: !atual.published },
    });
    res.json(post);
  } catch (error) {
    next(error);
  }
});

/** DELETE /api/posts/:id */
postsRouter.delete("/:id", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ error: "ID inválido." });

    await prisma.post.delete({ where: { id } });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});
