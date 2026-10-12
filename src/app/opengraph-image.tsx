import { ImageResponse } from "next/og";

/**
 * Картинка для соцсетей и мессенджеров.
 *
 * Генерируется на сборке из тех же значений, что и сайт: ночной фон,
 * сталь, люминофор. Шрифты не подключаем — системные в этом размере
 * выглядят достойно и не тянут 300 КБ в сборку.
 */
export const alt = "UHRENWERK — швейцарские и люксовые часы";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        background: "#f7f4ef",
        padding: "72px",
        fontFamily: "sans-serif",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 16,
          fontSize: 26,
          letterSpacing: 6,
          textTransform: "uppercase",
          color: "#171410",
        }}
      >
        <div
          style={{
            width: 14,
            height: 14,
            borderRadius: 999,
            background: "#8a6a35",
          }}
        />
        Uhrenwerk
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        <div
          style={{
            display: "flex",
            fontSize: 92,
            fontWeight: 600,
            letterSpacing: -3,
            lineHeight: 1,
            color: "#171410",
          }}
        >
          Время, которое
          <br />
          выбирают однажды
        </div>
        <div style={{ display: "flex", fontSize: 30, color: "#56514a" }}>
          Механические часы с проверкой подлинности
        </div>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 20,
          fontSize: 22,
          color: "#8a6a35",
          letterSpacing: 4,
          textTransform: "uppercase",
        }}
      >
        <div style={{ width: 80, height: 2, background: "#8a6a35" }} />
        Новые и pre-owned
      </div>
    </div>,
    size,
  );
}
