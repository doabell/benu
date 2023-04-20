interface ApiResponse {
  days: {
    date: string;
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
      } | null;
    }[];
  }[];
}

export default ApiResponse;