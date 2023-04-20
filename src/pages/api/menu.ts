import { NextApiRequest, NextApiResponse } from "next";
import fetch from "node-fetch-cache";
import MenuItem from "@/models/MenuItem";
import ApiResponse from "@/models/ApiResponse";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<MenuItem[]>
) {
  if (!req.query || !req.query.dateStr || !req.query.place || !req.query.meal) {
    // Return a 400 Bad Request response if any required params are missing
    return res.status(400).end();
  }

  const { dateStr, place, meal } = req.query;

  if (typeof dateStr !== "string") {
    return res.status(400).end();
  }

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
    await response.ejectFromCache();
    throw new Error(response.statusText);
  }

  const data: ApiResponse = await response.json();

  const items = data.days.find(
    (daytoFind) => daytoFind.date === date.toISOString().substring(0, 10)
  )?.menu_items;

  if (!items) {
    // if day is not found, return an empty array
    res.status(200).json([]);
    return;
  }

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

  res.setHeader("Cache-Control", "s-maxage=100000, immutable");
  if (transformedItems.length === 0) {
    res
      .status(200)
      .json([
        {
          id: 60000000,
          position: 0,
          is_title: true,
          name: "No data. Not open?",
        },
      ]);
  } else {
    res.status(200).json(transformedItems);
  }
}
