/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable("menus", (table) => {
    table.increments("id");
    table.timestamp("timestamp").defaultTo(knex.fn.now());
    table.string("place");
    table.string("date");
    table.string("meal");
    table.jsonb("items");
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists("menus");
};
