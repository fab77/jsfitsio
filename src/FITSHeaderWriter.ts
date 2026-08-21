import { FITSHeaderManager } from "./model/FITSHeaderManager.js";

export class FITSHeaderWriter {
  private static readonly BLOCK_SIZE = 2880;
  private static readonly CARD_SIZE = 80;

  private static readonly INTEGER_KEYWORDS = new Set([
    "BITPIX",
    "NAXIS",
    "PCOUNT",
    "GCOUNT",
  ]);

  private static readonly LOGICAL_KEYWORDS = new Set(["SIMPLE", "EXTEND"]);

  static serialize(header: FITSHeaderManager, primary: boolean): Uint8Array {
    const items = header.getItems();

    const map = new Map(items.map((item) => [item.key.toUpperCase(), item]));

    const cards: string[] = [];

    FITSHeaderWriter.appendMandatoryCards(cards, map, primary);

    FITSHeaderWriter.appendRemainingCards(cards, items);

    cards.push(FITSHeaderWriter.card80("END"));

    return FITSHeaderWriter.encodeAndPad(cards);
  }

  private static appendMandatoryCards(
    cards: string[],
    map: Map<string, any>,
    primary: boolean,
  ): void {
    if (primary) {
      const simple = map.get("SIMPLE");

      if (!simple) {
        throw new Error("Missing mandatory SIMPLE card in Primary HDU");
      }

      cards.push(
        ...FITSHeaderWriter.makeKeywordWithComment(
          "SIMPLE",
          simple.value,
          simple.comment,
        ),
      );
    } else {
      const xtension = map.get("XTENSION");

      if (!xtension) {
        throw new Error("Missing mandatory XTENSION card in extension HDU");
      }

      cards.push(
        ...FITSHeaderWriter.makeKeywordWithComment(
          "XTENSION",
          xtension.value,
          xtension.comment,
        ),
      );
    }

    const bitpix = map.get("BITPIX");

    if (!bitpix) {
      throw new Error("Missing mandatory BITPIX card");
    }

    cards.push(
      ...FITSHeaderWriter.makeKeywordWithComment(
        "BITPIX",
        bitpix.value,
        bitpix.comment,
      ),
    );

    const naxis = map.get("NAXIS");

    if (!naxis) {
      throw new Error("Missing mandatory NAXIS card");
    }

    const nAxes = Number(naxis.value);

    if (!Number.isInteger(nAxes) || nAxes < 0) {
      throw new Error(`Invalid NAXIS value: ${naxis.value}`);
    }

    cards.push(
      ...FITSHeaderWriter.makeKeywordWithComment("NAXIS", nAxes, naxis.comment),
    );

    for (let axis = 1; axis <= nAxes; axis++) {
      const key = `NAXIS${axis}`;

      const item = map.get(key);

      if (!item) {
        throw new Error(`Missing mandatory ${key} card`);
      }

      cards.push(
        ...FITSHeaderWriter.makeKeywordWithComment(
          key,
          item.value,
          item.comment,
        ),
      );
    }

    if (!primary) {
      const pcount = map.get("PCOUNT");

      const gcount = map.get("GCOUNT");

      if (!pcount) {
        throw new Error("Missing mandatory PCOUNT card in extension HDU");
      }

      if (!gcount) {
        throw new Error("Missing mandatory GCOUNT card in extension HDU");
      }

      cards.push(
        ...FITSHeaderWriter.makeKeywordWithComment(
          "PCOUNT",
          pcount.value,
          pcount.comment,
        ),
      );

      cards.push(
        ...FITSHeaderWriter.makeKeywordWithComment(
          "GCOUNT",
          gcount.value,
          gcount.comment,
        ),
      );
    }

    if (primary) {
      const extend = map.get("EXTEND");

      if (extend) {
        cards.push(
          ...FITSHeaderWriter.makeKeywordWithComment(
            "EXTEND",
            extend.value,
            extend.comment,
          ),
        );
      }
    }
  }

  private static appendRemainingCards(
    cards: string[],
    items: ReturnType<FITSHeaderManager["getItems"]>,
  ): void {
    for (const item of items) {
      const key = item.key.toUpperCase();

      if (
        key === "SIMPLE" ||
        key === "XTENSION" ||
        key === "BITPIX" ||
        key === "NAXIS" ||
        /^NAXIS\d+$/.test(key) ||
        key === "PCOUNT" ||
        key === "GCOUNT" ||
        key === "EXTEND" ||
        key === "END"
      ) {
        continue;
      }

      cards.push(
        ...FITSHeaderWriter.makeKeywordWithComment(
          item.key,
          item.value,
          item.comment,
        ),
      );
    }
  }

