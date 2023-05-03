import { NextApiRequest, NextApiResponse } from "next";
import MenuItem from "@/models/MenuItem";
import { knex } from "../../../knex/knex";
import { fetchExternalMenu } from "@/utils/fetchExternalMenu";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<MenuItem[]>
) {
  if (!req.query || !req.query.dateStr || !req.query.place || !req.query.meal) {
    // Return a 400 Bad Request response if any required params are missing
    return res.status(400).end();
  }

  const { dateStr, place, meal } = req.query;

  if (
    typeof dateStr !== "string" ||
    typeof place !== "string" ||
    typeof meal !== "string"
  ) {
    return res.status(400).end();
  }

  const menu = await knex("menus")
    .select()
    .where({
      place: place,
      date: dateStr,
      meal: meal,
    })
    .first();

  if (menu) {
    res.status(200).send(menu.items);
  } else {
    const items = await fetchExternalMenu(dateStr, place, meal);
    res.status(200).json(items);
  }
}
