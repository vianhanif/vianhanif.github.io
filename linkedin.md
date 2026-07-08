---
layout: page
title: LinkedIn Posts
permalink: /linkedin/
sitemap: false
---

Syndication prep files for LinkedIn posts.

{% assign template = "[TITLE]" %}
{% assign posts = site.linkedin | where_exp: "post", "post.title != template" %}
{% if posts.size > 0 %}
  {% for post in posts reversed %}
- [**{{ post.title }}**]({{ post.url | relative_url }})
  {% if post.date %}  *Date: {{ post.date | date: "%B %-d, %Y" }}*{% endif %}
  {% endfor %}
{% else %}
Nothing here yet.
{% endif %}
