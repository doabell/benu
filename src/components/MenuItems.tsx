import React from 'react';
import { List, ListItem, ListItemText } from '@mui/material';
import MenuItem from '@/models/MenuItem';

interface MenuItemsProps {
  items: MenuItem[];
}

const MenuItems: React.FC<MenuItemsProps> = ({ items }) => {
  const listItems = items.map((item) => {
    if (item.is_title) {
      return <h3 key={item.id}>{item.name}</h3>;
    } else {
      return (
        <ListItem key={item.id}>
          <ListItemText primary={item.name} secondary={item.price && "$" + item.price.toFixed(2)} />
        </ListItem>
      );
    }
  })
  return (
    <List>
      {listItems}
    </List>
  );
};

export default MenuItems;
