import xml.etree.ElementTree as ET
import requests
from bs4 import BeautifulSoup
import hashlib
from flask import Flask, jsonify, render_template, request
from datetime import datetime

app = Flask(__name__)

# Cache configuration
feed_cache = {
    "data": None,
    "last_fetched": None
}

def fetch_and_parse_feed():
    url = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"
    response = requests.get(url, timeout=15)
    response.raise_for_status()
    
    # Parse XML
    root = ET.fromstring(response.content)
    
    # Namespaces
    ns = {'atom': 'http://www.w3.org/2005/Atom'}
    
    updates = []
    
    # Iterate through entries
    for entry in root.findall('atom:entry', ns):
        title = entry.find('atom:title', ns)
        date_str = title.text if title is not None else "Unknown Date"
        
        updated = entry.find('atom:updated', ns)
        iso_date = updated.text if updated is not None else ""
        
        link_elem = entry.find("atom:link[@rel='alternate']", ns)
        if link_elem is None:
            link_elem = entry.find('atom:link', ns)
        link = link_elem.attrib.get('href', '') if link_elem is not None else ""
        
        content = entry.find('atom:content', ns)
        content_html = content.text if content is not None else ""
        
        if content_html:
            soup = BeautifulSoup(content_html, 'html.parser')
            current_type = "Update"
            current_siblings = []
            
            # Helper to save a single update
            def save_update(u_type, siblings):
                html_content = "".join(str(s) for s in siblings).strip()
                if not html_content:
                    return
                # Extract text for tweeting
                sub_soup = BeautifulSoup(html_content, 'html.parser')
                text_content = sub_soup.get_text(separator=' ', strip=True)
                
                # Make a consistent unique ID
                hash_input = f"{date_str}-{u_type}-{text_content[:100]}"
                uid = hashlib.md5(hash_input.encode('utf-8')).hexdigest()
                
                updates.append({
                    'id': uid,
                    'date': date_str,
                    'isoDate': iso_date,
                    'type': u_type.strip(),
                    'html': html_content,
                    'text': text_content,
                    'link': link
                })
            
            # Check if there are any h3 headers
            h3_headers = soup.find_all('h3')
            if not h3_headers:
                # No h3, just save the whole content as "Update"
                save_update("Update", soup.contents)
            else:
                # Traverse children
                for child in soup.contents:
                    if child.name == 'h3':
                        if current_siblings:
                            save_update(current_type, current_siblings)
                            current_siblings = []
                        current_type = child.get_text(strip=True)
                    else:
                        current_siblings.append(child)
                if current_siblings:
                    save_update(current_type, current_siblings)
        else:
            # Handle entry without content if any
            hash_input = f"{date_str}-Update-empty"
            uid = hashlib.md5(hash_input.encode('utf-8')).hexdigest()
            updates.append({
                'id': uid,
                'date': date_str,
                'isoDate': iso_date,
                'type': "Update",
                'html': "<p>No detailed content available.</p>",
                'text': "No detailed content available.",
                'link': link
            })
            
    # Sort updates by isoDate descending (newest first)
    updates.sort(key=lambda x: x['isoDate'], reverse=True)
    return updates

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/releases')
def get_releases():
    force_refresh = request.args.get('refresh', 'false').lower() == 'true'
    
    # Check if cache exists and is fresh (e.g. less than 10 minutes old)
    now = datetime.now()
    use_cache = (
        not force_refresh and
        feed_cache["data"] is not None and
        feed_cache["last_fetched"] is not None and
        (now - feed_cache["last_fetched"]).total_seconds() < 600
    )
    
    if use_cache:
        return jsonify({
            "updates": feed_cache["data"],
            "cached": True,
            "last_fetched": feed_cache["last_fetched"].isoformat()
        })
    
    try:
        data = fetch_and_parse_feed()
        feed_cache["data"] = data
        feed_cache["last_fetched"] = now
        return jsonify({
            "updates": data,
            "cached": False,
            "last_fetched": now.isoformat()
        })
    except Exception as e:
        # If fetch fails but cache has old data, return it with error info
        if feed_cache["data"] is not None:
            return jsonify({
                "updates": feed_cache["data"],
                "cached": True,
                "error": str(e),
                "last_fetched": feed_cache["last_fetched"].isoformat()
            })
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)
