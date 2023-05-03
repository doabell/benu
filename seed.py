'''
Seeds the database for the next 7 days.
'''

import requests
import datetime
from tqdm import trange

import json

DAYS = 7
today = datetime.datetime.today()

# Open the JSON file and read its contents
with open("src/data/halls.json", "r") as f:
    halls = json.load(f)

HEADERS = {
    'Referer': 'https://benu.vercel.app/',
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/104.0.5112.79 Safari/537.36',
}

for i in trange(DAYS+1):
    date = today + datetime.timedelta(days=i)
    dateStr = date.strftime("%Y-%m-%d")
    for hall in halls:
        for option in hall["options"]:
            params = {
                'dateStr': dateStr,
                'place': hall["id"],
                'meal': option["id"],
            }

            response = requests.get(
                'https://benu.vercel.app/api/menu',
                params=params, headers=HEADERS
            )
