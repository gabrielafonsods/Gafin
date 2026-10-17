/**
 * Entrega um arquivo ao usuário para salvar no aparelho.
 *
 * No iOS, dentro de um PWA instalado, um simples `<a download>` costuma
 * ABRIR o arquivo em vez de baixá-lo (limitação conhecida do WebKit em modo
 * standalone). O caminho confiável no iPhone é o Web Share API com `files`:
 * abre a folha de compartilhamento nativa, de onde dá pra escolher
 * "Salvar em Arquivos". Por isso tentamos o Share primeiro e só caímos no
 * link de download como alternativa (funciona bem no desktop).
 */
export async function saveFile(file: File): Promise<void> {
  const nav = navigator as Navigator & {
    canShare?: (data: ShareData) => boolean;
    share?: (data: ShareData) => Promise<void>;
  };

  if (nav.canShare?.({ files: [file] }) && nav.share) {
    try {
      await nav.share({ files: [file], title: file.name });
      return;
    } catch (error) {
      // Usuário cancelou a folha de compartilhamento: não é um erro real.
      if (error instanceof Error && error.name === "AbortError") return;
      // Qualquer outra falha do Share cai para o link de download abaixo.
    }
  }

  const url = URL.createObjectURL(file);
  const link = document.createElement("a");
  link.href = url;
  link.download = file.name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

export function jsonFile(name: string, data: unknown): File {
  return new File([JSON.stringify(data, null, 2)], name, { type: "application/json" });
}

export function csvFile(name: string, content: string): File {
  // BOM UTF-8: sem isso o Excel/Numbers exibem acentos errados em CSV.
  return new File(["\uFEFF" + content], name, { type: "text/csv;charset=utf-8" });
}
