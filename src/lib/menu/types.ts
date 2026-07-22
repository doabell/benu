export interface MenuItem {
    id: number;
    position: number;
    name?: string;
    subtext?: string;
    iconNames?: string[];
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
