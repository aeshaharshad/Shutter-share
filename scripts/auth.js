// Check if the user is logged in
function checkAuth() {
    const isLoggedIn = localStorage.getItem('isLoggedIn');
    if (!isLoggedIn && !window.location.pathname.includes('login.html') && !window.location.pathname.includes('signup.html')) {
      window.location.href = 'login.html';
    }
  }
  
  // Login functionality
  document.getElementById('login-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    localStorage.setItem('isLoggedIn', 'true');
    window.location.href = 'index.html';
  });
  
  // Logout functionality
  document.getElementById('logout-btn')?.addEventListener('click', () => {
    localStorage.removeItem('isLoggedIn');
    window.location.href = 'login.html';
  });
  
  // Run auth check on page load
  checkAuth();