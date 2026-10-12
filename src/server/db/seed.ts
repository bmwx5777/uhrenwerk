/**
 * Наполнение базы демо-данными для разработки.
 *
 * Запуск: npm run db:seed
 * Скрипт идемпотентен: сначала очищает таблицы, затем вставляет данные заново.
 * В production не запускается (проверка ниже).
 *
 * Все цены — НЕТТО (без НДС), в центах.
 */
import { drizzle } from "drizzle-orm/postgres-js";
import { sql } from "drizzle-orm";
import postgres from "postgres";

import { HOME_VAT_RATE_BP } from "@/lib/constants/tax";
import { netCentsFromGrossEur as grossToNet } from "@/lib/pricing";
import * as schema from "@/server/db/schema";
import type { ProductSpecs } from "@/server/db/schema/catalog";

if (process.env.NODE_ENV === "production") {
  throw new Error("Seed запрещён в production.");
}

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL не задан. Проверь .env.local");
}

const client = postgres(databaseUrl, { max: 1 });
const db = drizzle(client, { schema });

/**
 * Стандартные ставки НДС в базисных пунктах (1900 = 19 %).
 *
 * ВАЖНО: ставки меняются решениями национальных правительств.
 * Значения ниже — состояние на момент написания (октябрь 2026);
 * перед запуском в production сверь с бухгалтером или подключи
 * источник ставок с обновлением (например, VIES/TEDB).
 */
const EU_VAT_RATES: Array<[string, string, number]> = [
  ["AT", "Австрия", 2000],
  ["BE", "Бельгия", 2100],
  ["BG", "Болгария", 2000],
  ["HR", "Хорватия", 2500],
  ["CY", "Кипр", 1900],
  ["CZ", "Чехия", 2100],
  ["DK", "Дания", 2500],
  ["EE", "Эстония", 2400],
  ["FI", "Финляндия", 2550],
  ["FR", "Франция", 2000],
  ["DE", "Германия", 1900],
  ["GR", "Греция", 2400],
  ["HU", "Венгрия", 2700],
  ["IE", "Ирландия", 2300],
  ["IT", "Италия", 2200],
  ["LV", "Латвия", 2100],
  ["LT", "Литва", 2100],
  ["LU", "Люксембург", 1700],
  ["MT", "Мальта", 1800],
  ["NL", "Нидерланды", 2100],
  ["PL", "Польша", 2300],
  ["PT", "Португалия", 2300],
  ["RO", "Румыния", 2100],
  ["SK", "Словакия", 2300],
  ["SI", "Словения", 2200],
  ["ES", "Испания", 2100],
  ["SE", "Швеция", 2500],
];

/** Страны вне ЕС: НДС не начисляется (экспорт), пошлины платит получатель. */
const NON_EU_COUNTRIES: Array<[string, string]> = [
  ["GB", "Великобритания"],
  ["CH", "Швейцария"],
  ["NO", "Норвегия"],
  ["US", "США"],
  ["CA", "Канада"],
  ["AE", "ОАЭ"],
  ["SA", "Саудовская Аравия"],
  ["JP", "Япония"],
  ["SG", "Сингапур"],
  ["HK", "Гонконг"],
  ["AU", "Австралия"],
  ["TR", "Турция"],
];

/** Розничная цена с НДС → нетто. Общая функция с админкой. */
function netCentsFromGrossEur(grossEur: number): number {
  const { netCents, actualGrossCents, isExact } = grossToNet(grossEur);

  if (!isExact) {
    console.warn(
      `Цена ${grossEur} € не представима точно при НДС ${HOME_VAT_RATE_BP / 100} %; ` +
        `на витрине будет ${(actualGrossCents / 100).toFixed(2)} €`,
    );
  }

  return netCents;
}

