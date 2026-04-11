export type Style = "locale-long" | "locale-short" | "Monday, Jan 1, 2020";

const formatOptions: Record<Style, Intl.DateTimeFormatOptions> = {
    "locale-long": { dateStyle: "long" },
    "locale-short": { dateStyle: "short" },
    "Monday, Jan 1, 2020": {
        weekday: "long",
        month: "short",
        day: "numeric",
        year: "numeric",
    },
};

export function getFormatterForStyle(
    style: Style,
    timeZone?: string,
): Intl.DateTimeFormat {
    return new Intl.DateTimeFormat(undefined, {
        ...formatOptions[style],
        timeZone,
    });
}
