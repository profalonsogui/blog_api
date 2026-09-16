import { PrismaClient } from "@prisma/client";
import { slugify } from "../src/utils/slug.js";

const prisma = new PrismaClient();

const posts = [
  {
    title: "Como configurar o PostgreSQL local com Prisma",
    excerpt: "Do banco criado no pgAdmin até a primeira migration rodando.",
    content:
      "O Prisma precisa de duas coisas para funcionar: a URL de conexão no arquivo .env e um schema descrevendo suas tabelas. Com isso pronto, o comando prisma migrate dev cria a tabela no Postgres e gera o client tipado que você usa no código.",
    author: "Guilherme",
    published: true,
  },
  {
    title: "REST na prática: os verbos que você realmente usa",
    excerpt: "GET, POST, PUT, PATCH e DELETE explicados com exemplos de um blog.",
    content:
      "GET lê, POST cria, PUT atualiza o recurso inteiro, PATCH atualiza um pedaço e DELETE remove. O status code faz parte da resposta: 201 para criado, 204 para removido sem corpo, 400 para dado inválido e 404 para recurso inexistente.",
    author: "Guilherme",
    published: true,
  },
  {
    title: "Rascunho: ideias para o próximo post",
    excerpt: null,
    content:
      "Anotações soltas para desenvolver depois: paginação com skip/take, upload de imagem de capa, autenticação com JWT e deploy do banco na nuvem.",
    author: "Guilherme",
    published: false,
  },
];

async function main() {
  console.log("Populando o banco...");

  for (const post of posts) {
    const slug = slugify(post.title);
    await prisma.post.upsert({
      where: { slug },
      update: {},
      create: { ...post, slug },
    });
    console.log(`  + ${post.title}`);
  }

  console.log("Pronto!");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
