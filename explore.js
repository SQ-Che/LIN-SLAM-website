/* Paper-table chart summaries and deployment video scene switching. */
(() => {
  'use strict';
  const el = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };
  // Read chart values from the visible paper tables to keep one data source.
  const summary = (title, description) => {
    const figure = el('figure', 'paper-summary-chart');
    const caption = el('figcaption');
    caption.append(el('h4', '', title), el('p', '', description));
    figure.append(caption);
    return figure;
  };
  const plot = (title, rows, maximum, unit, digits) => {
    const panel = el('div', 'summary-plot');
    panel.append(el('h5', '', title));
    const axis = el('div', 'summary-axis');
    axis.append(el('span', '', '0'), el('span', '', `${maximum} ${unit}`));
    panel.append(axis);
    rows.forEach(({name, value, ours}) => {
      const row = el('div', 'summary-row' + (ours ? ' summary-ours' : ''));
      row.dataset.method = name;
      const track = el('span', 'summary-track');
      track.setAttribute('aria-hidden', 'true');
      const fill = el('span', 'summary-fill');
      fill.style.width = `${100 * value / maximum}%`;
      track.append(fill);
      row.append(el('span', 'summary-method', name), track,
        el('span', 'summary-value', `${value.toFixed(digits)} ${unit}`));
      panel.append(row);
    });
    return panel;
  };
  const reconstruction = document.querySelector('[aria-label="Reconstruction metrics"]');
  if (reconstruction) {
    const figure = summary('Surface reconstruction error', 'Chamfer-L1 · lower is better · shared 0–20 cm scale');
    const panels = el('div', 'summary-panels');
    const groups = [];
    for (const row of reconstruction.querySelector('tbody').rows) {
      if (row.classList.contains('group')) groups.push({name: row.textContent.trim(), rows: []});
      else groups[groups.length - 1].rows.push({
        name: row.cells[0].textContent.trim(),
        value: Number(row.cells[3].textContent),
        ours: row.classList.contains('ours')
      });
    }
    groups.forEach(group => panels.append(plot(group.name, group.rows, 20, 'cm', 3)));
    figure.append(panels);
    reconstruction.before(figure);
  }
  const backend = document.querySelector('[aria-label="Backend execution comparison"]');
  if (backend) {
    const total = [...backend.querySelector('tbody').rows].find(row => row.cells[0].textContent.trim() === 'Backend total [ms]');
    if (total) {
      const figure = summary('Backend processing time', 'Total time per keyframe · lower is better · shared 0–400 ms scale');
      const panels = el('div', 'summary-panels');
      const values = [...total.cells].slice(1).map(cell => cell.textContent.split('/').map(Number));
      ['Mean', 'P95'].forEach((name, i) => panels.append(plot(name, [
        {name: 'Tensor', value: values[0][i], ours: false},
        {name: 'C++/CUDA', value: values[1][i], ours: true}
      ], 400, 'ms', 3)));
      figure.append(panels);
      backend.before(figure);
    }
  }

  // Two films, one uncluttered stage. Playback always starts on user action.
  const films = document.querySelector('.film-showcase');
  if (films) {
    const panels = [...films.querySelectorAll('.film-panel')];
    const tabs = el('div', 'film-tabs');
    tabs.setAttribute('role', 'tablist');
    tabs.setAttribute('aria-label', 'Deployment video');
    panels.forEach((panel, i) => {
      const button = el('button', 'film-tab');
      button.type = 'button';
      button.id = `${panel.id}-tab`;
      button.setAttribute('role', 'tab');
      button.setAttribute('aria-controls', panel.id);
      button.setAttribute('aria-selected', String(i === 0));
      button.tabIndex = i === 0 ? 0 : -1;
      button.append(el('span', 'film-tab-name', panel.dataset.scene));
      panel.setAttribute('role', 'tabpanel');
      panel.setAttribute('aria-labelledby', button.id);
      panel.hidden = i !== 0;
      button.addEventListener('click', () => {
        panels.forEach((p, index) => {p.hidden = index !== i; if (index !== i) p.querySelector('video').pause();});
        tabs.querySelectorAll('button').forEach(b => {b.setAttribute('aria-selected', String(b === button)); b.tabIndex = b === button ? 0 : -1;});
      });
      button.addEventListener('keydown', event => {
        const keys = ['ArrowLeft', 'ArrowRight', 'Home', 'End'];
        if (!keys.includes(event.key)) return;
        event.preventDefault();
        const next = event.key === 'Home' ? 0 : event.key === 'End' ? panels.length - 1 : (i + (event.key === 'ArrowRight' ? 1 : -1) + panels.length) % panels.length;
        const target = tabs.children[next]; target.click(); target.focus();
      });
      tabs.append(button);
    });
    films.querySelector('.film-panels').before(tabs);
    films.classList.add('film-enhanced');
  }
})();
