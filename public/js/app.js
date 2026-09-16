const API = "/api/posts";

// Elementos da tela
const el = {
  posts: document.getElementById("posts"),
  vazio: document.getElementById("vazio"),
  resumo: document.getElementById("resumo"),
  busca: document.getElementById("busca"),
  filtros: document.querySelectorAll(".filtro"),
  editor: document.getElementById("editor"),
  editorTitulo: document.getElementById("editor-titulo"),
  aviso: document.getElementById("aviso"),
  title: document.getElementById("title"),
  author: document.getElementById("author"),
  excerpt: document.getElementById("excerpt"),
  content: document.getElementById("content"),
  published: document.getElementById("published"),
  salvar: document.getElementById("salvar"),
  cancelar: document.getElementById("cancelar"),
};

// Estado da tela
let statusAtual = "";
let termoBusca = "";
let editandoId = null;

/* ---------- Comunicação com a API ---------- */

async function requisitar(url, options = {}) {
  const resposta = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });

  if (resposta.status === 204) return null;

  const dados = await resposta.json().catch(() => ({}));
  if (!resposta.ok) throw new Error(dados.error || "Não foi possível concluir a operação.");
  return dados;
}

/* ---------- Renderização ---------- */

function formatarData(iso) {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function escapar(texto) {
  const div = document.createElement("div");
  div.textContent = texto ?? "";
  return div.innerHTML;
}

function montarPost(post) {
  const estado = post.published
    ? '<span class="post__estado post__estado--publicado">Publicado</span>'
    : '<span class="post__estado post__estado--rascunho">Rascunho</span>';

  return `
    <li class="post" data-id="${post.id}">
      <div class="post__meta">
        ${estado}
        <span>${escapar(post.author)}</span>
        <span>·</span>
        <span>${formatarData(post.createdAt)}</span>
      </div>
      <h3 class="post__titulo">${escapar(post.title)}</h3>
      <p class="post__texto">${escapar(post.excerpt || post.content.slice(0, 160))}</p>
      <p class="post__meta post__slug">/${escapar(post.slug)}</p>
      <div class="post__acoes">
        <button class="botao botao--texto" data-acao="editar">Editar</button>
        <button class="botao botao--texto" data-acao="publicar">
          ${post.published ? "Voltar para rascunho" : "Publicar"}
        </button>
        <button class="botao botao--texto botao--perigo" data-acao="excluir">Excluir</button>
      </div>
    </li>
  `;
}

async function carregarPosts() {
  try {
    const params = new URLSearchParams();
    if (statusAtual) params.set("status", statusAtual);
    if (termoBusca) params.set("q", termoBusca);

    const { data, total } = await requisitar(`${API}?${params}`);

    el.posts.innerHTML = data.map(montarPost).join("");
    el.vazio.hidden = total > 0;

    const publicados = data.filter((post) => post.published).length;
    el.resumo.textContent = `${total} post(s) · ${publicados} publicado(s)`;
  } catch (error) {
    el.resumo.textContent = "Não foi possível carregar os posts. O servidor está rodando?";
    mostrarAviso(error.message, true);
  }
}

function mostrarAviso(mensagem, erro = false) {
  el.aviso.textContent = mensagem;
  el.aviso.className = erro ? "aviso aviso--erro" : "aviso";
  el.aviso.hidden = false;
  if (!erro) setTimeout(() => (el.aviso.hidden = true), 3000);
}

/* ---------- Formulário ---------- */

function limparFormulario() {
  editandoId = null;
  el.title.value = "";
  el.author.value = "";
  el.excerpt.value = "";
  el.content.value = "";
  el.published.checked = false;
  el.editorTitulo.textContent = "Novo post";
  el.salvar.textContent = "Salvar post";
  el.cancelar.hidden = true;
}

async function salvarPost() {
  const corpo = {
    title: el.title.value.trim(),
    author: el.author.value.trim() || "Anônimo",
    excerpt: el.excerpt.value.trim(),
    content: el.content.value.trim(),
    published: el.published.checked,
  };

  el.salvar.disabled = true;
  try {
    if (editandoId) {
      await requisitar(`${API}/${editandoId}`, { method: "PUT", body: JSON.stringify(corpo) });
      mostrarAviso("Post atualizado.");
    } else {
      await requisitar(API, { method: "POST", body: JSON.stringify(corpo) });
      mostrarAviso("Post criado.");
    }
    limparFormulario();
    await carregarPosts();
  } catch (error) {
    mostrarAviso(error.message, true);
  } finally {
    el.salvar.disabled = false;
  }
}

async function abrirEdicao(id) {
  try {
    const post = await requisitar(`${API}/${id}`);
    editandoId = post.id;
    el.title.value = post.title;
    el.author.value = post.author;
    el.excerpt.value = post.excerpt ?? "";
    el.content.value = post.content;
    el.published.checked = post.published;
    el.editorTitulo.textContent = `Editando #${post.id}`;
    el.salvar.textContent = "Salvar alterações";
    el.cancelar.hidden = false;
    el.editor.scrollIntoView({ behavior: "smooth", block: "start" });
    el.title.focus();
  } catch (error) {
    mostrarAviso(error.message, true);
  }
}

/* ---------- Eventos ---------- */

el.salvar.addEventListener("click", salvarPost);
el.cancelar.addEventListener("click", limparFormulario);

el.posts.addEventListener("click", async (evento) => {
  const botao = evento.target.closest("button[data-acao]");
  if (!botao) return;

  const id = botao.closest(".post").dataset.id;
  const acao = botao.dataset.acao;

  try {
    if (acao === "editar") {
      await abrirEdicao(id);
    } else if (acao === "publicar") {
      await requisitar(`${API}/${id}/publish`, { method: "PATCH" });
      await carregarPosts();
    } else if (acao === "excluir") {
      if (!confirm("Excluir este post? A ação não pode ser desfeita.")) return;
      await requisitar(`${API}/${id}`, { method: "DELETE" });
      if (String(editandoId) === String(id)) limparFormulario();
      await carregarPosts();
    }
  } catch (error) {
    mostrarAviso(error.message, true);
  }
});

el.filtros.forEach((botao) => {
  botao.addEventListener("click", () => {
    el.filtros.forEach((b) => b.classList.remove("filtro--ativo"));
    botao.classList.add("filtro--ativo");
    statusAtual = botao.dataset.status;
    carregarPosts();
  });
});

let temporizador;
el.busca.addEventListener("input", (evento) => {
  clearTimeout(temporizador);
  temporizador = setTimeout(() => {
    termoBusca = evento.target.value.trim();
    carregarPosts();
  }, 300);
});

carregarPosts();
