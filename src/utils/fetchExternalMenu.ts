import ApiResponse from "@/models/ApiResponse";
import noData from "../data/noData.json";
import { transformItems } from "./transformItems";

export const fetchExternalMenu = async (
  dateStr: string,
  place: string,
  meal: string
) => {
  const [year, month, day] = dateStr.split("-");

  const date = new Date(
    parseInt(year, 10),
    parseInt(month, 10) - 1,
    parseInt(day, 10)
  );

  const url = `https://middlebury.api.nutrislice.com/menu/api/weeks/school/${place}/menu-type/${meal}/${year}/${month
    .toString()
    .padStart(2, "0")}/${day.toString().padStart(2, "0")}/?format=json`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(response.statusText);
  }

  const data: ApiResponse = await response.json();

  const day_data = data.days.find(
    (daytoFind) => daytoFind.date === date.toISOString().substring(0, 10)
  );

  const items = day_data?.menu_items;

  if (!day_data || !Array.isArray(items) || !items.length) {
    return noData;
  }

  // const menu_id = Number(Object.keys(day_data.menu_info)[0]);

  const transformedItems = transformItems(items);

  if (transformedItems.length === 0) {
    return noData;
  } else {
    return transformedItems;
  }
};
