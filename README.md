# 🏙️ Bangkok Airbnb Listings Analysis — Backpacker Segment

[![Python](https://img.shields.io/badge/Python-3.11.5-blue)](https://www.python.org/) [![Jupyter](https://img.shields.io/badge/Jupyter-Notebook-orange)](https://jupyter.org/) [![Tableau](https://img.shields.io/badge/Tableau-Public-lightblue)](https://public.tableau.com/app/profile/yonathan.hary.hutagalung/viz/Capstone_module_2_final/0_Projectoverview?publish=yes) [![Slides](https://img.shields.io/badge/Presentation-Google%20Slides-yellow)](https://docs.google.com/presentation/d/1rYgdscPAuJgUNeDcyshYs1gvLMJTqpeH/edit?usp=sharing)

## 📊 Live Deliverables

| Deliverable | Link |
|---|---|
| 🔗 Tableau Public Dashboard | [View Dashboard](https://public.tableau.com/app/profile/yonathan.hary.hutagalung/viz/Capstone_module_2_final/0_Projectoverview?publish=yes) |
| 📑 Presentation Slides | [View Slides](https://docs.google.com/presentation/d/1rYgdscPAuJgUNeDcyshYs1gvLMJTqpeH/edit?usp=sharing) |

---

## Overview

This project analyses Airbnb listings in Bangkok to help hosts optimise their listing performance and competitiveness. The analysis focuses on how to attract the backpacker accommodation segment in Bangkok using a data-driven approach.

**Role:** Data Analyst / Consultant  
**Objective:** Provide actionable insights for Airbnb hosts to improve listing performance through data-driven recommendations.

---

## Problem Statement

**Researching the best strategy for Airbnb hosts to attract the backpacker accommodation segment in Bangkok using a data-driven approach.**

### Key Research Questions

1. **Pricing Strategy:** How does pricing affect booking frequency and revenue across different neighbourhoods and room types?
2. **Geographic Performance:** Which neighbourhoods in Bangkok show the highest demand and best listing performance, and what geographic factors contribute to success?
3. **Market Competition:** What listing characteristics (amenities, location, reviews) differentiate high-performing listings from underperforming ones in competitive neighbourhoods?

---

## Dataset

- **Source:** Inside Airbnb — Bangkok listings data. Retrieved from [http://insideairbnb.com/get-the-data/](http://insideairbnb.com/get-the-data/)
- **Raw records:** 15,854 listings (before cleaning)
- **Filtered records:** 6,619 listings (budget segment ≤ 2,000 THB/night, listings with reviews only)
- **Raw file:** `Airbnb Listings Bangkok.csv` — place in `data/` directory (see [Dataset Setup](#dataset-setup))

### Key Features Used

| Feature | Description | Type |
|---|---|---|
| `id` | Unique listing identifier | int |
| `neighbourhood` | Neighbourhood geocoded by lat/lon | str |
| `latitude` / `longitude` | WGS84 coordinates | float |
| `room_type` | Entire home/apt, Private room, Shared room, Hotel room | str |
| `price` | Daily price in THB | int |
| `minimum_nights` | Minimum night stay requirement | int |
| `number_of_reviews` | Total reviews received | int |
| `number_of_reviews_ltm` | Reviews in last 12 months (booking proxy) | int |
| `reviews_per_month` | Monthly review rate | float |
| `last_review` | Date of most recent review | datetime |
| `availability_365` | Days available in next 365 days | int |
| `host_type` | Single-listing vs. Multi-listing host | str |
| `price_segment` | Low-end (<500 THB), Mid-range (500–999 THB), Upper-end (1000–1999 THB) | str |

---

## Key Findings

### 💰 Pricing & Reviews
- **Higher price correlates with more reviews** (Spearman r = 0.164, p < 0.0001 overall) — but this relationship **reverses for shared rooms**, where lower-priced listings attract more bookings, consistent with backpacker price sensitivity
- **Upper-end budget listings (1,000–1,999 THB) dominate** the market at 56% of all listings (3,722 out of 6,619), yet ANOVA confirms significant differences in review rates across price segments (F = 62.9, p < 10⁻²⁷)
- **Shared rooms are the cheapest** at a median of ฿434/night vs. ฿1,200 for entire homes — a clear price anchor for backpackers

### 🗺️ Geographic Demand
- **Khlong Toei leads with 979 listings** — nearly 15% of the entire filtered dataset — followed by Vadhana (693) and Ratchathewi (480)
- **Listing density and average price are positively correlated** (Spearman r = 0.486, p = 0.0004), meaning the most competitive neighbourhoods also command premium pricing
- The **top 5 neighbourhoods by listing count** — Khlong Toei, Vadhana, Ratchathewi, Huai Khwang, and Sathon — are all concentrated in Bangkok's central business district

### 🏠 Room Type & Host Dynamics
- **Entire homes/apartments dominate** at 61% of listings (4,035 out of 6,619), while shared rooms — the most backpacker-relevant category — account for only **3% (196 listings)**, indicating an undersupplied niche
- **Multi-listing hosts control 72%** of all listings (4,768 vs. 1,851 single-listing hosts), suggesting professional operators dominate supply
- **Minimum nights matter significantly**: Hotel rooms and shared rooms have a median minimum of 1 night (ideal for transient backpackers), while entire homes have a median of 3 nights and a mean of 20 nights — actively filtering out short-stay guests

### ⭐ Booking Velocity Drivers
- **Minimum nights negatively correlate with review frequency** (Spearman r = −0.081, p < 0.001) — listings with lower minimum stay requirements accumulate reviews faster, a proxy for higher turnover
- **High availability (median 301 days/year)** may indicate low occupancy rather than flexible hosting — hosts with high availability and low reviews likely need pricing or marketing improvements

---

## Business Recommendations

1. **Target the shared room gap**: Only 196 shared room listings exist for the entire Bangkok market — hosts entering this segment face minimal competition while addressing direct backpacker demand
2. **Set minimum nights to 1**: Listings with 1-night minimums show statistically higher review velocity and booking turnover, directly serving backpacker travel patterns
3. **Price shared rooms below ฿500 THB** to sit in the Low-end Budget segment — unlike other room types, shared room reviews *decrease* at higher price points
4. **Focus on CBD-adjacent neighbourhoods**: Khlong Toei, Vadhana, Sathon, Phra Nakhon, and Phaya Thai consistently appear among the top areas for both listing count and booking demand
5. **Reduce high availability days**: A listing available 300+ days per year with few reviews signals a marketing or pricing problem — consider dynamic pricing or promotional periods

---

## Project Structure

```
DataAnalysis_BangkokAirBNB_Backpackers/
│
├── README.md                          # Project documentation
├── EDA_AirBNB.ipynb                   # Main analysis notebook
├── Presentation_AirBNB.pptx           # Presentation slides
├── Bangkok_AirBNB.twbx                # Tableau workbook
├── requirements.txt                   # Pinned Python dependencies
├── .gitignore                         # Excludes data files
│
├── data/
│   ├── Airbnb Listings Bangkok.csv            # Raw dataset (download separately)
│   ├── Airbnb_Listings_Bangkok_Budget.xlsx    # Processed budget-filtered dataset
│   ├── Initial_cleaning.ipynb                 # Shapefile preprocessing notebook
│   ├── bangkok_district.shp                   # Raw Bangkok district shapefile
│   └── bangkok_districts_fixed_1.shp          # Cleaned shapefile
│
├── webapp/                                    # Interactive web dashboard (Vite + React)
│   ├── scripts/build-data.mjs                 # Re-runs the notebook cleaning at build time
│   ├── scripts/verify-stats.mjs               # Asserts live stats match the notebook's SciPy output
│   └── src/                                   # Charts, sections, statistics
└── vercel.json                                # Deployment config (no Vercel settings needed)
```

---

## Dataset Setup

Data files are excluded from Git due to their size. To run the notebook locally:

1. Download the Bangkok listings CSV from [Inside Airbnb](http://insideairbnb.com/get-the-data/)
2. Place it in the `data/` directory as `data/Airbnb Listings Bangkok.csv`
3. Run `data/Initial_cleaning.ipynb` first to generate the cleaned shapefile
4. Then run `EDA_AirBNB.ipynb` for the full analysis

---

## Technologies & Libraries

| Tool | Version | Purpose |
|---|---|---|
| Python | 3.11.5 | Core language |
| Pandas | 2.0.3 | Data manipulation |
| NumPy | 1.24.3 | Numerical computing |
| Matplotlib | 3.8.0 | Visualisation |
| Seaborn | 0.13.0 | Statistical plots |
| SciPy | 1.11.3 | Statistical testing (ANOVA, Spearman) |
| GeoPandas | 1.1.1 | Spatial analysis & choropleth maps |
| Tableau Public | — | Interactive dashboard |
| Vite + React + TypeScript | 6 / 19 | Interactive web dashboard |
| Node.js | 20+ | Build-time data pipeline & stats verification |

---

## Project Metadata

- **Project Type:** EDA Capstone — Module 2
- **Problem Type:** Exploratory Data Analysis + Business Consulting
- **Created:** 2025
- **Author:** Yonathan Hary Hutagalung
- **Institution:** Purwadhika Digital Technology School

---

## How to run the script?

**.ipynb files:**

- Option 1: using Microsoft Visual Studio Code (VSCode) with appropriate Kernel (see technology and library used)
- Option 2: using google collab
- Option 3: using Anaconda juypiterlab

**Web dashboard:**

```bash
cd webapp
npm install
npm run dev      # http://localhost:5173
npm run build    # data pipeline -> stats verification -> typecheck -> bundle
```

Deploy: import this repository into Vercel and press deploy. `vercel.json` at the
repository root supplies the build command and output directory, so there is
nothing to configure. Or run `npx vercel --prod` from the repository root.

---

## Deliverables

1. **Jupyter Notebook (.ipynb)**
   - Complete code documentation
   - Data cleaning with reasoning
   - Analysis for all three business questions
   - Visualizations and statistical tests
   - Summary findings & recommendations

2. **Presentation Slides (PPT)**
   - Problem statement & business context
   - Analysis findings by question
   - Key insights & visualizations
   - Actionable recommendations
   - Data understanding & cleaning summary

3. **Tableau Public Dashboard**
   - Interactive exploration by neighborhood
   - Pricing performance metrics
   - Competitive comparison views
   - Public link for stakeholder access

4. **Interactive Web Dashboard (`webapp/`)**
   - Filter by room type, price segment, host type and neighbourhood; every
     chart, table and significance test re-runs against the selected slice
   - Cleaning pipeline re-executed at build time and asserted against the row
     counts printed in the notebook (15,854 -> 10,064 -> 6,619)
   - Spearman, ANOVA and chi-square reimplemented in TypeScript and verified
     against the notebook's SciPy output on every build
   - Chart/table toggle on every figure, light and dark themes, responsive
   - Deploys to Vercel with no configuration

---

## Resources

- **Tableau Public Dashboard:** Tableau Dashboard files in .twbx [tableau public](https://public.tableau.com/app/profile/yonathan.hary.hutagalung/viz/Capstone_module_2_final/0_Projectoverview?publish=yes)
- **Presentation Slides:** Presentation Files in .pptx [presentation files](https://docs.google.com/presentation/d/1rYgdscPAuJgUNeDcyshYs1gvLMJTqpeH/edit?usp=sharing&ouid=117421172314407535268&rtpof=true&sd=true)
- **Interactive Web Dashboard:** Source in [`webapp/`](webapp/) — see [webapp/README.md](webapp/README.md) for how the notebook's figures are reproduced and verified
- **Airbnb Data Source:** Bangkok Airbnb marketplace data
- **Data Dictionary:** See attached Airbnb Listings Bangkok Data Dictionary

---

## References

- Inside Airbnb. (n.d.). *Bangkok listings data*. Retrieved from http://insideairbnb.com/get-the-data/
- GeoPandas Documentation: https://geopandas.org/
- Tableau Public: https://public.tableau.com/
- SciPy Documentation: https://docs.scipy.org/
