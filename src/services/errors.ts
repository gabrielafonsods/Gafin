/**
 * Erro de regra de negócio (validação, operação bloqueada). A UI pode
 * mostrar `message` diretamente ao usuário.
 */
export class DomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DomainError";
  }
}

/** Mensagem segura para mostrar ao usuário (erros inesperados viram texto genérico). */
export function toUserMessage(error: unknown): string {
  if (error instanceof DomainError) return error.message;
  console.error(error);
  return "Não foi possível concluir a operação. Tente novamente.";
}
