import { ignoredSections } from "./data";
import type { ApiMenuItem, MenuSection } from "./types";

export function transformItems(items: ApiMenuItem[]): MenuSection[] {
    const sections: MenuSection[] = [];
    let currentSection: MenuSection | null = null;

    for (const item of items) {
        if (item.is_section_title) {
            if (currentSection) sections.push(currentSection);
            currentSection = { title: item.text, items: [] };
            continue;
        }

        if (!currentSection) continue;

        if (item.food) {
            currentSection.items.push({
                id: item.id,
                position: item.position,
                name: item.food.name,
                subtext: item.food.subtext,
                iconNames: item.food.icons?.food_icons?.map((icon) => icon.name)
            });
        } else {
            currentSection.items.push({
                id: item.id,
                position: item.position,
                name: item.text
            });
        }
    }

    if (currentSection) sections.push(currentSection);

    return sections
        .map((section) => ({
            ...section,
            items: [...section.items].sort(
                (first, second) => first.position - second.position
            )
        }))
        .filter((section) => !ignoredSections.includes(section.title));
}
