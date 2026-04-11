import type { Element, Node, Parent, RootContent, Text } from "hast";
import { h, s } from "hastscript";
import { twMerge } from "tailwind-merge";
import { CONTINUE, EXIT, visit } from "unist-util-visit";

const calloutIconClasses = "me-2 inline align-sub" as const;
const icons = {
    infoCircle: s(
        `svg.${calloutIconClasses.replace(" ", ".")}`,
        {
            xmlns: "http://www.w3.org/2000/svg",
            viewBox: "0 0 512 512",
            width: "1em",
            height: "1em",
        },
        [
            s("path", {
                fill: "currentColor",
                d: "M256 512a256 256 0 1 0 0-512a256 256 0 1 0 0 512m-32-352a32 32 0 1 1 64 0a32 32 0 1 1-64 0m-8 64h48c13.3 0 24 10.7 24 24v88h8c13.3 0 24 10.7 24 24s-10.7 24-24 24h-80c-13.3 0-24-10.7-24-24s10.7-24 24-24h24v-64h-24c-13.3 0-24-10.7-24-24s10.7-24 24-24",
            }),
        ],
    ),
    warning: s(
        `svg.${calloutIconClasses.replace(" ", ".")}`,
        {
            xmlns: "http://www.w3.org/2000/svg",
            viewBox: "0 0 640 640",
            width: "1em",
            height: "1em",
        },
        [
            s("path", {
                fill: "currentColor",
                d: "M320 64c14.7 0 28.2 8.1 35.2 21l216 400c6.7 12.4 6.4 27.4-.8 39.5S550.1 544 536 544H104c-14.1 0-27.2-7.4-34.4-19.5s-7.5-27.1-.8-39.5l216-400c7-12.9 20.5-21 35.2-21m0 352c-17.7 0-32 14.3-32 32s14.3 32 32 32s32-14.3 32-32s-14.3-32-32-32m0-192c-18.2 0-32.7 15.5-31.4 33.7l7.4 104c.9 12.5 11.4 22.3 23.9 22.3c12.6 0 23-9.7 23.9-22.3l7.4-104c1.3-18.2-13.1-33.7-31.4-33.7z",
            }),
        ],
    ),
} as const satisfies Record<string, RootContent>;

const calloutStyles = {
    NOTE: {
        label: "Note",
        classes: "bg-sky-300/30 border-sky-400",
        icon: icons.infoCircle,
    },
    WARNING: {
        label: "Warning",
        classes: "bg-amber-300/30 border-amber-400",
        icon: icons.warning,
    },
    IMPORTANT: {
        label: "Important",
        classes: "bg-purple-300/30 border-purple-400",
        icon: icons.infoCircle,
    },
} as const satisfies Record<
    string,
    { label: string; classes: string; icon: RootContent }
>;
type CalloutStyle = keyof typeof calloutStyles;

function createCallout(
    style: CalloutStyle,
    title: string | undefined,
    content: RootContent[],
): Element {
    const baseClasses =
        "prose-p:my-2 prose-p:last:mb-0 prose-base my-8 rounded-md border p-4 leading-normal";
    const classes = twMerge(`${baseClasses} ${calloutStyles[style].classes}`);
    const selector = `aside.${classes.replaceAll(" ", ".")}`;
    const labelClasses = "mb-1 font-bold";
    return h(selector, [
        h(`div.${labelClasses.replaceAll(" ", ".")}`, [
            calloutStyles[style].icon,
            title ?? calloutStyles[style].label,
        ]),
        ...content,
    ]);
}

export function rehypeGitHubStyleCallouts() {
    return (tree: Node) => {
        visit(
            tree,
            { type: "element", tagName: "blockquote" },
            (quote: Element, index: number, parent: Parent) => {
                // Find first text child
                let firstTextChild: Text | undefined;
                visit(quote, "text", (text: Text) => {
                    if (text.value.match(/^\s+$/)) {
                        return CONTINUE;
                    } else {
                        firstTextChild = text;
                        return EXIT;
                    }
                });
                if (!firstTextChild) return;

                // Find callout marker
                const match = firstTextChild.value.match(
                    /\[!(?<style>\w+)\](?:[ \t]+(?<title>[^\n]*))?\n+/,
                );
                if (!match) return; // Blockquote is not a callout
                if (!(match.groups!.style in calloutStyles)) {
                    throw new Error(
                        `Got unsupported callout style "${match.groups!.style}"`,
                    );
                }
                const style = match.groups!.style as CalloutStyle;
                const title = match.groups?.title;
                // Remove callout marker
                firstTextChild.value = firstTextChild.value.slice(
                    match[0].length,
                );

                // Replace blockquote element with callout element
                parent.children.splice(
                    index,
                    1,
                    createCallout(style, title, quote.children),
                );
            },
        );
    };
}
