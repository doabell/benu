interface Ingredient {
    name: string;
    components?: string;
}

const closingBrackets = new Map([
    ["(", ")"],
    ["[", "]"]
]);

export function parseIngredients(source: string): Ingredient[] {
    const ingredients: Ingredient[] = [];
    const expectedClosers: string[] = [];
    let start = 0;
    let groupStart = -1;
    let groupEnd = -1;

    function addIngredient(end: number): void {
        const text = source.slice(start, end).trim();
        if (!text) return;

        if (groupStart > start) {
            const suffix = source.slice(groupEnd + 1, end).trim();
            const name = source.slice(start, groupStart).trim();
            const components = source.slice(groupStart, end).trim();
            if (
                name &&
                (!suffix || suffix === ".") &&
                components.includes(",")
            ) {
                ingredients.push({ name, components });
                return;
            }
        }
        ingredients.push({ name: text });
    }

    // Preserve the source as a single entry if its grouping is ambiguous.
    for (let index = 0; index < source.length; index++) {
        const character = source[index];
        const closer = closingBrackets.get(character);
        if (closer) {
            if (!expectedClosers.length) groupStart = index;
            expectedClosers.push(closer);
        } else if (character === ")" || character === "]") {
            if (expectedClosers.pop() !== character)
                return [{ name: source.trim() }];
            if (!expectedClosers.length) groupEnd = index;
        } else if (character === "," && !expectedClosers.length) {
            addIngredient(index);
            start = index + 1;
        }
    }
    if (expectedClosers.length) return [{ name: source.trim() }];

    addIngredient(source.length);
    return ingredients;
}
