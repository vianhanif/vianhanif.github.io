---
title: Home
---

# {{ site.title }}

{{ site.description }}

## Posts

{% assign sorted = site.pages | sort: 'date' | reverse %}
{% for p in sorted %}
  {% if p.title and p.title != 'Home' and p.url != '/' %}
- [{{ p.title }}]({{ p.url | relative_url }}){% if p.date %} — {{ p.date | date: "%B %d, %Y" }}{% endif %}
  {% endif %}
{% endfor %}
