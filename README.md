# Airbnb Bangkok Listings Analysis - Capstone Module 2

## Project Overview

This project analyzes Airbnb listings in Bangkok to help hosts optimize their listing performance and competitiveness. The analysis focuses on how to attracts backpackers accomodation segment in Bangkok.

**Role:** Data Analysis or Consultant
**Objective:** Provide actionable insights for Airbnb hosts to improve their listing performance through data-driven recommendations.

---

## Problem Statement

**Researching the best strategy for Airbnb hosts to attracts backpacking's accomodation segment in Bangkok using data driven approach**

### Key Research Questions

1. **Pricing Strategy:** How does pricing, affect booking frequency and revenue across different neighbourhoods and room types?

2. **Geographic Performance:** Which neighbourhoods in Bangkok show the highest demand and best listing performance, and what geographic factors contribute to success?

3. **Market Competition:** What listing characteristics (amenities, location, reviews) differentiate high-performing listings from underperforming ones in competitive neighbourhoods?

---

## Dataset

**Main Dataset Name:** Airbnb Listings Bangkok.csv
**Cleaned Dataset Name:** Airbnb_Listings_Bangkok_Budget.xlsx
**Geo shapefile:**  Bangkok Neighborhood Maps (bangkok_districts_fixed_1.shp)


### Key Features Used

| Feature | Description | dtypes |
|---------|-------------|------------|
| `id` | Unique identifier for listing | int |
| `neighborhood` | Neighbourhood/area geocoded by latitude/longitude | str |
| `latitude` | WGS84 projection (geographic coordinate) | float |
| `longitude` | WGS84 projection (geographic coordinate) | float |
| `room_type` | Entire home/apt, Private room, Shared room | str |
| `price` | Daily price in local currency | int |
| `minimum_nights` | Minimum night stay requirement | int |
| `number_of_reviews` | Total reviews received | int | 
| `number_of_reviews_ltm` | Reviews in last 12 months (booking proxy) | int |
| `review_per_month` | Number of review per month | float |
| `last_review` | Date of most recent review | datetime |
| `availability_365` | Days available in next 365 days | int |
| `calculated_host_listings_count` | Number of listings by host | int |
| `host_type` | The type of host (Single or Multiple) | str |
| `price_segment` | Number of listings by host | str |
| `review_segment` | Number of listings by host | str|



---

## Project Structure

```
airbnb-bangkok-analysis/
│
├── README.md                          # This file
├── CapstoneModule2.ipynb              # Main analysis notebook
│
├── data/
│   ├── Airbnb Listings Bangkok.csv            # Raw dataset
│   ├── Airbnb_Listings_Bangkok_Budget.xlsx    # Processed dataset
│   ├── bangkok_districts.shp                  # Raw shapefile for Bangkok neighborhood map
│   ├── initial_cleaning.ipynb                 # Shapefile cleaning notebook
│   └── bangkok_districts_fixed_1.shp          # Clean data
│
├── Capstone_Project_2_Presentation.pptx       # Presentation files
└── Capstone_module_2_final.twbx               # Tableau dashboard
```

---

Hosts can act on:
- **Geographic:** Which neighborhoods to target based on demand and pricing potential
- **Pricing:** Optimal price points for different room types and neighborhoods
- **Competition:** What characteristics make listings stand out in competitive markets

---

## **Conclusion**
`Market is segmented, not monolithic` Entire homes ≠ shared rooms in pricing/performance

`Location matters more for budget options` Central Bangkok attracts diverse segment from budget to premium

`Professional scale wins in high-performance` Hosts with multi-listing hosts dominate, but niches exist for single operators

`Shared rooms = untapped opportunity` Underperforming segment with backpacker appeal mismatch

`Flexibility drives velocity` 1-night minimums crucial for high-review, high-turnover success

---

## **Business suggestion**
- The shared rooms, private rooms, and hotels sectors has been lacking in review compared to saturated entire rooms sectors. Lots of improvement needed for shared rooms.
- The key to attracts more costumers (by review metrics) is lesser minimum nights requirements, higher price point which might attracts more segment other than backpackers.
- The higher yearly availability might indicating lacking occupancy. Service improvement or more marketing needed!
- top 5 neighborhoods that attracts more booking that is constantly appears in both geographic case study including Khlong Toei, Vardhana, Sathon, Phra Nakhron, Phaya Thai which is mainly located on the central business district.

---

## Technologies & Libraries Used

- **Python 3.11.5**
- **Jupyter Notebook 1.0.0** - Analysis documentation
- **Pandas 2.0.3** - Data manipulation & cleaning
- **NumPy 1.24.3** - Numerical computations
- **Matplotlib 3.8.0 & Seaborn 0.13.0** - Statistical visualizations
- **SciPy 1.11.3** - Statistical testing
- **Geopandas 1.1.1** - Spatial Processing
- **Tableau Public** - Interactive dashboards
- **Microsoft Powerpoint** - Presentation

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

---

## Resources

- **Tableau Public Dashboard:** Tableau Dashboard files in .twbx [tableau public](https://public.tableau.com/app/profile/yonathan.hary.hutagalung/viz/Capstone_module_2_final/0_Projectoverview?publish=yes)
- **Presentation Slides:** Presentation Files in .pptx [presentation files]((https://docs.google.com/presentation/d/1rYgdscPAuJgUNeDcyshYs1gvLMJTqpeH/edit?usp=drive_link&ouid=117421172314407535268&rtpof=true&sd=true))
- **Airbnb Data Source:** Bangkok Airbnb marketplace data 
- **Data Dictionary:** See attached Airbnb Listings Bangkok Data Dictionary

---