type SeedProduct = {
  slug: string;
  sku: string;
  name: string;
  reference: string;
  brandSlug: string;
  categorySlug: string;
  kind: "stocked" | "serialized";
  condition: "new" | "unworn" | "pre_owned";
  vatScheme: "standard" | "margin";
  priceCents: number | null;
  compareAtPriceCents?: number;
  shortDescription: string;
  description: string;
  isFeatured: boolean;
  specs: ProductSpecs;
  image: string;
  /** Для stocked — складской остаток. */
  quantity?: number;
  /** Для serialized — конкретные экземпляры. */
  units?: Array<{
    unitCode: string;
    serialNumber: string;
    productionYear: number;
    conditionGrade: "unworn" | "excellent" | "very_good" | "good" | "fair";
    hasBox: boolean;
    hasPapers: boolean;
    priceCents: number;
    costCents: number;
  }>;
};

const BRANDS = [
  {
    slug: "rolex",
    name: "Rolex",
    countryCode: "CH",
    foundedYear: 1905,
    isFeatured: true,
    position: 1,
    description:
      "Женева, 1905. Эталон надёжности и самый узнаваемый силуэт в часовом мире.",
  },
  {
    slug: "omega",
    name: "Omega",
    countryCode: "CH",
    foundedYear: 1848,
    isFeatured: true,
    position: 2,
    description:
      "Биль, 1848. Часы, которые были на Луне, и мастерская co-axial механизмов.",
  },
  {
    slug: "grand-seiko",
    name: "Grand Seiko",
    countryCode: "JP",
    foundedYear: 1960,
    isFeatured: true,
    position: 3,
    description:
      "Японская точность, ручная полировка Zaratsu и уникальный Spring Drive.",
  },
  {
    slug: "jaeger-lecoultre",
    name: "Jaeger-LeCoultre",
    countryCode: "CH",
    foundedYear: 1833,
    isFeatured: true,
    position: 4,
    description: "Валле-де-Жу, 1833. Мануфактура полного цикла и более 1200 калибров.",
  },
  {
    slug: "tudor",
    name: "Tudor",
    countryCode: "CH",
    foundedYear: 1926,
    isFeatured: false,
    position: 5,
    description: "Инструментальные часы с характером и разумной ценой.",
  },
  {
    slug: "iwc",
    name: "IWC Schaffhausen",
    countryCode: "CH",
    foundedYear: 1868,
    isFeatured: false,
    position: 6,
    description: "Шаффхаузен, 1868. Инженерная сдержанность и пилотская классика.",
  },
];

const CATEGORIES = [
  {
    slug: "divers",
    name: "Дайверские",
    position: 1,
    description: "Водозащита от 200 метров, вращающийся безель, читаемость под водой.",
  },
  {
    slug: "dress",
    name: "Дресс-часы",
    position: 2,
    description: "Тонкий корпус, лаконичный циферблат, кожаный ремень.",
  },
  {
    slug: "chronographs",
    name: "Хронографы",
    position: 3,
    description: "Механика для измерения интервалов — от трека до орбиты.",
  },
  {
    slug: "gmt",
    name: "GMT и путешествия",
    position: 4,
    description: "Второй часовой пояс, который читается одним взглядом.",
  },
  {
    slug: "pilot",
    name: "Пилотские",
    position: 5,
    description: "Крупные цифры, высокий контраст, наследие авиационных приборов.",
  },
];

