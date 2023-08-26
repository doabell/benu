import ApiResponse from "@/models/ApiResponse";

type ApiMenuItem = ApiResponse["days"][0]["menu_items"][0];

export const transformItems = (items: ApiMenuItem[]) => {
  const transformedItems = items.map((item) => {
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

  const uniqueItems = Array.from(new Set(transformedItems.map(obj => obj.id))).map(id => transformedItems.find(obj => obj.id === id)!);

  return uniqueItems;
};
