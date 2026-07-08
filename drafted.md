---
layout: page
title: Drafted Posts
permalink: /drafted/
sitemap: false
---

{% if site.drafted.size > 0 %}
  {% for post in site.drafted reversed %}
- **{{ post.title }}** — {{ post.content | strip_html | truncatewords: 30 }}
  *Scheduled for {{ post.date | date: "%B %-d, %Y" }}*
  [Read preview →]({{ post.url | relative_url }})
  {% endfor %}
{% else %}
Nothing drafted yet.
{% endif %}
