---
layout: page
title: Medium Posts
permalink: /medium/
sitemap: false
---

Syndication prep files for Medium posts.

{% if site.medium.size > 0 %}
  {% for post in site.medium reversed %}
- [**{{ post.title }}**]({{ post.url | relative_url }})
  {% if post.date %}  *Date: {{ post.date | date: "%B %-d, %Y" }}*{% endif %}
  {% endfor %}
{% else %}
Nothing here yet.
{% endif %}
