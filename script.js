document.getElementById('uploadForm').addEventListener('submit', async function(e) {
  e.preventDefault();

  const fileInput = document.getElementById('resumeFile');
  const file = fileInput.files[0];

  if (!file) {
    alert('Please select a file first.');
    return;
  }

  const formData = new FormData();
  formData.append('resume', file);

  document.getElementById('loading').classList.remove('hidden');
  document.getElementById('results').classList.add('hidden');

  try {
    const response = await fetch('http://localhost:3000/api/analyze', {
      method: 'POST',
      body: formData
    });

    const data = await response.json();

    document.getElementById('loading').classList.add('hidden');

    if (!response.ok) {
      throw new Error(data.message || 'Something went wrong.');
    }

    document.getElementById('results').classList.remove('hidden');

    renderFeedback(data.feedback);

  } catch (error) {
    document.getElementById('loading').classList.add('hidden');

    alert('Something went wrong: ' + error.message);
  }
});


function renderFeedback(feedback) {
  const container = document.getElementById('feedbackText');

  if (!feedback) {
    container.textContent = 'No feedback was returned.';
    return;
  }

  // Remove escaped HTML artifacts produced by the model
  feedback = feedback
    .replace(/\\<br\\s*\/?>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n');

  // Extract scores
  const overallMatch = feedback.match(/Overall Score:\s*(\d+)\s*\/\s*100/i);
  const atsMatch = feedback.match(/Overall ATS Score:\s*(\d+)\s*\/\s*100/i);

  const overallScore = overallMatch ? overallMatch[1] : null;
  const atsScore = atsMatch ? atsMatch[1] : null;

  // Remove score lines from main content
  feedback = feedback
    .replace(/Overall Score:\s*\d+\s*\/\s*100/gi, '')
    .replace(/Overall ATS Score:\s*\d+\s*\/\s*100/gi, '');

  let html = '';

  // Score cards
  if (overallScore || atsScore) {
    html += `<div class="score-grid">`;

    if (overallScore) {
      html += `
        <div class="score-card">
          <div class="score-label">Overall Score</div>
          <div class="score-number">${overallScore}<span>/100</span></div>
          <div class="score-bar">
            <div class="score-fill" style="width:${overallScore}%"></div>
          </div>
        </div>
      `;
    }

    if (atsScore) {
      html += `
        <div class="score-card">
          <div class="score-label">ATS Score</div>
          <div class="score-number">${atsScore}<span>/100</span></div>
          <div class="score-bar">
            <div class="score-fill" style="width:${atsScore}%"></div>
          </div>
        </div>
      `;
    }

    html += `</div>`;
  }

  html += markdownToHTML(feedback);

  container.innerHTML = html;
}


function escapeHTML(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}


function formatInline(text) {
  let result = escapeHTML(text);

  // Bold
  result = result.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

  // Inline code
  result = result.replace(/`([^`]+)`/g, '<code>$1</code>');

  return result;
}


function markdownToHTML(markdown) {
  const lines = markdown.split('\n');

  let html = '';
  let inList = false;
  let listType = null;
  let tableRows = [];
  let inTable = false;

  function closeList() {
    if (inList) {
      html += `</${listType}>`;
      inList = false;
      listType = null;
    }
  }

  function renderTable() {
    if (tableRows.length === 0) return;

    const headers = tableRows[0];

    html += `<div class="table-wrapper"><table><thead><tr>`;

    headers.forEach(cell => {
      html += `<th>${formatInline(cell.trim())}</th>`;
    });

    html += `</tr></thead><tbody>`;

    for (let i = 2; i < tableRows.length; i++) {
      html += `<tr>`;

      tableRows[i].forEach(cell => {
        html += `<td>${formatInline(cell.trim())}</td>`;
      });

      html += `</tr>`;
    }

    html += `</tbody></table></div>`;

    tableRows = [];
    inTable = false;
  }

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i].trim();

    // Empty line
    if (!line) {
      closeList();

      if (inTable) {
        renderTable();
      }

      continue;
    }

    // Markdown table
    if (line.startsWith('|') && line.endsWith('|')) {
      closeList();

      const cells = line
        .slice(1, -1)
        .split('|')
        .map(cell => cell.trim());

      if (!inTable) {
        inTable = true;
      }

      tableRows.push(cells);

      continue;
    }

    if (inTable) {
      renderTable();
    }

    // Horizontal rule
    if (/^[-*_]{3,}$/.test(line)) {
      closeList();
      html += `<hr>`;
      continue;
    }

    // H1
    if (line.startsWith('# ')) {
      closeList();
      html += `<h2>${formatInline(line.substring(2))}</h2>`;
      continue;
    }

    // H2
    if (line.startsWith('## ')) {
      closeList();
      html += `<h2>${formatInline(line.substring(3))}</h2>`;
      continue;
    }

    // H3
    if (line.startsWith('### ')) {
      closeList();
      html += `<h3>${formatInline(line.substring(4))}</h3>`;
      continue;
    }

    // Bullet list
    if (/^[-*•]\s+/.test(line)) {
      if (!inList || listType !== 'ul') {
        closeList();
        html += `<ul>`;
        inList = true;
        listType = 'ul';
      }

      const item = line.replace(/^[-*•]\s+/, '');
      html += `<li>${formatInline(item)}</li>`;
      continue;
    }

    // Numbered list
    if (/^\d+\.\s+/.test(line)) {
      if (!inList || listType !== 'ol') {
        closeList();
        html += `<ol>`;
        inList = true;
        listType = 'ol';
      }

      const item = line.replace(/^\d+\.\s+/, '');
      html += `<li>${formatInline(item)}</li>`;
      continue;
    }

    closeList();

    // Normal paragraph
    html += `<p>${formatInline(line)}</p>`;
  }

  closeList();

  if (inTable) {
    renderTable();
  }

  return html;
}