const PRODUCTS: SeedProduct[] = [
  {
    slug: "omega-speedmaster-moonwatch-professional",
    sku: "OM-31030425001001",
    name: "Speedmaster Moonwatch Professional",
    reference: "310.30.42.50.01.001",
    brandSlug: "omega",
    categorySlug: "chronographs",
    kind: "stocked",
    condition: "new",
    vatScheme: "standard",
    priceCents: netCentsFromGrossEur(7150),
    shortDescription: "Хронограф с ручным заводом и сапфировой задней крышкой.",
    description:
      "Тот самый Moonwatch: калибр 3861 с co-axial спуском, сертификат Master Chronometer, стальной корпус 42 мм и гесалитовое стекло в версии Professional. Поставляется с полным комплектом и гарантией 5 лет.",
    isFeatured: true,
    specs: {
      movement: "manual",
      caliber: "Omega 3861",
      powerReserveHours: 50,
      caseMaterial: "Нержавеющая сталь",
      caseDiameterMm: 42,
      caseThicknessMm: 13.2,
      lugWidthMm: 20,
      waterResistanceM: 50,
      crystal: "Сапфировое",
      dialColor: "Чёрный",
      braceletMaterial: "Сталь",
      complications: ["Хронограф", "Тахиметр"],
      gender: "men",
    },
    image: "/placeholder/watch-1.svg",
    quantity: 3,
  },
  {
    slug: "rolex-submariner-date-126610ln",
    sku: "RLX-126610LN",
    name: "Submariner Date",
    reference: "126610LN",
    brandSlug: "rolex",
    categorySlug: "divers",
    kind: "serialized",
    condition: "pre_owned",
    vatScheme: "margin",
    priceCents: null,
    shortDescription: "Два экземпляра в наличии, оба с коробкой и документами.",
    description:
      "Калибр 3235 с запасом хода 70 часов, корпус Oystersteel 41 мм, керамический безель Cerachrom и застёжка Glidelock. Каждый экземпляр проверен часовщиком: проверка точности, водозащиты и подлинности всех компонентов.",
    isFeatured: true,
    specs: {
      movement: "automatic",
      caliber: "Rolex 3235",
      powerReserveHours: 70,
      caseMaterial: "Oystersteel",
      caseDiameterMm: 41,
      caseThicknessMm: 12.5,
      lugWidthMm: 21,
      waterResistanceM: 300,
      crystal: "Сапфировое",
      dialColor: "Чёрный",
      braceletMaterial: "Oystersteel",
      complications: ["Дата"],
      gender: "men",
    },
    image: "/placeholder/watch-2.svg",
    units: [
      {
        unitCode: "UW-U-000101",
        serialNumber: "78J4K2L9",
        productionYear: 2023,
        conditionGrade: "excellent",
        hasBox: true,
        hasPapers: true,
        priceCents: 1_150_000,
        costCents: 980_000,
      },
      {
        unitCode: "UW-U-000102",
        serialNumber: "63H8M1P4",
        productionYear: 2021,
        conditionGrade: "very_good",
        hasBox: true,
        hasPapers: true,
        priceCents: 1_090_000,
        costCents: 940_000,
      },
    ],
  },
  {
    slug: "grand-seiko-sbga413-shunbun",
    sku: "GS-SBGA413",
    name: "Spring Drive SBGA413 «Shunbun»",
    reference: "SBGA413",
    brandSlug: "grand-seiko",
    categorySlug: "dress",
    kind: "stocked",
    condition: "new",
    vatScheme: "standard",
    priceCents: netCentsFromGrossEur(9400),
    compareAtPriceCents: netCentsFromGrossEur(10_150),
    shortDescription: "Циферблат «вишнёвый цвет» и плавный ход Spring Drive.",
    description:
      "Spring Drive 9R65: секундная стрелка идёт абсолютно плавно, точность ±1 секунда в сутки, запас хода 72 часа. Корпус 40 мм с полировкой Zaratsu и фактурный розовый циферблат, вдохновлённый весной в Шиодзири.",
    isFeatured: true,
    specs: {
      movement: "spring_drive",
      caliber: "9R65",
      powerReserveHours: 72,
      caseMaterial: "Нержавеющая сталь",
      caseDiameterMm: 40,
      caseThicknessMm: 12.5,
      lugWidthMm: 19,
      waterResistanceM: 100,
      crystal: "Сапфировое с просветлением",
      dialColor: "Розовый",
      braceletMaterial: "Сталь",
      complications: ["Дата", "Индикатор запаса хода"],
      gender: "unisex",
    },
    image: "/placeholder/watch-3.svg",
    quantity: 2,
  },
  {
    slug: "jaeger-lecoultre-reverso-tribute-small-seconds",
    sku: "JLC-Q3978480",
    name: "Reverso Tribute Small Seconds",
    reference: "Q3978480",
    brandSlug: "jaeger-lecoultre",
    categorySlug: "dress",
    kind: "stocked",
    condition: "new",
    vatScheme: "standard",
    priceCents: netCentsFromGrossEur(11_800),
    shortDescription:
      "Art Déco 1931 года: переворачивающийся корпус и синий циферблат.",
    description:
      "Калибр 822/2 с ручным заводом, корпус из стали 45,6 × 27,4 мм, циферблат глубокого синего цвета с солнечной сатинировкой. Переворачивающийся корпус — наследие часов для игроков в поло.",
    isFeatured: false,
    specs: {
      movement: "manual",
      caliber: "JLC 822/2",
      powerReserveHours: 42,
      caseMaterial: "Нержавеющая сталь",
      caseThicknessMm: 8.5,
      lugWidthMm: 20,
      waterResistanceM: 30,
      crystal: "Сапфировое",
      dialColor: "Синий",
      braceletMaterial: "Кожа",
      complications: ["Малая секундная"],
      gender: "unisex",
    },
    image: "/placeholder/watch-4.svg",
    quantity: 1,
  },
  {
    slug: "tudor-black-bay-58-navy-blue",
    sku: "TDR-M79030B",
    name: "Black Bay Fifty-Eight Navy Blue",
    reference: "M79030B-0001",
    brandSlug: "tudor",
    categorySlug: "divers",
    kind: "stocked",
    condition: "new",
    vatScheme: "standard",
    priceCents: netCentsFromGrossEur(3500),
    shortDescription: "39 мм, 200 метров, манufacture-калибр с хронометрией COSC.",
    description:
      "Компактный дайвер с пропорциями 1958 года: сталь 39 мм, высота 11,9 мм, калибр MT5402 с запасом хода 70 часов и сертификатом COSC. Браслет из стали в комплекте с текстильным ремешком.",
    isFeatured: true,
    specs: {
      movement: "automatic",
      caliber: "Tudor MT5402",
      powerReserveHours: 70,
      caseMaterial: "Нержавеющая сталь",
      caseDiameterMm: 39,
      caseThicknessMm: 11.9,
      lugWidthMm: 20,
      waterResistanceM: 200,
      crystal: "Сапфировое",
      dialColor: "Синий",
      braceletMaterial: "Сталь",
      gender: "unisex",
    },
    image: "/placeholder/watch-1.svg",
    quantity: 5,
  },
  {
    slug: "iwc-pilots-watch-mark-xx",
    sku: "IWC-IW328201",
    name: "Pilot's Watch Mark XX",
    reference: "IW328201",
    brandSlug: "iwc",
    categorySlug: "pilot",
    kind: "stocked",
    condition: "new",
    vatScheme: "standard",
    priceCents: netCentsFromGrossEur(5150),
    shortDescription: "Сдержанный пилотский трёхстрелочник с запасом хода 120 часов.",
    description:
      "Калибр 32111 с заводом в пять суток, мягкая железная клетка для защиты от магнитных полей, корпус 40 мм и антибликовое стекло, устойчивое к перепадам давления.",
    isFeatured: false,
    specs: {
      movement: "automatic",
      caliber: "IWC 32111",
      powerReserveHours: 120,
      caseMaterial: "Нержавеющая сталь",
      caseDiameterMm: 40,
      caseThicknessMm: 10.8,
      lugWidthMm: 20,
      waterResistanceM: 100,
      crystal: "Сапфировое",
      dialColor: "Чёрный",
      braceletMaterial: "Сталь",
      complications: ["Дата"],
      gender: "men",
    },
    image: "/placeholder/watch-2.svg",
    quantity: 4,
  },
  {
    slug: "omega-seamaster-diver-300m-pre-owned",
    sku: "OM-21030422001001",
    name: "Seamaster Diver 300M",
    reference: "210.30.42.20.01.001",
    brandSlug: "omega",
    categorySlug: "divers",
    kind: "serialized",
    condition: "pre_owned",
    vatScheme: "margin",
    priceCents: null,
    shortDescription: "Один экземпляр 2020 года, волнистый циферблат, полный комплект.",
    description:
      "Калибр 8800 Master Chronometer, керамический безель и лакированный циферблат с волнами. Экземпляр прошёл полное обслуживание в нашей мастерской: замена прокладок, проверка водозащиты до 300 метров.",
    isFeatured: false,
    specs: {
      movement: "automatic",
      caliber: "Omega 8800",
      powerReserveHours: 55,
      caseMaterial: "Нержавеющая сталь",
      caseDiameterMm: 42,
      caseThicknessMm: 13.5,
      lugWidthMm: 20,
      waterResistanceM: 300,
      crystal: "Сапфировое",
      dialColor: "Чёрный",
      braceletMaterial: "Сталь",
      complications: ["Дата", "Гелиевый клапан"],
      gender: "men",
    },
    image: "/placeholder/watch-3.svg",
    units: [
      {
        unitCode: "UW-U-000103",
        serialNumber: "91C7T5R2",
        productionYear: 2020,
        conditionGrade: "excellent",
        hasBox: true,
        hasPapers: true,
        priceCents: 450_000,
        costCents: 372_000,
      },
    ],
  },
  {
    slug: "rolex-datejust-36-pre-owned",
    sku: "RLX-126200",
    name: "Datejust 36",
    reference: "126200",
    brandSlug: "rolex",
    categorySlug: "dress",
    kind: "serialized",
    condition: "pre_owned",
    vatScheme: "margin",
    priceCents: null,
    shortDescription: "Серебристый циферблат, браслет Jubilee, 2022 год.",
    description:
      "Классика в универсальном размере 36 мм: калибр 3235, циферблат цвета серебра с нанесёнными индексами, браслет Jubilee с застёжкой Oysterclasp. Следы носки минимальны, корпус не полировался.",
    isFeatured: false,
    specs: {
      movement: "automatic",
      caliber: "Rolex 3235",
      powerReserveHours: 70,
      caseMaterial: "Oystersteel",
      caseDiameterMm: 36,
      caseThicknessMm: 11.8,
      lugWidthMm: 20,
      waterResistanceM: 100,
      crystal: "Сапфировое",
      dialColor: "Серебристый",
      braceletMaterial: "Oystersteel",
      complications: ["Дата"],
      gender: "unisex",
    },
    image: "/placeholder/watch-4.svg",
    units: [
      {
        unitCode: "UW-U-000104",
        serialNumber: "44B2N8Z6",
        productionYear: 2022,
        conditionGrade: "excellent",
        hasBox: true,
        hasPapers: true,
        priceCents: 780_000,
        costCents: 668_000,
      },
    ],
  },
  {
    slug: "grand-seiko-sbgw231-elegance",
    sku: "GS-SBGW231",
    name: "Elegance SBGW231",
    reference: "SBGW231",
    brandSlug: "grand-seiko",
    categorySlug: "dress",
    kind: "stocked",
    condition: "new",
    vatScheme: "standard",
    priceCents: netCentsFromGrossEur(5000),
    shortDescription: "Ручной завод, 37,3 мм, белый циферблат и ремень из кожи.",
    description:
      "Калибр 9S64 с ручным заводом и точностью +5/−3 секунды в сутки. Корпус 37,3 мм с полировкой Zaratsu, тончайшие стрелки с алмазной огранкой.",
    isFeatured: false,
    specs: {
      movement: "manual",
      caliber: "9S64",
      powerReserveHours: 72,
      caseMaterial: "Нержавеющая сталь",
      caseDiameterMm: 37.3,
      caseThicknessMm: 11.6,
      lugWidthMm: 19,
      waterResistanceM: 30,
      crystal: "Сапфировое с просветлением",
      dialColor: "Белый",
      braceletMaterial: "Кожа крокодила",
      gender: "unisex",
    },
    image: "/placeholder/watch-1.svg",
    quantity: 2,
  },
  {
    slug: "tudor-pelagos-39",
    sku: "TDR-M25407N",
    name: "Pelagos 39",
    reference: "M25407N-0001",
    brandSlug: "tudor",
    categorySlug: "divers",
    kind: "stocked",
    condition: "new",
    vatScheme: "standard",
    priceCents: netCentsFromGrossEur(4200),
    shortDescription: "Титановый корпус 39 мм и водозащита 200 метров.",
    description:
      "Титан 2 класса с матовой поверхностью, калибр MT5400 с сертификатом COSC, безель с керамической вставкой и люминофор X1. Вес ощутимо ниже стали — для ежедневной носки.",
    isFeatured: false,
    specs: {
      movement: "automatic",
      caliber: "Tudor MT5400",
      powerReserveHours: 70,
      caseMaterial: "Титан",
      caseDiameterMm: 39,
      caseThicknessMm: 11.8,
      lugWidthMm: 21,
      waterResistanceM: 200,
      crystal: "Сапфировое",
      dialColor: "Чёрный",
      braceletMaterial: "Титан",
      gender: "unisex",
    },
    image: "/placeholder/watch-2.svg",
    quantity: 2,
  },
];

