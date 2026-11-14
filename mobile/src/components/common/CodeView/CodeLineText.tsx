import { useMemo } from "react";
import { AppText } from "@/components/common/AppText/AppText";
import { syntax, type TypographyVariant } from "@/theme/tokens";
import { tokenizeJavaScript, type CodeToken } from "./tokenizeJavaScript";

export const TOKEN_COLOURS: Record<CodeToken["kind"], string> = {
  plain: syntax.plain,
  keyword: syntax.keyword,
  string: syntax.string,
  number: syntax.number,
  comment: syntax.comment,
  operator: syntax.operator,
  functionName: syntax.functionName,
  punctuation: syntax.punctuation,
};

type Props = { text: string; variant?: TypographyVariant; fontSize?: number; lineHeight?: number };

/** One line of code in syntax colours, for answer inputs that show code outside a `CodeView`. */
export function CodeLineText({ text, variant = "code", fontSize, lineHeight }: Props) {
  const [tokens] = useMemo(() => tokenizeJavaScript([text]), [text]);
  const size = fontSize === undefined ? undefined : { fontSize, lineHeight };
  return (
    <AppText variant={variant} align="ltr" style={size}>
      {tokens.map((token, index) => (
        <AppText key={index} variant={variant} color={TOKEN_COLOURS[token.kind]} style={size}>
          {token.text}
        </AppText>
      ))}
    </AppText>
  );
}
