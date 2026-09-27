import { createRouter, createWebHashHistory } from "vue-router";

/*
 * Usamos hash history (URLs como /#/saldo) em vez de history mode.
 * Motivo: GitHub Pages não tem um servidor configurável para fazer fallback
 * de rotas desconhecidas para o index.html — ao dar F5 em "/saldo" ele
 * retornaria 404. Hash history resolve isso sem precisar de nenhum truque
 * de redirecionamento e funciona de forma idêntica dentro do PWA instalado.
 */
export const router = createRouter({
  history: createWebHashHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: "/",
      name: "home",
      component: () => import("@/views/HomeView.vue"),
    },
    {
      path: "/saldo",
      children: [
        {
          path: "",
          name: "saldo",
          component: () => import("@/views/balance/BalanceDashboard.vue"),
        },
        {
          path: "contas",
          name: "saldo-contas",
          component: () => import("@/views/balance/AccountsView.vue"),
        },
        {
          path: "cartoes",
          name: "saldo-cartoes",
          component: () => import("@/views/balance/CardsView.vue"),
        },
        {
          path: "entradas",
          name: "saldo-entradas",
          component: () => import("@/views/balance/IncomeView.vue"),
        },
        {
          path: "saidas",
          name: "saldo-saidas",
          component: () => import("@/views/balance/ExpensesView.vue"),
        },
      ],
    },
    {
      path: "/investimentos",
      children: [
        {
          path: "",
          name: "investimentos",
          component: () => import("@/views/investments/InvestmentsDashboard.vue"),
        },
        {
          path: "carteira",
          name: "investimentos-carteira",
          component: () => import("@/views/investments/PortfolioView.vue"),
        },
        {
          path: "ativos",
          name: "investimentos-ativos",
          component: () => import("@/views/investments/AssetsView.vue"),
        },
      ],
    },
    {
      path: "/configuracoes",
      name: "configuracoes",
      component: () => import("@/views/settings/SettingsView.vue"),
    },
    {
      path: "/:pathMatch(.*)*",
      name: "not-found",
      component: () => import("@/views/NotFoundView.vue"),
    },
  ],
});
