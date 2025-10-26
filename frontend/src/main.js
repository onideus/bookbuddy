// BookBuddy Frontend Entry Point

// Initialize the application
const init = () => {
  const contentDiv = document.getElementById('content');

  if (contentDiv) {
    contentDiv.innerHTML = `
      <div class="welcome">
        <h2>Welcome to BookBuddy!</h2>
        <p>Your personal reading journey tracker is ready to go.</p>
        <div class="status">
          <p>✓ Vite is running</p>
          <p>✓ Frontend is configured</p>
          <p>✓ Ready for development</p>
        </div>
      </div>
    `;
  }
};

// Run initialization when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
