interface ApiResponse {
  days: {
    date: string;
    menu_info: {
      [key: string]: {
        position: number;
      }[];
    };
    menu_items: {
      id: number;
      position: number;
      is_section_title: boolean;
      text: string;
      food?: {
        id: number;
        name: string;
        subtext?: string;
        price?: number;
        icons?: {
          food_icons: {
            slug: string;
            name: string;
            sort_order: number;
          }[];
        },
      } | null;
      menu_id: number;
    }[];
  }[];
}

export default ApiResponse;
