import Feather from "@expo/vector-icons/Feather";
import * as Clipboard from "expo-clipboard";
import { Image } from "expo-image";
import * as Sharing from "expo-sharing";
import { useEffect, useRef, useState } from "react";

// expo-file-system is loaded defensively: it was added to package.json
// after the current preview/production EAS binaries were built, so an
// OTA Update can deliver this JS to clients whose native side doesn't
// have FileSystem autolinked yet. require() is wrapped so the modal
// still mounts; the Share/Save buttons disable when FileSystem is
// missing and Copy keeps working. After the next `eas build`, the
// module loads normally on all clients.
type FileSystemModule = typeof import("expo-file-system/legacy");
let fileSystemModule: FileSystemModule | null | undefined;
function loadFileSystem(): FileSystemModule | null {
  if (fileSystemModule !== undefined) return fileSystemModule;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    fileSystemModule = require("expo-file-system/legacy") as FileSystemModule;
  } catch {
    fileSystemModule = null;
  }
  return fileSystemModule;
}
import {
  ActivityIndicator,
  Animated,
  Easing,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";

import { colors, fonts, radii, spacing, text } from "@/constants/theosis-theme";
import { getApiBaseUrl } from "@/lib/api";

// Quote-card share modal. Renders a preview of the /api/quote-card image
// and offers three actions:
//   - Share — downloads the PNG to a cache file, hands it to the platform
//     share sheet via expo-sharing.
//   - Save — same download, then prompts the OS to save to Files / Photos.
//   - Copy — copies a plain-text version of the quote to the clipboard.
//
// The OG endpoint takes (text, attribution, reference, kind) as query
// params; the rendered card is exactly what the recipient sees in their
// app of choice, so the preview is the ground truth.

export type QuoteCardKind = "verse" | "father";

type QuoteCardModalProps = {
  visible: boolean;
  onClose: () => void;
  text: string;
  attribution?: string;
  reference?: string;
  kind?: QuoteCardKind;
};

export function QuoteCardModal({
  visible,
  onClose,
  text: quoteText,
  attribution,
  reference,
  kind = "verse",
}: QuoteCardModalProps) {
  const { height: screenHeight } = useWindowDimensions();
  const translateY = useRef(new Animated.Value(screenHeight)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const [busy, setBusy] = useState<"share" | "save" | "copy" | null>(null);
  const [copied, setCopied] = useState(false);
  const [imageError, setImageError] = useState(false);
  // `false` means we have FileSystem (or haven't checked yet, treated as
  // available so the buttons stay enabled). Flipped to `true` only after
  // a confirmed missing-module probe so the affordance doesn't flicker.
  const fileSystemMissing = loadFileSystem() === null;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: visible ? 0 : screenHeight,
        duration: 260,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(backdropOpacity, {
        toValue: visible ? 0.55 : 0,
        duration: 260,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [visible, screenHeight, translateY, backdropOpacity]);

  // Reset transient state on each open. (The previous quote's flash should
  // not bleed into a freshly opened modal.)
  useEffect(() => {
    if (visible) {
      setBusy(null);
      setCopied(false);
      setImageError(false);
    }
  }, [visible]);

  const params = new URLSearchParams();
  params.set("text", quoteText);
  if (attribution) params.set("attribution", attribution);
  if (reference) params.set("ref", reference);
  params.set("kind", kind);
  const imageUrl = `${getApiBaseUrl()}/api/quote-card?${params.toString()}`;
  const baseSlug = (reference || attribution || "quote")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
  const filename = `theosis-${baseSlug || "quote"}.png`;

  async function downloadToCache(): Promise<string | null> {
    const fs = loadFileSystem();
    if (!fs) return null;
    const cacheDir = fs.cacheDirectory ?? fs.documentDirectory;
    if (!cacheDir) return null;
    const target = `${cacheDir}${filename}`;
    const result = await fs.downloadAsync(imageUrl, target);
    if (result.status !== 200) {
      throw new Error(`download failed: HTTP ${result.status}`);
    }
    return result.uri;
  }

  async function withBusy<T>(
    kind: NonNullable<typeof busy>,
    work: () => Promise<T>,
  ) {
    setBusy(kind);
    try {
      return await work();
    } catch (err) {
      console.warn("[quote-card-modal]", kind, "failed:", err);
    } finally {
      setBusy(null);
    }
  }

  async function handleShare() {
    await withBusy("share", async () => {
      const uri = await downloadToCache();
      if (!uri) return; // FileSystem not linked — gracefully no-op.
      const available = await Sharing.isAvailableAsync();
      if (!available) return;
      await Sharing.shareAsync(uri, {
        dialogTitle: "Share quote",
        mimeType: "image/png",
        UTI: "public.png",
      });
    });
  }

  async function handleSave() {
    // Same download + share flow, but with a wording that nudges the user
    // toward "Save to Files" / "Save Image" rather than "Share to ___".
    // expo-sharing on iOS/Android already exposes the same destinations
    // (Files, Photos, etc.), so this is really a label difference.
    await withBusy("save", async () => {
      const uri = await downloadToCache();
      if (!uri) return;
      const available = await Sharing.isAvailableAsync();
      if (!available) return;
      await Sharing.shareAsync(uri, {
        dialogTitle: "Save quote card",
        mimeType: "image/png",
        UTI: "public.png",
      });
    });
  }

  async function handleCopy() {
    await withBusy("copy", async () => {
      const lines = [quoteText];
      if (attribution) {
        lines.push(
          `— ${attribution}${reference ? `, ${reference}` : ""}`,
        );
      } else if (reference) {
        lines.push(`— ${reference}`);
      }
      lines.push("via Theosis");
      await Clipboard.setStringAsync(lines.join("\n"));
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.root}>
        <Animated.View
          style={[styles.backdrop, { opacity: backdropOpacity }]}
        >
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={onClose}
            accessibilityLabel="Close share card"
          />
        </Animated.View>

        <Animated.View
          style={[styles.sheet, { transform: [{ translateY }] }]}
        >
          <View style={styles.handle} />

          <View style={styles.header}>
            <Text style={styles.eyebrow}>Share</Text>
            <Text style={styles.title}>Quote card</Text>
          </View>

          <View style={styles.previewWrap}>
            {imageError ? (
              <View style={styles.previewError}>
                <Feather name="image" size={28} color={colors.inkSoft} />
                <Text style={styles.previewErrorLabel}>
                  Couldn&apos;t load preview
                </Text>
              </View>
            ) : (
              <>
                <Image
                  source={{ uri: imageUrl }}
                  style={styles.previewImage}
                  contentFit="cover"
                  accessibilityLabel="Quote card preview"
                  onError={() => setImageError(true)}
                />
                {/* expo-image doesn't expose loading state directly here;
                    spin only while a button is busy, which is the only
                    moment image freshness actually matters. */}
              </>
            )}
          </View>

          <View style={styles.actionRow}>
            <ShareAction
              icon="share-2"
              label={busy === "share" ? "…" : "Share"}
              primary
              onPress={handleShare}
              disabled={busy !== null || fileSystemMissing}
              busy={busy === "share"}
            />
            <ShareAction
              icon="download"
              label={busy === "save" ? "…" : "Save"}
              onPress={handleSave}
              disabled={busy !== null || fileSystemMissing}
              busy={busy === "save"}
            />
            <ShareAction
              icon={copied ? "check" : "copy"}
              label={copied ? "Copied" : "Copy text"}
              onPress={handleCopy}
              disabled={busy !== null}
              busy={busy === "copy"}
            />
          </View>

          {fileSystemMissing ? (
            <Text style={styles.fallbackNote}>
              Image sharing needs a fresh app update — copy the text for
              now, or update to the latest build.
            </Text>
          ) : null}
        </Animated.View>
      </View>
    </Modal>
  );
}

function ShareAction({
  icon,
  label,
  primary,
  onPress,
  disabled,
  busy,
}: {
  icon: React.ComponentProps<typeof Feather>["name"];
  label: string;
  primary?: boolean;
  onPress: () => void;
  disabled?: boolean;
  busy?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.action,
        primary && styles.actionPrimary,
        disabled && { opacity: 0.6 },
        pressed && !disabled && { opacity: 0.8 },
      ]}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      {busy ? (
        <ActivityIndicator
          size="small"
          color={primary ? colors.accent : colors.inkMuted}
        />
      ) : (
        <Feather
          name={icon}
          size={18}
          color={primary ? colors.accent : colors.inkMuted}
        />
      )}
      <Text
        style={[
          styles.actionLabel,
          primary && styles.actionLabelPrimary,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: "flex-end" },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "#000" },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing["3xl"],
    borderTopWidth: StyleSheet.hairlineWidth,
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderColor: colors.lineStrong,
  },
  handle: {
    alignSelf: "center",
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.lineStrong,
    marginBottom: spacing.lg,
  },
  header: {
    gap: 2,
    marginBottom: spacing.md,
  },
  eyebrow: {
    ...text.eyebrowAccent,
    fontSize: 10,
  },
  title: {
    fontFamily: fonts.serifBold,
    fontSize: 22,
    color: colors.ink,
    letterSpacing: -0.3,
  },
  previewWrap: {
    aspectRatio: 1,
    borderRadius: radii.card,
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    backgroundColor: colors.background,
    marginBottom: spacing.lg,
  },
  previewImage: {
    width: "100%",
    height: "100%",
  },
  previewError: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
  },
  previewErrorLabel: {
    fontFamily: fonts.sans,
    fontSize: 12,
    color: colors.inkSoft,
  },
  actionRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  action: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: spacing.md,
    borderRadius: radii.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    backgroundColor: colors.background,
  },
  actionPrimary: {
    borderColor: colors.lineGilt,
    backgroundColor: colors.accentSoft,
  },
  actionLabel: {
    fontFamily: fonts.sans,
    fontSize: 10,
    color: colors.inkMuted,
    letterSpacing: 1.8,
    textTransform: "uppercase",
    marginTop: 2,
  },
  actionLabelPrimary: {
    color: colors.accent,
  },
  fallbackNote: {
    fontFamily: fonts.serifItalic,
    fontSize: 12,
    lineHeight: 18,
    color: colors.inkSoft,
    marginTop: spacing.md,
    textAlign: "center",
  },
});
