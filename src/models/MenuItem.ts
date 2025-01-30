interface MenuItem {
  id: number;
  position: number;
  name?: string;
  subtext?: string;
  icon_names?: string[];
}

export default MenuItem;
