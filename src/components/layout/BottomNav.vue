<script setup lang="ts">
interface NavItem {
  to: string;
  label: string;
  icon: string;
}

const items: NavItem[] = [
  { to: "/", label: "Início", icon: "M4 11.5 12 5l8 6.5V19a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1z" },
  { to: "/saldo", label: "Saldo", icon: "M4 7h16v10H4zM4 10h16M8 14h2" },
  { to: "/investimentos", label: "Invest.", icon: "M4 18 9 11l4 4 7-9M15 6h5v5" },
  { to: "/configuracoes", label: "Config.", icon: "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM4 12h2m12 0h2M12 4v2m0 12v2m5.7-11.7-1.4 1.4M7.7 16.3l-1.4 1.4m0-11.4 1.4 1.4m8.6 8.6 1.4 1.4" },
];
</script>

<template>
  <nav class="bottom-nav">
    <RouterLink
      v-for="item in items"
      :key="item.to"
      :to="item.to"
      class="bottom-nav__item"
      active-class="bottom-nav__item--active"
    >
      <svg viewBox="0 0 24 24" class="bottom-nav__icon" aria-hidden="true">
        <path :d="item.icon" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
      <span>{{ item.label }}</span>
    </RouterLink>
  </nav>
</template>

<style scoped>
.bottom-nav {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  height: calc(var(--nav-height) + var(--safe-bottom));
  padding-bottom: var(--safe-bottom);
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  background: var(--color-surface);
  border-top: 1px solid var(--color-border);
}

.bottom-nav__item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  color: var(--color-text-muted);
  font-size: 11px;
  -webkit-tap-highlight-color: transparent;
}

.bottom-nav__item--active {
  color: var(--color-brand-strong);
}

.bottom-nav__icon {
  width: 24px;
  height: 24px;
}
</style>
