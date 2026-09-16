/**
 * Transforma "Meu Primeiro Post!" em "meu-primeiro-post".
 */
export function slugify(text) {
  return String(text)
    .normalize("NFD") // separa as letras dos acentos
    .replace(/[\u0300-\u036f]/g, "") // remove os acentos
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "") // remove caracteres especiais
    .replace(/\s+/g, "-") // espaços viram hífen
    .replace(/-+/g, "-") // hífens repetidos viram um só
    .slice(0, 180);
}
