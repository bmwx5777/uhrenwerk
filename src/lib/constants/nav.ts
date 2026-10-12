/**
 * Единый источник навигации: header, мобильное меню и footer берут ссылки
 * отсюда. Добавление раздела в одном месте меняет все три.
 *
 * `as const` сохраняет литеральные типы путей — при `typedRoutes: true`
 * опечатка в адресе становится ошибкой TypeScript, а не битой ссылкой.
 */
export const MAIN_NAV = [
  { href: "/catalog", label: "Каталог" },
  { href: "/brands", label: "Бренды" },
  { href: "/about", label: "О нас" },
] as const;

export const FOOTER_NAV = [
  {
    title: "Каталог",
    links: [
      { href: "/catalog", label: "Все часы" },
      { href: "/brands", label: "Бренды" },
      { href: "/search", label: "Поиск" },
    ],
  },
  {
    title: "Клиентам",
    links: [
      { href: "/shipping", label: "Доставка" },
      { href: "/returns", label: "Возврат" },
      { href: "/order-lookup", label: "Статус заказа" },
      { href: "/about", label: "О магазине" },
    ],
  },
  {
    title: "Аккаунт",
    links: [
      { href: "/account", label: "Личный кабинет" },
      { href: "/wishlist", label: "Избранное" },
      { href: "/cart", label: "Корзина" },
    ],
  },
] as const;

export const LEGAL_NAV = [
  { href: "/privacy", label: "Политика конфиденциальности" },
  { href: "/terms", label: "Условия продажи" },
] as const;
