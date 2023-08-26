import datetime
import requests
from flask import Flask, request, jsonify
app = Flask(__name__)


@app.route("/api/menus")
def menus_handler():
    date_str = request.args.get('dateStr')
    place = request.args.get('place')
    meal = request.args.get('meal')

    if not date_str or not place or not meal:
        return '', 400

    year, month, day = date_str.split("-")

    date = datetime.date(int(year), int(month), int(day))

    url = f"https://middlebury.api.nutrislice.com/menu/api/weeks/school/{place}/menu-type/{meal}/{year}/{month.zfill(2)}/{day.zfill(2)}/?format=json"

    response = requests.get(url, timeout=5)

    if not response.ok:
        return response.status_text, response.status_code

    data = response.json()

    day_data = next(
        (daytoFind for daytoFind in data['days'] if daytoFind['date'] == date.isoformat()), None)

    items = day_data.get('menu_items', [])

    if not day_data or not items:
        return jsonify({"message": "No data available"})

    menu_id = int(list(day_data['menu_info'].keys())[0])

    # Assuming you've already defined 'items', 'menu_id', and 'noData' variables earlier in your code

    transformed_items = []

    for item in items:
        if item['menu_id'] == menu_id:
            if item.get('is_section_title'):
                is_title = True
                id, position, text = item['id'], item['position'], item['text']
                transformed_items.append(
                    {"id": id, "position": position, "is_title": is_title, "name": text})
            elif item.get('food'):
                is_title = False
                id, position = item['id'], item['position']
                food = item['food']
                name, subtext, price = food['name'], food['subtext'], food['price']
                transformed_items.append(
                    {"id": id, "position": position, "is_title": is_title, "name": name, "subtext": subtext, "price": price})
            else:
                is_title = False
                id, position, text = item['id'], item['position'], item['text']
                transformed_items.append(
                    {"id": id, "position": position, "is_title": is_title, "name": text})

    transformed_items.sort(key=lambda x: x['position'])

    if not transformed_items:
        return jsonify({"message": "No data available"})
    else:
        return jsonify(transformed_items)