const SHIPPING_ZONES = [
  {
    name: "Европейский союз",
    position: 1,
    countries: EU_VAT_RATES.map(([code]) => code),
    methods: [
      {
        name: "DHL Express, застрахованная доставка",
        description: "Доставка курьером с обязательной подписью получателя.",
        priceCents: 2_500,
        freeOverCents: 150_000,
        minDays: 1,
        maxDays: 3,
      },
    ],
  },
  {
    name: "Европа вне ЕС",
    position: 2,
    countries: ["GB", "CH", "NO", "TR"],
    methods: [
      {
        name: "DHL Express International",
        description: "Пошлины и местный НДС оплачивает получатель.",
        priceCents: 4_500,
        freeOverCents: 300_000,
        minDays: 2,
        maxDays: 5,
      },
    ],
  },
  {
    name: "Северная Америка",
    position: 3,
    countries: ["US", "CA"],
    methods: [
      {
        name: "FedEx International Priority",
        description: "Застрахованная доставка, пошлины на получателе.",
        priceCents: 6_500,
        freeOverCents: 400_000,
        minDays: 3,
        maxDays: 6,
      },
    ],
  },
  {
    name: "Азия и Ближний Восток",
    position: 4,
    countries: ["AE", "SA", "JP", "SG", "HK"],
    methods: [
      {
        name: "DHL Express Worldwide",
        description: "Застрахованная доставка, пошлины на получателе.",
        priceCents: 7_500,
        freeOverCents: 400_000,
        minDays: 3,
        maxDays: 7,
      },
    ],
  },
  {
    name: "Остальной мир",
    position: 5,
    countries: ["AU"],
    methods: [
      {
        name: "DHL Express Worldwide",
        description: "Застрахованная доставка, пошлины на получателе.",
        priceCents: 9_500,
        minDays: 5,
        maxDays: 10,
      },
    ],
  },
];

