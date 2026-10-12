CREATE TYPE "public"."address_type" AS ENUM('shipping', 'billing');--> statement-breakpoint
CREATE TYPE "public"."cart_status" AS ENUM('active', 'converted', 'abandoned');--> statement-breakpoint
CREATE TYPE "public"."newsletter_status" AS ENUM('pending', 'subscribed', 'unsubscribed');--> statement-breakpoint
CREATE TYPE "public"."order_status" AS ENUM('pending_payment', 'paid', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded', 'partially_refunded');--> statement-breakpoint
CREATE TYPE "public"."payment_method" AS ENUM('card', 'bank_transfer', 'crypto');--> statement-breakpoint
CREATE TYPE "public"."payment_provider" AS ENUM('manual_bank_transfer', 'card_gateway', 'crypto_gateway');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('pending', 'requires_action', 'succeeded', 'failed', 'cancelled', 'expired', 'refunded', 'partially_refunded');--> statement-breakpoint
CREATE TYPE "public"."product_condition" AS ENUM('new', 'unworn', 'pre_owned');--> statement-breakpoint
CREATE TYPE "public"."product_kind" AS ENUM('stocked', 'serialized');--> statement-breakpoint
CREATE TYPE "public"."product_status" AS ENUM('draft', 'active', 'archived');--> statement-breakpoint
CREATE TYPE "public"."tax_treatment" AS ENUM('eu_domestic', 'eu_oss', 'eu_reverse_charge', 'export_zero_rated', 'margin_scheme');--> statement-breakpoint
CREATE TYPE "public"."unit_condition_grade" AS ENUM('unworn', 'excellent', 'very_good', 'good', 'fair');--> statement-breakpoint
CREATE TYPE "public"."unit_status" AS ENUM('available', 'reserved', 'sold', 'withdrawn');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('customer', 'admin');--> statement-breakpoint
CREATE TYPE "public"."vat_scheme" AS ENUM('standard', 'margin');--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp with time zone,
	"refresh_token_expires_at" timestamp with time zone,
	"scope" text,
	"password" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"token" text NOT NULL,
	"user_id" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"phone" text,
	"role" "user_role" DEFAULT 'customer' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_email_lowercase" CHECK ("user"."email" = lower("user"."email"))
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "address" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"type" "address_type" DEFAULT 'shipping' NOT NULL,
	"recipient_name" text NOT NULL,
	"phone" text,
	"company_name" text,
	"vat_number" text,
	"vat_validated_at" timestamp with time zone,
	"country_code" char(2) NOT NULL,
	"state" text,
	"city" text NOT NULL,
	"postal_code" text NOT NULL,
	"line1" text NOT NULL,
	"line2" text,
	"is_default" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "address_country_code_format" CHECK ("address"."country_code" = upper("address"."country_code"))
);
--> statement-breakpoint
CREATE TABLE "wishlist" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wishlist_item" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"wishlist_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"product_unit_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "brand" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"logo_url" text,
	"description" text,
	"country_code" char(2),
	"founded_year" smallint,
	"is_featured" boolean DEFAULT false NOT NULL,
	"position" smallint DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "category" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"image_url" text,
	"parent_id" uuid,
	"position" smallint DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "category_not_self_parent" CHECK ("category"."parent_id" IS DISTINCT FROM "category"."id")
);
--> statement-breakpoint
CREATE TABLE "inventory" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"quantity" integer DEFAULT 0 NOT NULL,
	"reserved" integer DEFAULT 0 NOT NULL,
	"low_stock_threshold" smallint DEFAULT 1 NOT NULL,
	"allow_backorder" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "inventory_quantity_non_negative" CHECK ("inventory"."quantity" >= 0),
	CONSTRAINT "inventory_reserved_non_negative" CHECK ("inventory"."reserved" >= 0),
	CONSTRAINT "inventory_reserved_within_quantity" CHECK ("inventory"."reserved" <= "inventory"."quantity")
);
--> statement-breakpoint
CREATE TABLE "product" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"sku" text NOT NULL,
	"name" text NOT NULL,
	"reference" text,
	"brand_id" uuid NOT NULL,
	"category_id" uuid NOT NULL,
	"kind" "product_kind" DEFAULT 'stocked' NOT NULL,
	"status" "product_status" DEFAULT 'draft' NOT NULL,
	"condition" "product_condition" DEFAULT 'new' NOT NULL,
	"vat_scheme" "vat_scheme" DEFAULT 'standard' NOT NULL,
	"short_description" text,
	"description" text,
	"price_cents" integer,
	"compare_at_price_cents" integer,
	"currency" char(3) DEFAULT 'EUR' NOT NULL,
	"is_featured" boolean DEFAULT false NOT NULL,
	"published_at" timestamp with time zone,
	"specs" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"search_vector" "tsvector" GENERATED ALWAYS AS (to_tsvector('simple', coalesce(name, '') || ' ' || coalesce(reference, '') || ' ' || coalesce(short_description, ''))) STORED,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "product_price_positive" CHECK ("product"."price_cents" IS NULL OR "product"."price_cents" > 0),
	CONSTRAINT "product_compare_price_higher" CHECK ("product"."compare_at_price_cents" IS NULL OR "product"."price_cents" IS NULL OR "product"."compare_at_price_cents" > "product"."price_cents"),
	CONSTRAINT "product_stocked_requires_price" CHECK ("product"."kind" <> 'stocked' OR "product"."price_cents" IS NOT NULL)
);
--> statement-breakpoint
CREATE TABLE "product_image" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"product_unit_id" uuid,
	"url" text NOT NULL,
	"alt" text,
	"position" smallint DEFAULT 0 NOT NULL,
	"width" integer,
	"height" integer,
	"is_primary" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_unit" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"unit_code" text NOT NULL,
	"serial_number" text,
	"production_year" smallint,
	"condition_grade" "unit_condition_grade" DEFAULT 'excellent' NOT NULL,
	"has_box" boolean DEFAULT false NOT NULL,
	"has_papers" boolean DEFAULT false NOT NULL,
	"papers_date" date,
	"warranty_months" smallint DEFAULT 24 NOT NULL,
	"price_cents" integer NOT NULL,
	"cost_cents" integer,
	"vat_scheme" "vat_scheme",
	"status" "unit_status" DEFAULT 'available' NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "product_unit_price_positive" CHECK ("product_unit"."price_cents" > 0),
	CONSTRAINT "product_unit_cost_non_negative" CHECK ("product_unit"."cost_cents" IS NULL OR "product_unit"."cost_cents" >= 0),
	CONSTRAINT "product_unit_year_plausible" CHECK ("product_unit"."production_year" IS NULL OR ("product_unit"."production_year" BETWEEN 1850 AND 2100))
);
--> statement-breakpoint
CREATE TABLE "cart" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text,
	"guest_token" text,
	"status" "cart_status" DEFAULT 'active' NOT NULL,
	"currency" char(3) DEFAULT 'EUR' NOT NULL,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "cart_owner_present" CHECK ("cart"."user_id" IS NOT NULL OR "cart"."guest_token" IS NOT NULL)
);
--> statement-breakpoint
CREATE TABLE "cart_item" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cart_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"product_unit_id" uuid,
	"quantity" smallint DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "cart_item_quantity_positive" CHECK ("cart_item"."quantity" > 0),
	CONSTRAINT "cart_item_unit_quantity_one" CHECK ("cart_item"."product_unit_id" IS NULL OR "cart_item"."quantity" = 1)
);
--> statement-breakpoint
CREATE TABLE "order" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_number" text NOT NULL,
	"user_id" text,
	"email" text NOT NULL,
	"status" "order_status" DEFAULT 'pending_payment' NOT NULL,
	"currency" char(3) DEFAULT 'EUR' NOT NULL,
	"subtotal_cents" integer NOT NULL,
	"discount_cents" integer DEFAULT 0 NOT NULL,
	"shipping_cents" integer DEFAULT 0 NOT NULL,
	"tax_cents" integer DEFAULT 0 NOT NULL,
	"total_cents" integer NOT NULL,
	"tax_treatment" "tax_treatment" NOT NULL,
	"tax_rate_bp" integer DEFAULT 0 NOT NULL,
	"vat_number" text,
	"vat_validated_at" timestamp with time zone,
	"shipping_address" jsonb NOT NULL,
	"billing_address" jsonb,
	"shipping_method_id" uuid,
	"shipping_method_name" text NOT NULL,
	"customer_note" text,
	"admin_note" text,
	"invoice_number" text,
	"invoice_issued_at" timestamp with time zone,
	"reservation_expires_at" timestamp with time zone,
	"placed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"paid_at" timestamp with time zone,
	"shipped_at" timestamp with time zone,
	"delivered_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "order_subtotal_non_negative" CHECK ("order"."subtotal_cents" >= 0),
	CONSTRAINT "order_discount_non_negative" CHECK ("order"."discount_cents" >= 0),
	CONSTRAINT "order_shipping_non_negative" CHECK ("order"."shipping_cents" >= 0),
	CONSTRAINT "order_tax_non_negative" CHECK ("order"."tax_cents" >= 0),
	CONSTRAINT "order_total_positive" CHECK ("order"."total_cents" > 0),
	CONSTRAINT "order_total_matches_parts" CHECK ("order"."total_cents" = "order"."subtotal_cents" - "order"."discount_cents" + "order"."shipping_cents" + "order"."tax_cents"),
	CONSTRAINT "order_discount_within_subtotal" CHECK ("order"."discount_cents" <= "order"."subtotal_cents")
);
--> statement-breakpoint
CREATE TABLE "order_item" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"product_id" uuid,
	"product_unit_id" uuid,
	"product_name" text NOT NULL,
	"brand_name" text NOT NULL,
	"sku" text NOT NULL,
	"reference" text,
	"serial_number" text,
	"condition_grade" "unit_condition_grade",
	"image_url" text,
	"vat_scheme" "vat_scheme" DEFAULT 'standard' NOT NULL,
	"unit_price_cents" integer NOT NULL,
	"quantity" smallint NOT NULL,
	"tax_rate_bp" integer DEFAULT 0 NOT NULL,
	"tax_cents" integer DEFAULT 0 NOT NULL,
	"line_total_cents" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "order_item_quantity_positive" CHECK ("order_item"."quantity" > 0),
	CONSTRAINT "order_item_unit_price_positive" CHECK ("order_item"."unit_price_cents" > 0),
	CONSTRAINT "order_item_tax_non_negative" CHECK ("order_item"."tax_cents" >= 0),
	CONSTRAINT "order_item_line_total_matches" CHECK ("order_item"."line_total_cents" = "order_item"."unit_price_cents" * "order_item"."quantity"),
	CONSTRAINT "order_item_unit_quantity_one" CHECK ("order_item"."product_unit_id" IS NULL OR "order_item"."quantity" = 1)
);
--> statement-breakpoint
CREATE TABLE "payment" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"method" "payment_method" NOT NULL,
	"provider" "payment_provider" NOT NULL,
	"provider_payment_id" text,
	"provider_reference" text,
	"status" "payment_status" DEFAULT 'pending' NOT NULL,
	"amount_cents" integer NOT NULL,
	"currency" char(3) DEFAULT 'EUR' NOT NULL,
	"refunded_amount_cents" integer DEFAULT 0 NOT NULL,
	"crypto_asset" text,
	"crypto_network" text,
	"crypto_amount" numeric(38, 18),
	"crypto_address" text,
	"rate_locked_at" timestamp with time zone,
	"quote_expires_at" timestamp with time zone,
	"idempotency_key" text NOT NULL,
	"failure_reason" text,
	"raw_payload" jsonb,
	"paid_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payment_amount_positive" CHECK ("payment"."amount_cents" > 0),
	CONSTRAINT "payment_refund_within_amount" CHECK ("payment"."refunded_amount_cents" >= 0 AND "payment"."refunded_amount_cents" <= "payment"."amount_cents"),
	CONSTRAINT "payment_crypto_fields_consistent" CHECK (("payment"."method" <> 'crypto') OR ("payment"."crypto_asset" IS NOT NULL AND "payment"."crypto_network" IS NOT NULL))
);
--> statement-breakpoint
CREATE TABLE "webhook_event" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider" "payment_provider" NOT NULL,
	"event_id" text NOT NULL,
	"event_type" text NOT NULL,
	"payload" jsonb NOT NULL,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	"processed_at" timestamp with time zone,
	"error" text
);
--> statement-breakpoint
CREATE TABLE "shipping_method" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"zone_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"price_cents" integer NOT NULL,
	"free_over_cents" integer,
	"min_days" smallint NOT NULL,
	"max_days" smallint NOT NULL,
	"is_insured" boolean DEFAULT true NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"position" smallint DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "shipping_method_price_non_negative" CHECK ("shipping_method"."price_cents" >= 0),
	CONSTRAINT "shipping_method_days_order" CHECK ("shipping_method"."min_days" <= "shipping_method"."max_days"),
	CONSTRAINT "shipping_method_free_over_positive" CHECK ("shipping_method"."free_over_cents" IS NULL OR "shipping_method"."free_over_cents" > 0)
);
--> statement-breakpoint
CREATE TABLE "shipping_zone" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"position" smallint DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shipping_zone_country" (
	"zone_id" uuid NOT NULL,
	"country_code" char(2) NOT NULL,
	CONSTRAINT "shipping_zone_country_zone_id_country_code_pk" PRIMARY KEY("zone_id","country_code"),
	CONSTRAINT "shipping_zone_country_upper" CHECK ("shipping_zone_country"."country_code" = upper("shipping_zone_country"."country_code"))
);
--> statement-breakpoint
CREATE TABLE "tax_rate" (
	"country_code" char(2) PRIMARY KEY NOT NULL,
	"country_name" text NOT NULL,
	"is_eu" boolean DEFAULT false NOT NULL,
	"standard_rate_bp" integer NOT NULL,
	"valid_from" date NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tax_rate_bp_range" CHECK ("tax_rate"."standard_rate_bp" >= 0 AND "tax_rate"."standard_rate_bp" <= 10000),
	CONSTRAINT "tax_rate_country_upper" CHECK ("tax_rate"."country_code" = upper("tax_rate"."country_code"))
);
--> statement-breakpoint
CREATE TABLE "newsletter_subscriber" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"status" "newsletter_status" DEFAULT 'pending' NOT NULL,
	"token" text NOT NULL,
	"source" text,
	"locale" char(2) DEFAULT 'ru' NOT NULL,
	"confirmed_at" timestamp with time zone,
	"unsubscribed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "newsletter_email_lowercase" CHECK ("newsletter_subscriber"."email" = lower("newsletter_subscriber"."email"))
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "address" ADD CONSTRAINT "address_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wishlist" ADD CONSTRAINT "wishlist_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wishlist_item" ADD CONSTRAINT "wishlist_item_wishlist_id_wishlist_id_fk" FOREIGN KEY ("wishlist_id") REFERENCES "public"."wishlist"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wishlist_item" ADD CONSTRAINT "wishlist_item_product_id_product_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."product"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wishlist_item" ADD CONSTRAINT "wishlist_item_product_unit_id_product_unit_id_fk" FOREIGN KEY ("product_unit_id") REFERENCES "public"."product_unit"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "category" ADD CONSTRAINT "category_parent_id_category_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."category"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory" ADD CONSTRAINT "inventory_product_id_product_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."product"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product" ADD CONSTRAINT "product_brand_id_brand_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."brand"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product" ADD CONSTRAINT "product_category_id_category_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."category"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_image" ADD CONSTRAINT "product_image_product_id_product_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."product"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_image" ADD CONSTRAINT "product_image_product_unit_id_product_unit_id_fk" FOREIGN KEY ("product_unit_id") REFERENCES "public"."product_unit"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_unit" ADD CONSTRAINT "product_unit_product_id_product_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."product"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cart" ADD CONSTRAINT "cart_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cart_item" ADD CONSTRAINT "cart_item_cart_id_cart_id_fk" FOREIGN KEY ("cart_id") REFERENCES "public"."cart"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cart_item" ADD CONSTRAINT "cart_item_product_id_product_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."product"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cart_item" ADD CONSTRAINT "cart_item_product_unit_id_product_unit_id_fk" FOREIGN KEY ("product_unit_id") REFERENCES "public"."product_unit"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order" ADD CONSTRAINT "order_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order" ADD CONSTRAINT "order_shipping_method_id_shipping_method_id_fk" FOREIGN KEY ("shipping_method_id") REFERENCES "public"."shipping_method"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_item" ADD CONSTRAINT "order_item_order_id_order_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."order"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_item" ADD CONSTRAINT "order_item_product_id_product_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."product"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_item" ADD CONSTRAINT "order_item_product_unit_id_product_unit_id_fk" FOREIGN KEY ("product_unit_id") REFERENCES "public"."product_unit"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment" ADD CONSTRAINT "payment_order_id_order_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."order"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shipping_method" ADD CONSTRAINT "shipping_method_zone_id_shipping_zone_id_fk" FOREIGN KEY ("zone_id") REFERENCES "public"."shipping_zone"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shipping_zone_country" ADD CONSTRAINT "shipping_zone_country_zone_id_shipping_zone_id_fk" FOREIGN KEY ("zone_id") REFERENCES "public"."shipping_zone"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "account_provider_account_unique" ON "account" USING btree ("provider_id","account_id");--> statement-breakpoint
CREATE INDEX "account_user_id_idx" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "session_token_unique" ON "session" USING btree ("token");--> statement-breakpoint
CREATE INDEX "session_user_id_idx" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "session_expires_at_idx" ON "session" USING btree ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "user_email_unique" ON "user" USING btree ("email");--> statement-breakpoint
CREATE INDEX "user_role_idx" ON "user" USING btree ("role");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" USING btree ("identifier");--> statement-breakpoint
CREATE INDEX "verification_expires_at_idx" ON "verification" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "address_user_idx" ON "address" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "address_user_type_idx" ON "address" USING btree ("user_id","type");--> statement-breakpoint
CREATE UNIQUE INDEX "address_single_default_per_type" ON "address" USING btree ("user_id","type") WHERE "address"."is_default";--> statement-breakpoint
CREATE UNIQUE INDEX "wishlist_user_unique" ON "wishlist" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "wishlist_item_wishlist_idx" ON "wishlist_item" USING btree ("wishlist_id");--> statement-breakpoint
CREATE INDEX "wishlist_item_product_idx" ON "wishlist_item" USING btree ("product_id");--> statement-breakpoint
CREATE UNIQUE INDEX "wishlist_item_product_unique" ON "wishlist_item" USING btree ("wishlist_id","product_id") WHERE "wishlist_item"."product_unit_id" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "wishlist_item_unit_unique" ON "wishlist_item" USING btree ("wishlist_id","product_unit_id") WHERE "wishlist_item"."product_unit_id" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "brand_slug_unique" ON "brand" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "brand_name_unique" ON "brand" USING btree ("name");--> statement-breakpoint
CREATE INDEX "brand_featured_idx" ON "brand" USING btree ("is_featured");--> statement-breakpoint
CREATE UNIQUE INDEX "category_slug_unique" ON "category" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "category_parent_idx" ON "category" USING btree ("parent_id");--> statement-breakpoint
CREATE UNIQUE INDEX "inventory_product_unique" ON "inventory" USING btree ("product_id");--> statement-breakpoint
CREATE UNIQUE INDEX "product_slug_unique" ON "product" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "product_sku_unique" ON "product" USING btree ("sku");--> statement-breakpoint
CREATE INDEX "product_brand_idx" ON "product" USING btree ("brand_id");--> statement-breakpoint
CREATE INDEX "product_category_idx" ON "product" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "product_status_published_idx" ON "product" USING btree ("status","published_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "product_price_idx" ON "product" USING btree ("price_cents");--> statement-breakpoint
CREATE INDEX "product_search_idx" ON "product" USING gin ("search_vector");--> statement-breakpoint
CREATE INDEX "product_featured_idx" ON "product" USING btree ("is_featured") WHERE "product"."status" = 'active';--> statement-breakpoint
CREATE INDEX "product_image_product_idx" ON "product_image" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "product_image_unit_idx" ON "product_image" USING btree ("product_unit_id");--> statement-breakpoint
CREATE UNIQUE INDEX "product_image_product_position_unique" ON "product_image" USING btree ("product_id","position") WHERE "product_image"."product_unit_id" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "product_image_unit_position_unique" ON "product_image" USING btree ("product_unit_id","position") WHERE "product_image"."product_unit_id" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "product_image_single_primary" ON "product_image" USING btree ("product_id") WHERE "product_image"."is_primary" AND "product_image"."product_unit_id" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "product_unit_code_unique" ON "product_unit" USING btree ("unit_code");--> statement-breakpoint
CREATE UNIQUE INDEX "product_unit_serial_unique" ON "product_unit" USING btree ("serial_number") WHERE "product_unit"."serial_number" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "product_unit_product_idx" ON "product_unit" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "product_unit_product_status_idx" ON "product_unit" USING btree ("product_id","status");--> statement-breakpoint
CREATE INDEX "product_unit_price_idx" ON "product_unit" USING btree ("price_cents");--> statement-breakpoint
CREATE UNIQUE INDEX "cart_active_user_unique" ON "cart" USING btree ("user_id") WHERE "cart"."status" = 'active' AND "cart"."user_id" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "cart_guest_token_unique" ON "cart" USING btree ("guest_token") WHERE "cart"."guest_token" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "cart_status_expires_idx" ON "cart" USING btree ("status","expires_at");--> statement-breakpoint
CREATE INDEX "cart_item_cart_idx" ON "cart_item" USING btree ("cart_id");--> statement-breakpoint
CREATE INDEX "cart_item_product_idx" ON "cart_item" USING btree ("product_id");--> statement-breakpoint
CREATE UNIQUE INDEX "cart_item_product_unique" ON "cart_item" USING btree ("cart_id","product_id") WHERE "cart_item"."product_unit_id" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "cart_item_unit_unique" ON "cart_item" USING btree ("cart_id","product_unit_id") WHERE "cart_item"."product_unit_id" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "order_number_unique" ON "order" USING btree ("order_number");--> statement-breakpoint
CREATE UNIQUE INDEX "order_invoice_number_unique" ON "order" USING btree ("invoice_number") WHERE "order"."invoice_number" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "order_user_idx" ON "order" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "order_email_idx" ON "order" USING btree ("email");--> statement-breakpoint
CREATE INDEX "order_status_idx" ON "order" USING btree ("status");--> statement-breakpoint
CREATE INDEX "order_placed_at_idx" ON "order" USING btree ("placed_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "order_reservation_idx" ON "order" USING btree ("reservation_expires_at") WHERE "order"."status" = 'pending_payment';--> statement-breakpoint
CREATE INDEX "order_item_order_idx" ON "order_item" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "order_item_product_idx" ON "order_item" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "order_item_unit_idx" ON "order_item" USING btree ("product_unit_id");--> statement-breakpoint
CREATE UNIQUE INDEX "payment_idempotency_key_unique" ON "payment" USING btree ("idempotency_key");--> statement-breakpoint
CREATE UNIQUE INDEX "payment_provider_payment_unique" ON "payment" USING btree ("provider","provider_payment_id") WHERE "payment"."provider_payment_id" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "payment_order_idx" ON "payment" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "payment_status_idx" ON "payment" USING btree ("status");--> statement-breakpoint
CREATE INDEX "payment_quote_expires_idx" ON "payment" USING btree ("quote_expires_at") WHERE "payment"."status" = 'pending';--> statement-breakpoint
CREATE UNIQUE INDEX "webhook_event_provider_event_unique" ON "webhook_event" USING btree ("provider","event_id");--> statement-breakpoint
CREATE INDEX "webhook_event_unprocessed_idx" ON "webhook_event" USING btree ("received_at") WHERE "webhook_event"."processed_at" IS NULL;--> statement-breakpoint
CREATE INDEX "shipping_method_zone_idx" ON "shipping_method" USING btree ("zone_id");--> statement-breakpoint
CREATE UNIQUE INDEX "shipping_method_zone_name_unique" ON "shipping_method" USING btree ("zone_id","name");--> statement-breakpoint
CREATE UNIQUE INDEX "shipping_zone_name_unique" ON "shipping_zone" USING btree ("name");--> statement-breakpoint
CREATE UNIQUE INDEX "shipping_zone_country_unique" ON "shipping_zone_country" USING btree ("country_code");--> statement-breakpoint
CREATE INDEX "tax_rate_is_eu_idx" ON "tax_rate" USING btree ("is_eu");--> statement-breakpoint
CREATE UNIQUE INDEX "newsletter_email_unique" ON "newsletter_subscriber" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "newsletter_token_unique" ON "newsletter_subscriber" USING btree ("token");--> statement-breakpoint
CREATE INDEX "newsletter_status_idx" ON "newsletter_subscriber" USING btree ("status");