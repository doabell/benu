import React from "react";
import {
  IconButton,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Typography,
} from "@mui/material";
import ImageSearchIcon from "@mui/icons-material/ImageSearch";
import MenuSection from "@/models/MenuSection";

interface MenuSectionsProps {
  sections: MenuSection[];
}

const iconMap: { [key: string]: string } = {
  Vegan: "🥗Vegan",
  Vegetarian: "🥦Vegetarian",
  Wheat: "🌾Wheat",
  Soy: "🌱Soy",
  Milk: "🥛Milk",
  Egg: "🥚Egg",
  Sesame: "🌿Sesame",
  Fish: "🐟Fish",
};

const MenuSections: React.FC<MenuSectionsProps> = ({ sections }) => {
  const menuSections = sections.map((section) => {
    const listItems = section.items.map((item) => {
      const icons = item.icon_names && item.icon_names.map((icon_name) => iconMap[icon_name] || icon_name).join(", ");
      return (
        <ListItem key={item.id} sx={{ paddingY: 0.5 }}>
          <ListItemIcon>
            <IconButton
              aria-label="search for image"
              href={`https://www.google.com/search?q=${encodeURIComponent(item.name || "Richard Paul Astley")}&tbm=isch`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <ImageSearchIcon />
            </IconButton>
          </ListItemIcon>
          <ListItemText
            primary={item.name}
            secondary={icons}
          />
        </ListItem>
      );
    });
    return (
      <React.Fragment key={section.title}>
        <Typography variant="h6">
          {section.title}
        </Typography>
        <List>{listItems}</List>
      </React.Fragment>
    );
  });

  return <>{menuSections}</>;
};

export default MenuSections;
