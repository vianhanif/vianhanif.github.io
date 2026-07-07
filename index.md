---
title: Home
---

# {{ site.title }}

{{ site.description }}

## Posts

{% assign blog_pages = site.pages | where_exp: "p", "p.dir == '/'" | where_exp: "p", "p.name != 'index.md'" | sort: "date" | reverse %}
{% for post in blog_pages %}
- [{{ post.title }}]({{ post.url | relative_url }}){% if post.date %} — {{ post.date | date: "%B %d, %Y" }}{% endif %}
{% endfor %}
