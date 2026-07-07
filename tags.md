---
layout: default
title: Tags
---

# Tags

{% assign all_tags = "" | split: "," %}
{% for p in site.pages %}
  {% if p.tags %}
    {% for tag in p.tags %}
      {% assign all_tags = all_tags | push: tag %}
    {% endfor %}
  {% endif %}
{% endfor %}
{% assign unique_tags = all_tags | uniq | sort %}

{% for tag in unique_tags %}
## {{ tag }}

{% for p in site.pages %}
  {% if p.tags contains tag %}
- [{{ p.title }}]({{ p.url | relative_url }}) — {{ p.date | date: "%B %d, %Y" }}
  {% endif %}
{% endfor %}
{% endfor %}
