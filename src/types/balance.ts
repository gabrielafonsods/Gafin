import type { AccountType, PaymentMethod } from "@/database/schema";

export const ACCOUNT_TYPES: readonly AccountType[] = ["banco", "carteira", "poupanca", "outro"];

export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  banco: "Banco",
  carteira: "Carteira",
  poupanca: "Poupança",
  outro: "Outro",
};

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  dinheiro: "Dinheiro",
  pix: "PIX",
  cartao: "Cartão",
};