async function main(): Promise<void> {
  console.log("Очистка таблиц…");
  await db.execute(sql`
    TRUNCATE TABLE
      "payment", "webhook_event", "order_item", "order",
      "cart_item", "cart", "wishlist_item", "wishlist",
      "product_image", "product_unit", "inventory", "product",
      "category", "brand",
      "shipping_method", "shipping_zone_country", "shipping_zone",
      "tax_rate", "newsletter_subscriber", "address"
    RESTART IDENTITY CASCADE
  `);

  console.log("Ставки НДС…");
  await db.insert(schema.taxRate).values([
    ...EU_VAT_RATES.map(([countryCode, countryName, standardRateBp]) => ({
      countryCode,
      countryName,
      isEu: true,
      standardRateBp,
      validFrom: "2026-01-01",
    })),
    ...NON_EU_COUNTRIES.map(([countryCode, countryName]) => ({
      countryCode,
      countryName,
      isEu: false,
      standardRateBp: 0,
      validFrom: "2026-01-01",
    })),
  ]);

  console.log("Зоны и способы доставки…");
  for (const zone of SHIPPING_ZONES) {
    const [inserted] = await db
      .insert(schema.shippingZone)
      .values({ name: zone.name, position: zone.position })
      .returning({ id: schema.shippingZone.id });

    if (!inserted) throw new Error(`Не удалось создать зону ${zone.name}`);

    await db.insert(schema.shippingZoneCountry).values(
      zone.countries.map((countryCode) => ({
        zoneId: inserted.id,
        countryCode,
      })),
    );

    await db.insert(schema.shippingMethod).values(
      zone.methods.map((method, index) => ({
        zoneId: inserted.id,
        position: index,
        ...method,
      })),
    );
  }

  console.log("Бренды…");
  const brandRows = await db
    .insert(schema.brand)
    .values(BRANDS)
    .returning({ id: schema.brand.id, slug: schema.brand.slug });
  const brandIdBySlug = new Map(brandRows.map((row) => [row.slug, row.id]));

  console.log("Категории…");
  const categoryRows = await db
    .insert(schema.category)
    .values(CATEGORIES)
    .returning({ id: schema.category.id, slug: schema.category.slug });
  const categoryIdBySlug = new Map(categoryRows.map((row) => [row.slug, row.id]));

  console.log("Товары, экземпляры, склад и фото…");
  const publishedAt = new Date();

  for (const item of PRODUCTS) {
    const brandId = brandIdBySlug.get(item.brandSlug);
    const categoryId = categoryIdBySlug.get(item.categorySlug);

    if (!brandId || !categoryId) {
      throw new Error(`Нет бренда или категории для ${item.slug}`);
    }

    const [productRow] = await db
      .insert(schema.product)
      .values({
        slug: item.slug,
        sku: item.sku,
        name: item.name,
        reference: item.reference,
        brandId,
        categoryId,
        kind: item.kind,
        status: "active",
        condition: item.condition,
        vatScheme: item.vatScheme,
        shortDescription: item.shortDescription,
        description: item.description,
        priceCents: item.priceCents,
        compareAtPriceCents: item.compareAtPriceCents ?? null,
        isFeatured: item.isFeatured,
        publishedAt,
        specs: item.specs,
      })
      .returning({ id: schema.product.id });

    if (!productRow) throw new Error(`Не удалось создать товар ${item.slug}`);

    await db.insert(schema.productImage).values({
      productId: productRow.id,
      url: item.image,
      alt: `${item.name} — ${item.reference}`,
      position: 0,
      width: 1200,
      height: 1500,
      isPrimary: true,
    });

    if (item.kind === "serialized") {
      const units = item.units ?? [];
      await db.insert(schema.productUnit).values(
        units.map((unit) => ({
          productId: productRow.id,
          ...unit,
        })),
      );
      // Для уникальных экземпляров inventory — кэш доступного количества.
      await db.insert(schema.inventory).values({
        productId: productRow.id,
        quantity: units.length,
        lowStockThreshold: 1,
      });
    } else {
      await db.insert(schema.inventory).values({
        productId: productRow.id,
        quantity: item.quantity ?? 0,
        lowStockThreshold: 1,
      });
    }
  }

  console.log("Подписчик рассылки (пример)…");
  await db.insert(schema.newsletterSubscriber).values({
    email: "demo@uhrenwerk.test",
    status: "subscribed",
    token: crypto.randomUUID(),
    source: "seed",
    confirmedAt: new Date(),
  });

  const counts = await db.execute<{ table_name: string; rows: number }>(sql`
    SELECT 'brand' AS table_name, count(*)::int AS rows FROM "brand"
    UNION ALL SELECT 'category', count(*)::int FROM "category"
    UNION ALL SELECT 'product', count(*)::int FROM "product"
    UNION ALL SELECT 'product_unit', count(*)::int FROM "product_unit"
    UNION ALL SELECT 'inventory', count(*)::int FROM "inventory"
    UNION ALL SELECT 'tax_rate', count(*)::int FROM "tax_rate"
    UNION ALL SELECT 'shipping_method', count(*)::int FROM "shipping_method"
    ORDER BY table_name
  `);

  console.log("\nГотово. Записей в базе:");
  for (const row of counts) {
    console.log(`  ${row.table_name}: ${row.rows}`);
  }
}

try {
  await main();
} finally {
  await client.end();
}
