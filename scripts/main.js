

const photoGrid = document.getElementById('photo-grid');
const loadingSpinner = document.getElementById('loading');
const noMoreContent = document.getElementById('no-more-content');
let page = 1; // Track the current page of photos
const totalPages = 5; // Simulate a total of 5 pages of photos
let isLoading = false; // Prevent duplicate loading
// Function to fetch more photos (mock data for now)
function fetchMorePhotos() {
  if (page > totalPages) {
    noMoreContent.style.display = 'block'; // Show "no more content" message
    loadingSpinner.style.display = 'none'; // Hide loading spinner
    return; // Stop fetching more photos
  }

  if (isLoading) return; // Prevent multiple API calls
  isLoading = true; // Set loading state

 loadingSpinner.style.display = 'block'; // Show loading spinner

  // Simulate an API call with a delay
  setTimeout(() => {
    const newPhotos = [
      { src: 'assets/photo1.jpg', alt: 'Photo 1' },
      { src: 'assets/photo2.jpg.jpg', alt: 'Photo 2' },
      { src: 'assets/photo3.jpg', alt: 'Photo 3' },
      { src: 'assets/photo3.jpg', alt: 'Photo 4' },
      { src: 'assets/photo3.jpg', alt: 'Photo 5' },
      { src: 'assets/photo3.jpg', alt: 'Photo 6' },
     
    ];

    // Add new photos to the grid
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

    loadingSpinner.style.display = 'none'; // Hide loading spinner
    page++; // Increment the page number
  }, 1000); // Simulate a 1-second delay
}


// Optimized Scroll Event
window.addEventListener('scroll', () => {
  const { scrollTop, scrollHeight, clientHeight } = document.documentElement;

  if (!isLoading && scrollTop + clientHeight >= scrollHeight - 10) {
      fetchMorePhotos();
  }
});

// Load initial photos
fetchMorePhotos();

// document.addEventListener("DOMContentLoaded", () => {
//   document.getElementById("loginBtn").addEventListener("click", handleLogin);
//   document.getElementById("signupBtn").addEventListener("click", handleSignup);
// });

// function handleLogin() {
//   console.log("Logging in...");
//   // Authentication logic here
// }

// function handleSignup() {
//   console.log("Signing up...");
//   // Authentication logic here
// }

// Hamburger Menu Toggle
const hamburger = document.querySelector('.hamburger');
const navLinks = document.querySelector('.nav-links');

hamburger.addEventListener('click', () => {
  hamburger.classList.toggle('active');
  navLinks.classList.toggle('active');
});

// Toggle dropdown menu
const profileLogo = document.getElementById('profile-logo');
const dropdownMenu = document.getElementById('dropdown-menu');

profileLogo.addEventListener('click', () => {
  dropdownMenu.style.display = dropdownMenu.style.display === 'block' ? 'none' : 'block';
});

// Close dropdown when clicking outside
document.addEventListener('click', (e) => {
  if (!profileLogo.contains(e.target)) {
    dropdownMenu.style.display = 'none';
  }
});