import ApiResponse from "@/models/ApiResponse";

type ApiMenuItem = ApiResponse["days"][0]["menu_items"][0];

export const transformItems = (items: ApiMenuItem[], menu_id: number) => {
  const transformedItems = items.filter((item) => item.menu_id === menu_id).map((item) => {
    if (item.is_section_title) {
      const is_title = true;
      const { id, position, text } = item;
      return { id, position, is_title, name: text };
    } else if (item.food) {
      const is_title = false;
      const { id, position } = item;
      const { name, subtext, price } = item.food;
      return { id, position, is_title, name, subtext, price };
    } else {
      const is_title = false;
      const { id, position, text } = item;
      return { id, position, is_title, name: text };
    }
  });

  transformedItems.sort((item1, item2) => item1.position - item2.position);
  
  return transformedItems;
};
