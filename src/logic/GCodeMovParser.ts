export function parseNumber(
    line: string,
    letter: string,
): number | null {
    const regex = new RegExp(
        `${letter}(-?\\d*\\.?\\d+)`,
        "i",
    );

    const match = line.match(regex);

    if (!match) return null;

    return Number(match[1]);
}