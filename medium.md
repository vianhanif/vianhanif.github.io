---
layout: page
title: Medium Posts
permalink: /medium/
sitemap: false
---

Syndication prep files for Medium posts.

{% assign template = "[TITLE]" %}
{% assign posts = site.medium | where_exp: "post", "post.title != template" %}
{% if posts.size > 0 %}
  {% for post in posts reversed %}
- [**{{ post.title }}**]({{ post.url | relative_url }})
  {% if post.date %}  *Date: {{ post.date | date: "%B %-d, %Y" }}*{% endif %}
  {% endfor %}
{% else %}
Nothing here yet.
{% endif %}
