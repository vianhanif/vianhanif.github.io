---
layout: page
title: LinkedIn Posts
permalink: /linkedin/
sitemap: false
---

Syndication prep files for LinkedIn posts.

{% if site.linkedin.size > 0 %}
  {% for post in site.linkedin reversed %}
- [**{{ post.title }}**]({{ post.url | relative_url }})
  {% if post.date %}  *Date: {{ post.date | date: "%B %-d, %Y" }}*{% endif %}
  {% endfor %}
{% else %}
Nothing here yet.
{% endif %}
