// Handle file uploads
document.getElementById('upload-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const files = document.getElementById('file-input').files;
    if (files.length > 0) {
      alert(`${files.length} file(s) selected. Upload functionality will be added later.`);
    } else {
      alert('Please select a file to upload.');
    }
  });