(function () {
  'use strict';

  // --- Dark mode ---
  const themeToggle = document.getElementById('themeToggle');
  const saved = localStorage.getItem('theme') || 'light';
  document.documentElement.setAttribute('data-theme', saved);
  if (themeToggle) {
    themeToggle.textContent = saved === 'dark' ? '☀️' : '🌙';
    themeToggle.addEventListener('click', function () {
      const cur = document.documentElement.getAttribute('data-theme');
      const next = cur === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      localStorage.setItem('theme', next);
      themeToggle.textContent = next === 'dark' ? '☀️' : '🌙';
    });
  }

  // --- Reading progress bar ---
  var progressBar = document.getElementById('progressBar');
  if (progressBar) {
    window.addEventListener('scroll', function () {
      var scrollTop = window.scrollY;
      var docHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (docHeight > 0) {
        progressBar.style.width = (scrollTop / docHeight) * 100 + '%';
      }
    });
  }

  // --- Table of Contents ---
  var toc = document.getElementById('toc');
  if (toc) {
    var main = document.querySelector('main');
    var headings = main ? main.querySelectorAll('h2, h3') : [];
    if (headings.length < 3) {
      toc.style.display = 'none';
    } else {
      var list = document.createElement('ul');
      for (var i = 0; i < headings.length; i++) {
        var h = headings[i];
        var id = h.id || h.textContent.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '');
        h.id = id;
        var li = document.createElement('li');
        var a = document.createElement('a');
        a.href = '#' + id;
        a.textContent = h.textContent;
        if (h.tagName === 'H3') {
          li.style.paddingLeft = '1.25rem';
          li.style.fontSize = '0.9em';
        }
        li.appendChild(a);
        list.appendChild(li);
      }
      toc.appendChild(list);
    }
  }
})();
