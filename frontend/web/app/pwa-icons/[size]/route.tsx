import { ImageResponse } from "next/og";

// App icons, drawn from code at build time: a white "!" on Sachet green.
// "maskable" fills the whole square (Android crops it to a circle or
// squircle), so the mark stays inside the central safe zone.
const SIZES = { "180": 180, "192": 192, "512": 512, maskable: 512 } as const;
type Size = keyof typeof SIZES;

export const dynamic = "force-static";

export function generateStaticParams() {
  return Object.keys(SIZES).map((size) => ({ size }));
}

export async function GET(_req: Request, { params }: { params: Promise<{ size: string }> }) {
  const { size } = await params;
  if (!(size in SIZES)) return new Response("Not found", { status: 404 });
  const px = SIZES[size as Size];
  const maskable = size === "maskable";

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: maskable ? "#0f5132" : "transparent",
      }}
    >
      <div
        style={{
          width: maskable ? "60%" : "100%",
          height: maskable ? "60%" : "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0f5132",
          borderRadius: maskable ? 0 : "22%",
          color: "white",
          fontSize: px * (maskable ? 0.42 : 0.62),
          fontWeight: 800,
        }}
      >
        !
      </div>
    </div>,
    { width: px, height: px },
  );
}
