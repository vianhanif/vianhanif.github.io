---
layout: page
title: Drafted Posts
permalink: /drafted/
sitemap: false
---

{% assign future_posts = site.posts | where_exp: "post", "post.date > site.time" %}
{% if future_posts.size > 0 %}
  {% for post in future_posts %}
- [**{{ post.title }}**]({{ post.url | relative_url }}) — {{ post.content | strip_html | truncatewords: 30 }}
  {% if post.date %}  *Scheduled for {{ post.date | date: "%B %-d, %Y" }}*{% endif %}
  {% endfor %}
{% else %}
Nothing drafted yet.
{% endif %}

{% comment %}
All posts live in _posts/ — visibility controlled by date.
Future-dated posts render at /drafted/:title/ (via permalink in frontmatter?),
while the main feed filters them out via _layouts/home.html override.
Linking to future-dated posts works as long as they have a layout assigned.
{% endcomment %}
