import { ignoredSections } from "./data";
import type { ApiMenuItem, DishDetails, MenuSection } from "./types";

function nutrislicePhotoUrl(
    value: string | null | undefined
): string | undefined {
    if (!value) return;
    try {
        const url = new URL(value);
        if (
            url.origin === "https://api.nutrislice.com" &&
            url.pathname.startsWith("/content/asset/serve/image/") &&
            !url.username &&
            !url.password
        )
            return url.href;
    } catch {
        // A missing photo should not affect the dish or its other details.
    }
}

function dishDetails(
    food: NonNullable<ApiMenuItem["food"]>
): DishDetails | undefined {
    const ingredients = food.ingredients?.trim() || undefined;
    const photoUrl = nutrislicePhotoUrl(food.image_url);
    const serving = food.serving_size_info;
    const servingSize =
        serving?.serving_size_amount && serving.serving_size_unit
            ? `${serving.serving_size_amount} ${serving.serving_size_unit}`
            : undefined;
    const source = food.has_nutrition_info && food.rounded_nutrition_info;
    const nutrition = source
        ? {
              calories: source.calories ?? undefined,
              proteinGrams: source.g_protein ?? undefined,
              carbGrams: source.g_carbs ?? undefined,
              fatGrams: source.g_fat ?? undefined,
              fiberGrams: source.g_fiber ?? undefined,
              sodiumMg: source.mg_sodium ?? undefined
          }
        : undefined;
    const hasNutrition =
        nutrition &&
        Object.values(nutrition).some((value) => value !== undefined);
    if (!ingredients && !servingSize && !photoUrl && !hasNutrition) return;
    return {
        ingredients,
        servingSize,
        nutrition: hasNutrition ? nutrition : undefined,
        photoUrl,
        photoAlt: photoUrl ? food.image_alt_text || food.name : undefined
    };
}

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
                iconNames: item.food.icons?.food_icons?.map(
                    (icon) => icon.name
                ),
                details: dishDetails(item.food)
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
            items: section.items.toSorted(
                (first, second) => first.position - second.position
            )
        }))
        .filter((section) => !ignoredSections.includes(section.title));
}
