import "server-only";
import sharp from "sharp";

// Re-encode an uploaded image to strip ALL metadata (including EXIF GPS, which
// phone cameras embed and which would otherwise leak the property location to
// recipients), auto-orient from the EXIF orientation flag before dropping it,
// and downscale oversized photos. Downscaling also keeps storage cost down.
//
// sharp drops metadata by default unless withMetadata() is called, so we simply
// never call it. Returns the processed bytes and the canonical content type.
const MAX_DIMENSION = 2000;

export async function processImage(
  input: Buffer,
  mime: string,
): Promise<{ data: Buffer; mime: string }> {
  const pipeline = sharp(input, { failOn: "error" })
    .rotate() // apply + clear EXIF orientation
    .resize({
      width: MAX_DIMENSION,
      height: MAX_DIMENSION,
      fit: "inside",
      withoutEnlargement: true,
    });

  if (mime === "image/png") {
    return { data: await pipeline.png({ compressionLevel: 9 }).toBuffer(), mime };
  }
  if (mime === "image/webp") {
    return { data: await pipeline.webp({ quality: 82 }).toBuffer(), mime };
  }
  // Default everything else (jpeg) to a clean, reasonably compressed JPEG.
  return {
    data: await pipeline.jpeg({ quality: 82, mozjpeg: true }).toBuffer(),
    mime: "image/jpeg",
  };
}
