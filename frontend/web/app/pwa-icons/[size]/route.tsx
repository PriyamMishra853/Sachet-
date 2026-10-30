import { ImageResponse } from "next/og";

// App icons, drawn from code at build time: the white shield-and-alert mark
// on Sachet navy (the same mark as the site header).
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
        background: "#0b3d91",
        borderRadius: maskable ? 0 : "22%",
      }}
    >
      <svg
        width={px * (maskable ? 0.5 : 0.64)}
        height={px * (maskable ? 0.5 : 0.64)}
        viewBox="0 0 32 32"
      >
        <path
          d="M16 2.5 4.5 7v8.2c0 7 4.9 12.3 11.5 14.3 6.6-2 11.5-7.3 11.5-14.3V7L16 2.5Z"
          fill="#ffffff"
        />
        <path d="M16 9v8" stroke="#0b3d91" strokeWidth="3" strokeLinecap="round" />
        <circle cx="16" cy="22" r="1.9" fill="#0b3d91" />
      </svg>
    </div>,
    { width: px, height: px },
  );
}
