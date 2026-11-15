import { I18nManager, Image, Platform, Share } from "react-native";
import { File, Paths } from "expo-file-system";
import { FontWeight, ImageFormat, Skia, TextAlign, TextDirection, type SkCanvas } from "@shopify/react-native-skia";
import { palette } from "@/theme/tokens";
import { logError } from "@/utils/logger";
import logo from "../../../assets/icon.png";

/** What a card says (PRD 14.4): a headline, a line under it, and for a daily challenge its squares. */
export type ShareCardContent = { title: string; subtitle: string; squares?: boolean[] };

const WIDTH = 1080;
const HEIGHT = 1350;
const MARGIN = 96;
const LOGO_SIZE = 600;
const SQUARE = 96;
const SQUARE_GAP = 24;
const FOOTER = "platyko.com";

function drawText(canvas: SkCanvas, text: string, y: number, fontSize: number, colour: string, bold = false): number {
  const paragraph = Skia.ParagraphBuilder.Make({ textAlign: TextAlign.Center, textDirection: I18nManager.isRTL ? TextDirection.RTL : TextDirection.LTR, maxLines: 2, ellipsis: "…" })
    .pushStyle({ color: Skia.Color(colour), fontSize, fontStyle: { weight: bold ? FontWeight.Bold : FontWeight.Normal } })
    .addText(text)
    .build();
  paragraph.layout(WIDTH - 2 * MARGIN);
  paragraph.paint(canvas, MARGIN, y);
  return paragraph.getHeight();
}

/**
 * Draws the card on the device with no network (PRD 14.4): the logo, the headline and line, the
 * daily challenge's squares (right or wrong only, never the questions) and the site name. Returns
 * the PNG file's address.
 */
async function renderShareCard(content: ShareCardContent): Promise<string> {
  const surface = Skia.Surface.Make(WIDTH, HEIGHT);
  const logoImage = Skia.Image.MakeImageFromEncoded(await Skia.Data.fromURI(Image.resolveAssetSource(logo).uri));
  if (!surface || !logoImage) throw new Error("share card: drawing surface or logo unavailable");
  const canvas = surface.getCanvas();
  canvas.drawColor(Skia.Color(palette.bg.base));

  const logoLeft = (WIDTH - LOGO_SIZE) / 2;
  canvas.save();
  canvas.clipRRect(Skia.RRectXY(Skia.XYWHRect(logoLeft, MARGIN, LOGO_SIZE, LOGO_SIZE), 72, 72), 1, true);
  canvas.drawImageRect(logoImage, Skia.XYWHRect(0, 0, logoImage.width(), logoImage.height()), Skia.XYWHRect(logoLeft, MARGIN, LOGO_SIZE, LOGO_SIZE), Skia.Paint());
  canvas.restore();

  let y = MARGIN + LOGO_SIZE + 64;
  y += drawText(canvas, content.title, y, 84, palette.text.primary, true) + 24;
  y += drawText(canvas, content.subtitle, y, 44, palette.text.muted) + 48;
  if (content.squares) {
    const rowWidth = content.squares.length * SQUARE + (content.squares.length - 1) * SQUARE_GAP;
    // The order is the order played, left to right in every language, as on screen.
    content.squares.forEach((right, index) => {
      const paint = Skia.Paint();
      paint.setColor(Skia.Color(right ? palette.state.success : palette.state.danger));
      canvas.drawRRect(Skia.RRectXY(Skia.XYWHRect((WIDTH - rowWidth) / 2 + index * (SQUARE + SQUARE_GAP), y, SQUARE, SQUARE), 20, 20), paint);
    });
  }
  drawText(canvas, FOOTER, HEIGHT - MARGIN - 44, 36, palette.brand.js, true);

  const file = new File(Paths.cache, "platyko-share.png");
  if (file.exists) file.delete();
  file.create();
  file.write(surface.makeImageSnapshot().encodeToBytes(ImageFormat.PNG));
  return file.uri;
}

/**
 * Opens the system share sheet (PRD 14.4) with the card as an image on iOS. Android's share sheet
 * in React Native takes text only, so there, and if drawing fails, the same result goes as text.
 */
export async function shareCard(content: ShareCardContent, text: string): Promise<void> {
  if (Platform.OS === "ios") {
    try {
      await Share.share({ url: await renderShareCard(content) });
      return;
    } catch (error) {
      logError("[SHARE]", error, { phase: "card" });
    }
  }
  await Share.share({ message: text });
}
