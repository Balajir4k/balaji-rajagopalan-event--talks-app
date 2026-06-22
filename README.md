# BigQuery Release Hub ⚡

A modern, responsive, high-performance web application designed to track, filter, search, and share Google Cloud BigQuery releases. Built with a lightweight **Python Flask** backend and a premium **Vanilla HTML5, CSS3, and JavaScript** frontend.

---

## 🚀 Key Features

- **Granular Entry Splitting**: Parses unified daily release entries from Google's XML feed into individual, category-specific micro-update items (Features, Announcements, Issues, Changes, and Breaking).
- **Fast Server-Side Cache**: Employs a 10-minute in-memory caching mechanism to optimize feed retrieval times and avoid Google source throttling.
- **Modern Glassmorphic UI**: Implements a sleek dark-themed dashboard using custom CSS tokens, smooth hover transformations, responsive layout breakpoints, and category-themed accents.
- **Client-Side Live Filtering**: Instantly search updates by keywords or filter by category tag click triggers.
- **Dynamic Tweet Intent Composer**: 
  - Generates custom formatted tweets using 3 preset templates (Casual, Professional, and Minimalist).
  - Automatically calculates remaining length constraints (within Twitter/X's 280-character budget) and truncates the body description dynamically with link suffixes.
  - Supports clipboard copying with visual toast notifications and direct web intent sharing.

---

## 🛠️ Tech Stack

- **Backend**: Python 3, Flask, Requests, BeautifulSoup4
- **Frontend**: Vanilla HTML5, CSS3, JavaScript (ES6)
- **Icons**: Lucide Icons CDN
- **Fonts**: Google Fonts (Inter, Outfit, JetBrains Mono)

---

## 📂 Project Structure

```
D:\Downloads\Google_AI_Project\
├── app.py                  # Flask server logic & feed XML parser
├── requirements.txt        # Python dependency manifest
├── .gitignore              # Git ignore configuration
├── README.md               # Project documentation
├── templates/
│   └── index.html          # Dashboard page template
└── static/
    ├── css/
    │   └── style.css       # Layout designs, keyframes, and theme tokens
    └── js/
        └── app.js          # Main client application logic
```

---

## 💻 Quick Start & Setup

Follow these steps to run the application locally on your machine:

### 1. Prerequisite
Ensure you have **Python 3.8+** installed.

### 2. Configure Virtual Environment
Initialize a virtual environment in the project directory:
```bash
# Create the environment
python -m venv .venv

# Activate it (Windows PowerShell)
.venv\Scripts\Activate.ps1

# Activate it (Windows Command Prompt)
.venv\Scripts\activate.bat

# Activate it (macOS / Linux)
source .venv/bin/activate
```

### 3. Install Dependencies
Install packages listed in `requirements.txt`:
```bash
pip install -r requirements.txt
```

### 4. Run the Server
Launch the Flask development server:
```bash
python app.py
```

The application will launch in development debug mode. Open your browser and go to:
**[http://127.0.0.1:5000](http://127.0.0.1:5000)**

---

## 📝 License

This project is open-source and free to configure or modify.