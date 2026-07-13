---
layout: page
title: Post Overview
permalink: /overview/
icon: fas fa-table
order: 5
---

| Date | Title | Post Status | LinkedIn Prep | Medium Prep | Writer Pipeline |
| :--- | :--- | :--- | :--- | :--- | :--- |
{% for post in site.posts %}
{% assign linkedins = site.linkedin | where_exp: "item", "item.linked_posts contains post.url" %}
{% assign mediums = site.medium | where_exp: "item", "item.linked_posts contains post.url" %}
{% assign linkedin_count = linkedins | size %}
{% assign medium_count = mediums | size %}
{% if linkedin_count > 0 %}{% assign li_status = "Ready" %}{% else %}{% assign li_status = "Pending" %}{% endif %}
{% if medium_count > 0 %}{% assign md_status = "Ready" %}{% else %}{% assign md_status = "Pending" %}{% endif %}
{% if linkedin_count > 0 and medium_count > 0 %}{% assign writer_status = "Done" %}{% else %}{% assign writer_status = "Pending" %}{% endif %}
| {{ post.date | date: "%Y-%m-%d" }} | [{{ post.title }}]({{ post.url | relative_url }}) | {% if post.date > site.time %}Draft{% else %}Published{% endif %} | {{ li_status }} | {{ md_status }} | {{ writer_status }} |
{% endfor %}
