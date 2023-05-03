import fetch from "node-fetch-cache";
import ApiResponse from "@/models/ApiResponse";
import { knex } from "../../knex/knex";
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

  const items = data.days.find(
    (daytoFind) => daytoFind.date === date.toISOString().substring(0, 10)
  )?.menu_items;

  if (!items) {
    return noData;
  }

  const transformedItems = transformItems(items);

  // Add to database
  const newItem = {
    place: place,
    date: dateStr,
    meal: meal,
    items:
      transformedItems.length === 0
        ? JSON.stringify(noData)
        : JSON.stringify(transformedItems),
  };

  await knex("menus").insert(newItem);

  if (transformedItems.length === 0) {
    return noData;
  } else {
    return transformedItems;
  }
};
