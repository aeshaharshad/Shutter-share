const photoGrid = document.getElementById('photo-grid');
const loadingSpinner = document.getElementById('loading');
const noMoreContent = document.getElementById('no-more-content');
let page = 1;
const totalPages = 5;

function fetchMorePhotos() {
  if (page > totalPages) {
    noMoreContent.style.display = 'block';
    loadingSpinner.style.display = 'none';
    return;
  }

  loadingSpinner.style.display = 'block';

  setTimeout(() => {
    const newPhotos = [
      { src: 'assets/placeholder.jpg', alt: 'Photo 1' },
      { src: 'assets/placeholder.jpg', alt: 'Photo 2' },
      { src: 'assets/placeholder.jpg', alt: 'Photo 3' },
      { src: 'assets/placeholder.jpg', alt: 'Photo 4' },
    ];

    newPhotos.forEach(photo => {
      const photoItem = document.createElement('div');
      photoItem.classList.add('photo-item');
      photoItem.innerHTML = `
        <img src="${photo.src}" alt="${photo.alt}">
        <div class="photo-actions">
          <button class="button-hover">Like</button>
          <button class="button-hover">Comment</button>
          <button class="button-hover">Share</button>
        </div>
      `;
      photoGrid.appendChild(photoItem);
    });

    loadingSpinner.style.display = 'none';
    page++;
  }, 1000);
}

window.addEventListener('scroll', () => {
  const { scrollTop, scrollHeight, clientHeight } = document.documentElement;

  if (scrollTop + clientHeight >= scrollHeight - 10) {
    fetchMorePhotos();
  }
});

fetchMorePhotos();