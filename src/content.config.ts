import {
    defineCollection,
    z,
    reference,
    type SchemaContext,
} from "astro:content";
import { glob, file } from "astro/loaders";
import { GH_API_TOKEN, SKIP_REMOTE } from "astro:env/server";

const CONTRIBUTIONS_QUERY = `
query($username: String!, $from: DateTime!, $to: DateTime!) {
    user(login: $username) {
        contributionsCollection(from: $from, to: $to) {
            contributionCalendar {
                totalContributions
                weeks {
                    contributionDays {
                        contributionCount
                        date
                        weekday
                    }
                }
            }
        }
    }
}`;

async function fetchYearContributions(
    username: string,
    from: Date,
    to: Date,
) {
    const response = await fetch("https://api.github.com/graphql", {
        method: "POST",
        cache: "no-store",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${GH_API_TOKEN}`,
        },
        body: JSON.stringify({
            query: CONTRIBUTIONS_QUERY,
            variables: {
                username,
                from: from.toISOString(),
                to: to.toISOString(),
            },
        }),
    });

    if (!response.ok) {
        throw new Error(
            `GitHub API error: ${response.status} ${response.statusText}`,
        );
    }

    const data = await response.json();
    const calendar =
        data?.data?.user?.contributionsCollection?.contributionCalendar;

    if (!calendar) throw new Error("Failed to parse GitHub contribution data");

    return {
        totalContributions: calendar.totalContributions,
        weeks: calendar.weeks as any[],
    };
}

const ProjectSchema = ({ image }: SchemaContext) =>
    z
        .object({
            title: z.string(),
            tagline: z.string(),
            year: z.coerce.string().optional(),
            order: z.number().optional(),
            image: z.object({
                file: image(),
                caption: z.string(),
                alt: z.string().optional(),
                width: z.number().optional(),
                height: z.number().optional(),
            }),
            githubId: z
                .string()
                .regex(
                    /^[^/]+\/[^/]+$/,
                    "GitHub repository ID must be <user-or-org>/<repo-name>",
                )
                .optional(),
            links: z
                .array(
                    z.object({
                        name: z.string(),
                        url: z.string().url(),
                        icon: z.string(),
                    }),
                )
                .default([]),
            devicons: z.array(reference("deviconMappings")),
            customIcons: z
                .array(
                    z.object({
                        name: z.string(),
                        icon: z.string(),
                        url: z.string().url().optional(),
                    }),
                )
                .default([]),
        })
        .transform(async (project) => {
            if (project.githubId) {
                // Insert GitHub repo link
                project.links.unshift({
                    url: `https://github.com/${project.githubId}`,
                    name: "GitHub repository",
                    icon: "devicon:github",
                });
            }
            return project;
        });

export const collections = {
    // Maps devicon IDs to metadata used when displaying them
    deviconMappings: defineCollection({
        loader: file("src/content/devicons.yml"),
        schema: z.object({
            url: z.string().url().optional(),
            name: z.string().nonempty(),
            replaceWith: z.string().optional(),
        }),
    }),

    projects: defineCollection({
        loader: glob({ pattern: "*.md", base: "src/content/projects" }),
        schema: ProjectSchema,
    }),

    github: defineCollection({
        loader: {
            name: "github-loader",
            load: async ({ store, logger }: any) => {
                if (SKIP_REMOTE || !GH_API_TOKEN) {
                    logger.info("Skipping GitHub contributions fetch");
                    store.set({
                        id: "stats",
                        data: { totalContributions: 0, weeks: [] },
                    });
                    return;
                }

                try {
                    const username = "anshcodes22";
                    const currentYear = new Date().getUTCFullYear();
                    const startYear = 2020;

                    const promises = [];
                    for (let year = startYear; year <= currentYear; year++) {
                        const from = new Date(Date.UTC(year, 0, 1));
                        const to =
                            year === currentYear
                                ? new Date()
                                : new Date(Date.UTC(year, 11, 31, 23, 59, 59));
                        promises.push(fetchYearContributions(username, from, to));
                    }

                    const yearsData = await Promise.all(promises);

                    let total = 0;
                    let allWeeks: any[] = [];

                    for (const data of yearsData) {
                        total += data.totalContributions;
                        allWeeks.push(...data.weeks);
                    }

                    // Process weeks to remove overlaps at year boundaries
                    const finalWeeks: any[] = [];
                    const seenSundays = new Set();

                    for (const week of allWeeks) {
                        const firstDay = week.contributionDays.find((d: any) => d.date);
                        if (!firstDay) continue;

                        const date = new Date(firstDay.date);
                        // Get the Sunday string for this week
                        date.setUTCDate(date.getUTCDate() - date.getUTCDay());
                        const sundayStr = date.toISOString().split("T")[0];

                        if (seenSundays.has(sundayStr)) {
                            // Merge days into existing week if needed
                            const existingWeek = finalWeeks.find((w) => {
                                const fd = w.contributionDays.find((d: any) => d.date);
                                const d = new Date(fd.date);
                                d.setUTCDate(d.getUTCDate() - d.getUTCDay());
                                return d.toISOString().split("T")[0] === sundayStr;
                            });
                            if (existingWeek) {
                                for (const day of week.contributionDays) {
                                    if (!existingWeek.contributionDays.find((d: any) => d.date === day.date)) {
                                        existingWeek.contributionDays.push(day);
                                    }
                                }
                                existingWeek.contributionDays.sort((a: any, b: any) => a.date.localeCompare(b.date));
                            }
                        } else {
                            seenSundays.add(sundayStr);
                            finalWeeks.push(week);
                        }
                    }

                    store.set({
                        id: "stats",
                        data: {
                            totalContributions: total,
                            weeks: finalWeeks,
                        },
                    });
                    logger.info(`Successfully fetched ${total} GitHub contributions`);
                } catch (e) {
                    logger.error(`Error fetching GitHub contributions: ${e}`);
                    store.set({
                        id: "stats",
                        data: { totalContributions: 0, weeks: [] },
                    });
                }
            },
        },
        schema: z.object({
            totalContributions: z.number(),
            weeks: z.array(
                z.object({
                    contributionDays: z.array(
                        z.object({
                            contributionCount: z.number(),
                            date: z.coerce.date(),
                            weekday: z.number(),
                        }),
                    ),
                }),
            ),
        }),
    }),
};
