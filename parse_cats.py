import urllib.request
from bs4 import BeautifulSoup
import json

url = "https://www.eichholtz.com/en/"
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
try:
    html = urllib.request.urlopen(req).read()
    soup = BeautifulSoup(html, 'html.parser')
    menu = soup.find('ul', class_='navigation')
    if not menu:
        # try ul with id ui-id-2 or similar
        menu = soup.find('ul', id='ui-id-2')
    
    if not menu:
        print("No navigation found")
    else:
        cats = {}
        for li in menu.find_all('li', class_='level0', recursive=False):
            a_tag = li.find('a')
            if not a_tag:
                continue
            name = a_tag.text.strip()
            cats[name] = []
            sub_ul = li.find('ul', class_='level0')
            if sub_ul:
                for sub_li in sub_ul.find_all('li', class_='level1', recursive=False):
                    sub_a = sub_li.find('a')
                    if not sub_a: continue
                    sub_name = sub_a.text.strip()
                    sub_cats = []
                    sub_sub_ul = sub_li.find('ul', class_='level1')
                    if sub_sub_ul:
                        for sub_sub_li in sub_sub_ul.find_all('li', class_='level2', recursive=False):
                            sub_sub_a = sub_sub_li.find('a')
                            if sub_sub_a:
                                sub_cats.append(sub_sub_a.text.strip())
                    cats[name].append({"name": sub_name, "subcategories": sub_cats})
        print(json.dumps(cats, indent=2))
except Exception as e:
    print(e)
