import React from "react";
import {
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
            <a
              href={`https://duckduckgo.com/?q=${item.name}&t=hi&iar=images&iax=images&ia=images`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <ImageSearchIcon />
            </a>
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
