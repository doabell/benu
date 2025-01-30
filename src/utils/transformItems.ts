import ApiResponse from "@/models/ApiResponse";
import MenuSection from "@/models/MenuSection";
import ignoredSections from "../data/ignoredSections.json";

type ApiMenuItem = ApiResponse["days"][0]["menu_items"][0];

export const transformItems = (items: ApiMenuItem[]) => {
  const sections: MenuSection[] = [];
  let currentSection: MenuSection | null = null;

  items.forEach((item) => {
    if (item.is_section_title) {
      if (currentSection) {
        sections.push(currentSection);
      }
      currentSection = { title: item.text, items: [] };
    } else if (item.food) {
      const { id, position } = item;
      const { name, subtext, icons } = item.food;
      const icon_names = icons?.food_icons.map((icon) => icon.name);
      currentSection?.items.push({ id, position, name, subtext, icon_names });
    } else {
      const { id, position, text } = item;
      currentSection?.items.push({ id, position, name: text });
    }
  });

  if (currentSection) {
    sections.push(currentSection);
  }

  sections.forEach((section) => {
    section.items.sort((item1, item2) => item1.position - item2.position);
  });

  return sections.filter((section) => !ignoredSections.includes(section.title));
};
