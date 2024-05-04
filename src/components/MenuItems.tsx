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
import MenuItem from "@/models/MenuItem";

interface MenuItemsProps {
  items: MenuItem[];
}

const MenuItems: React.FC<MenuItemsProps> = ({ items }) => {
  const listItems = items.map((item) => {
    if (item.is_title) {
      return (
        <Typography variant="h6" key={item.id}>
          {item.name}
        </Typography>
      );
    } else {
      return (
        <ListItem key={item.id} sx={{ paddingY: 0.5 }}>
          <ListItemIcon>
            <IconButton
              aria-label="search for image"
              href={`https://duckduckgo.com/?q=${encodeURIComponent(item.name || "Richard Paul Astley")}&t=hi&iar=images&iax=images&ia=images`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <ImageSearchIcon />
            </IconButton>
          </ListItemIcon>
          <ListItemText
            primary={item.name}
            secondary={item.price && `$${item.price.toFixed(2)}`}
          />
        </ListItem>
      );
    }
  });
  return <List>{listItems}</List>;
};

export default MenuItems;
