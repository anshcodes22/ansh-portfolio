import {
    defineCollection,
    z,
    reference,
    type SchemaContext,
} from "astro:content";
import { glob, file } from "astro/loaders";

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
};
