import { relations } from "drizzle-orm";

import { account, session, user } from "./auth";
import { address, wishlist, wishlistItem } from "./customer";
import { cart, cartItem } from "./cart";
import {
  brand,
  category,
  inventory,
  product,
  productImage,
  productUnit,
} from "./catalog";
import { order, orderItem } from "./order";
import { payment } from "./payment";
import { shippingMethod, shippingZone, shippingZoneCountry } from "./shipping";

/**
 * Все relations собраны в одном файле: таблицы ссылаются друг на друга
 * между модулями схемы, и раскладывать relations по файлам означало бы
 * круговые импорты.
 */

export const userRelations = relations(user, ({ many, one }) => ({
  sessions: many(session),
  accounts: many(account),
  addresses: many(address),
  orders: many(order),
  carts: many(cart),
  wishlist: one(wishlist),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, { fields: [session.userId], references: [user.id] }),
}));

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, { fields: [account.userId], references: [user.id] }),
}));

export const addressRelations = relations(address, ({ one }) => ({
  user: one(user, { fields: [address.userId], references: [user.id] }),
}));

export const brandRelations = relations(brand, ({ many }) => ({
  products: many(product),
}));

export const categoryRelations = relations(category, ({ many, one }) => ({
  products: many(product),
  parent: one(category, {
    fields: [category.parentId],
    references: [category.id],
    relationName: "categoryTree",
  }),
  children: many(category, { relationName: "categoryTree" }),
}));

export const productRelations = relations(product, ({ many, one }) => ({
  brand: one(brand, { fields: [product.brandId], references: [brand.id] }),
  category: one(category, {
    fields: [product.categoryId],
    references: [category.id],
  }),
  images: many(productImage),
  units: many(productUnit),
  inventory: one(inventory),
  cartItems: many(cartItem),
  wishlistItems: many(wishlistItem),
  orderItems: many(orderItem),
}));

export const productUnitRelations = relations(productUnit, ({ many, one }) => ({
  product: one(product, {
    fields: [productUnit.productId],
    references: [product.id],
  }),
  images: many(productImage),
  orderItems: many(orderItem),
}));

export const productImageRelations = relations(productImage, ({ one }) => ({
  product: one(product, {
    fields: [productImage.productId],
    references: [product.id],
  }),
  unit: one(productUnit, {
    fields: [productImage.productUnitId],
    references: [productUnit.id],
  }),
}));

export const inventoryRelations = relations(inventory, ({ one }) => ({
  product: one(product, {
    fields: [inventory.productId],
    references: [product.id],
  }),
}));

export const wishlistRelations = relations(wishlist, ({ many, one }) => ({
  user: one(user, { fields: [wishlist.userId], references: [user.id] }),
  items: many(wishlistItem),
}));

export const wishlistItemRelations = relations(wishlistItem, ({ one }) => ({
  wishlist: one(wishlist, {
    fields: [wishlistItem.wishlistId],
    references: [wishlist.id],
  }),
  product: one(product, {
    fields: [wishlistItem.productId],
    references: [product.id],
  }),
  unit: one(productUnit, {
    fields: [wishlistItem.productUnitId],
    references: [productUnit.id],
  }),
}));

export const cartRelations = relations(cart, ({ many, one }) => ({
  user: one(user, { fields: [cart.userId], references: [user.id] }),
  items: many(cartItem),
}));

export const cartItemRelations = relations(cartItem, ({ one }) => ({
  cart: one(cart, { fields: [cartItem.cartId], references: [cart.id] }),
  product: one(product, {
    fields: [cartItem.productId],
    references: [product.id],
  }),
  unit: one(productUnit, {
    fields: [cartItem.productUnitId],
    references: [productUnit.id],
  }),
}));

export const orderRelations = relations(order, ({ many, one }) => ({
  user: one(user, { fields: [order.userId], references: [user.id] }),
  items: many(orderItem),
  payments: many(payment),
  shippingMethod: one(shippingMethod, {
    fields: [order.shippingMethodId],
    references: [shippingMethod.id],
  }),
}));

export const orderItemRelations = relations(orderItem, ({ one }) => ({
  order: one(order, { fields: [orderItem.orderId], references: [order.id] }),
  product: one(product, {
    fields: [orderItem.productId],
    references: [product.id],
  }),
  unit: one(productUnit, {
    fields: [orderItem.productUnitId],
    references: [productUnit.id],
  }),
}));

export const paymentRelations = relations(payment, ({ one }) => ({
  order: one(order, { fields: [payment.orderId], references: [order.id] }),
}));

export const shippingZoneRelations = relations(shippingZone, ({ many }) => ({
  countries: many(shippingZoneCountry),
  methods: many(shippingMethod),
}));

export const shippingZoneCountryRelations = relations(
  shippingZoneCountry,
  ({ one }) => ({
    zone: one(shippingZone, {
      fields: [shippingZoneCountry.zoneId],
      references: [shippingZone.id],
    }),
  }),
);

export const shippingMethodRelations = relations(shippingMethod, ({ many, one }) => ({
  zone: one(shippingZone, {
    fields: [shippingMethod.zoneId],
    references: [shippingZone.id],
  }),
  orders: many(order),
}));
