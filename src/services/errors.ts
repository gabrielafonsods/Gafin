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
