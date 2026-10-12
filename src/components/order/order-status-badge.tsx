import { Badge } from "@/components/ui/badge";
import { ORDER_STATUS_META, type OrderStatus } from "@/lib/constants/order-status";

export function OrderStatusBadge({
  status,
  className,
}: {
  status: string;
  className?: string;
}) {
  const meta = ORDER_STATUS_META[status as OrderStatus];

  // Неизвестный статус не должен ломать страницу: показываем как есть.
  if (!meta) {
    return <Badge className={className}>{status}</Badge>;
  }

  return (
    <Badge variant={meta.variant} className={className}>
      {meta.label}
    </Badge>
  );
}
