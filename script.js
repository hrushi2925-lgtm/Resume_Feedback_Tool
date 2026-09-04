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
    document.getElementById('results').classList.remove('hidden');
    document.getElementById('feedbackText').textContent = data.message + ' (' + data.filename + ')';

  } catch (error) {
    document.getElementById('loading').classList.add('hidden');
    alert('Something went wrong: ' + error.message);
  }
});