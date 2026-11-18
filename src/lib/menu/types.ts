export interface DishNutrition {
    calories?: number;
    proteinGrams?: number;
    carbGrams?: number;
    fatGrams?: number;
    fiberGrams?: number;
    sodiumMg?: number;
}

export interface DishDetails {
    servingSize?: string;
    ingredients?: string;
    nutrition?: DishNutrition;
    photoUrl?: string;
    photoAlt?: string;
}

export interface MenuItem {
    id: number;
    position: number;
    name?: string;
    subtext?: string;
    iconNames?: string[];
    details?: DishDetails;
}

export interface MenuSection {
    title: string;
    items: MenuItem[];
}

export interface HallOption {
    id: string;
    name: string;
}

export interface Hall {
    id: string;
    name: string;
    options: HallOption[];
}

export interface ApiMenuItem {
    id: number;
    position: number;
    is_section_title: boolean;
    text: string;
    food?: {
        id: number;
        name: string;
        subtext?: string;
        ingredients?: string | null;
        image_url?: string | null;
        image_alt_text?: string | null;
        has_nutrition_info?: boolean;
        serving_size_info?: {
            serving_size_amount?: string | number | null;
            serving_size_unit?: string | null;
        } | null;
        rounded_nutrition_info?: {
            calories?: number | null;
            g_protein?: number | null;
            g_carbs?: number | null;
            g_fat?: number | null;
            g_fiber?: number | null;
            mg_sodium?: number | null;
        } | null;
        icons?: {
            food_icons?: {
                slug: string;
                name: string;
                sort_order: number;
            }[];
        };
    } | null;
    menu_id: number;
}

export interface ApiResponse {
    days: {
        date: string;
        has_unpublished_menus?: boolean;
        menu_items: ApiMenuItem[];
    }[];
}

export interface MenuQuery {
    dateStr: string;
    place: string;
    meal: string;
}
