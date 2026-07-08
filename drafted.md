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
  {% if post.date <= site.time %}
    [Read preview →]({{ post.url | relative_url }})
  {% else %}
    *(preview available after {{ post.date | date: "%B %-d, %Y" }})*
  {% endif %}
  {% endfor %}
{% else %}
Nothing drafted yet.
{% endif %}

{% comment %}
Future-dated posts are excluded from the listing above because they aren't
rendered as standalone pages (Jekyll's `future: false` setting). They still
appear in `site.drafted` but linking to them would cause a 404.
{% endcomment %}
