interface MenuItem {
  id: number;
  position: number;
  is_title: boolean;
  name?: string;
  subtext?: string;
  price?: number;
}

export default MenuItem;