  private static makeKeywordWithComment(
    key: string,
    value: unknown,
    comment?: string,
  ): string[] {
    const normalized = key.toUpperCase();

    if (normalized === "END") {
      return [FITSHeaderWriter.card80("END")];
    }

    if (normalized === "COMMENT" || normalized === "HISTORY") {
      return FITSHeaderWriter.makeCommentCards(
        normalized as "COMMENT" | "HISTORY",
        String(value ?? comment ?? ""),
      );
    }

    let base =
      FITSHeaderWriter.keyword(normalized) +
      FITSHeaderWriter.valueField20(normalized, value);

    if (!comment || comment.length === 0) {
      return [FITSHeaderWriter.card80(base)];
    }

    const addition = ` / ${comment}`;

    const spaceLeft = FITSHeaderWriter.CARD_SIZE - base.length;

    if (spaceLeft <= 0) {
      return [
        FITSHeaderWriter.card80(base),
        ...FITSHeaderWriter.makeCommentCards("COMMENT", comment),
      ];
    }

    base += addition.slice(0, spaceLeft);

    const overflow = addition.slice(spaceLeft).replace(/^\s*\/\s*/, "");

    if (overflow.length === 0) {
      return [FITSHeaderWriter.card80(base)];
    }

    return [
      FITSHeaderWriter.card80(base),
      ...FITSHeaderWriter.makeCommentCards("COMMENT", overflow),
    ];
  }

  private static makeCommentCards(
    kind: "COMMENT" | "HISTORY",
    text: string,
  ): string[] {
    const prefix = FITSHeaderWriter.keyword(kind);

    const width = FITSHeaderWriter.CARD_SIZE - prefix.length;

    const value = String(text ?? "");

    if (value.length === 0) {
      return [FITSHeaderWriter.card80(prefix)];
    }

    const cards: string[] = [];

    for (let offset = 0; offset < value.length; offset += width) {
      cards.push(
        FITSHeaderWriter.card80(prefix + value.slice(offset, offset + width)),
      );
    }

    return cards;
  }

  private static valueField20(key: string, value: unknown): string {
    if (FITSHeaderWriter.LOGICAL_KEYWORDS.has(key)) {
      const logical =
        value === true || value === "T" || value === "t" ? "T" : "F";

      return `= ${logical.padStart(20, " ")}`;
    }

    if (FITSHeaderWriter.INTEGER_KEYWORDS.has(key) || /^NAXIS\d+$/.test(key)) {
      const number = Number(value);

      if (!Number.isFinite(number) || !Number.isInteger(number)) {
        throw new Error(`FITS header: ${key} must be an integer, got ${value}`);
      }

      return `= ${String(number).padStart(20, " ")}`;
    }

    if (typeof value === "number") {
      let encoded = Number.isInteger(value)
        ? String(value)
        : value.toExponential(10).replace("e", "E");

      if (encoded.length > 20) {
        encoded = value.toExponential(8).replace("e", "E");
      }

      return `= ${encoded.padStart(20, " ")}`;
    }

    if (typeof value === "string") {
      return `= ${FITSHeaderWriter.quoteFitsString(value)}`;
    }

    return "";
  }

  private static quoteFitsString(value: string): string {
    const unquoted = value.replace(/^'+|'+$/g, "");

    const escaped = unquoted.replace(/'/g, "''");

    return `'${escaped}'`;
  }

  private static keyword(value: string): string {
    return (value ?? "").toUpperCase().padEnd(8, " ").slice(0, 8);
  }

  private static card80(value: string): string {
    if (value.length >= FITSHeaderWriter.CARD_SIZE) {
      return value.slice(0, FITSHeaderWriter.CARD_SIZE);
    }

    return value.padEnd(FITSHeaderWriter.CARD_SIZE, " ");
  }

  private static encodeAndPad(cards: string[]): Uint8Array {
    let header = cards.join("");

    const remainder = header.length % FITSHeaderWriter.BLOCK_SIZE;

    if (remainder !== 0) {
      header += " ".repeat(FITSHeaderWriter.BLOCK_SIZE - remainder);
    }

    return new TextEncoder().encode(header);
  }
}
