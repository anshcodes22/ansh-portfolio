import { GH_API_TOKEN } from "astro:env/server";

export interface ContributionDay {
    date: Date;
    contributionCount: number;
}

export type ContributionInfo = {
    totalContributions: number;
    weeks: (ContributionDay | null)[][];
};

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
): Promise<ContributionInfo> {
    const response = await fetch("https://api.github.com/graphql", {
        method: "POST",
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
        weeks: calendar.weeks.map(
            (week: {
                contributionDays: {
                    contributionCount: number;
                    date: string;
                    weekday: number;
                }[];
            }) => {
                const days: (ContributionDay | null)[] = Array(7).fill(null);
                for (const day of week.contributionDays) {
                    days[day.weekday] = {
                        contributionCount: day.contributionCount,
                        date: new Date(day.date + "T00:00:00Z"),
                    };
                }
                return days;
            },
        ),
    };
}

export async function getGitHubContributionWeeks(
    username: string,
): Promise<ContributionInfo> {
    if (!GH_API_TOKEN) {
        console.warn(
            "No GH_API_TOKEN provided. Skipping GitHub contributions fetch.",
        );
        return { totalContributions: 0, weeks: [] };
    }

    try {
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

        const mergedInfo: ContributionInfo = {
            totalContributions: 0,
            weeks: [],
        };

        for (const data of yearsData) {
            mergedInfo.totalContributions += data.totalContributions;
            mergedInfo.weeks.push(...data.weeks);
        }

        // Merge overlapping weeks at year boundaries
        const finalWeeks: (ContributionDay | null)[][] = [];
        for (const week of mergedInfo.weeks) {
            const firstValid = week.find((d) => d !== null);
            if (!firstValid) continue;

            // Get the Sunday of this week
            const sunday = new Date(firstValid.date);
            sunday.setUTCDate(sunday.getUTCDate() - sunday.getUTCDay());
            const sundayTime = sunday.getTime();

            if (finalWeeks.length > 0) {
                const prevWeek = finalWeeks[finalWeeks.length - 1];
                const prevFirstValid = prevWeek.find((d) => d !== null);
                if (prevFirstValid) {
                    const prevSunday = new Date(prevFirstValid.date);
                    prevSunday.setUTCDate(
                        prevSunday.getUTCDate() - prevSunday.getUTCDay(),
                    );

                    if (prevSunday.getTime() === sundayTime) {
                        // Merge into prevWeek
                        for (let i = 0; i < 7; i++) {
                            if (week[i]) prevWeek[i] = week[i];
                        }
                        continue; // Skip pushing new week
                    }
                }
            }
            finalWeeks.push(week);
        }

        mergedInfo.weeks = finalWeeks;
        return mergedInfo;
    } catch (e) {
        console.error("Error fetching GitHub contributions:", e);
        return { totalContributions: 0, weeks: [] };
    }
}
