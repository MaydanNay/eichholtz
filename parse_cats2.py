import urllib.request
from bs4 import BeautifulSoup
import json
import re

url = "https://www.eichholtz.com/en/"
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
try:
    html = urllib.request.urlopen(req).read()
    soup = BeautifulSoup(html, 'html.parser')
    
    cats = {}
    
    # Find all anchor tags that have 'href' starting with 'https://www.eichholtz.com/en/collection/'
    for a in soup.find_all('a', href=re.compile(r'^https://www\.eichholtz\.com/en/collection/')):
        href = a['href']
        text = a.text.strip()
        if not text and 'title' in a.attrs:
            text = a['title'].strip()
        
        # Clean text
        text = text.replace('&#x20;', ' ').replace('&#x7C;', '|').replace('  ', ' ').strip()
        
        # Skip empty names or 'Shop all' or 'View all'
        if not text or 'view all' in text.lower() or 'shop all' in text.lower():
            continue
            
        # Parse hierarchy from URL
        # e.g. https://www.eichholtz.com/en/collection/furniture/sofas-ottomans.html
        parts = href.replace('https://www.eichholtz.com/en/collection/', '').split('/')
        
        # We only care about level 1 and level 2
        # If it's a top level category e.g. /furniture.html
        if len(parts) == 1:
            cat_slug = parts[0].replace('.html', '')
            # Initialize if not exists
            if text not in cats and '.html' in parts[0]:
                cats[text] = {'slug': cat_slug, 'subcategories': {}}
        elif len(parts) == 2:
            parent_slug = parts[0]
            child_slug = parts[1].replace('.html', '')
            
            # Find parent by slug
            parent_name = None
            for p_name, p_data in cats.items():
                if p_data.get('slug') == parent_slug:
                    parent_name = p_name
                    break
            
            if not parent_name:
                parent_name = parent_slug.capitalize()
                cats[parent_name] = {'slug': parent_slug, 'subcategories': {}}
                
            cats[parent_name]['subcategories'][text] = child_slug
            
    print(json.dumps(cats, indent=2))
except Exception as e:
    print(e)
