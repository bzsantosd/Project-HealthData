(() => {
  const requiredProfile = document.body.dataset.requiredProfile;
  if (!requiredProfile) return;

  if (!sessionStorage.getItem('userProfile')) {
    const savedProfile = localStorage.getItem('userProfile');
    const savedUsername = localStorage.getItem('username');
    if (savedProfile && savedUsername) {
      sessionStorage.setItem('userProfile', savedProfile);
      sessionStorage.setItem('username', savedUsername);
    }
  }

  if (sessionStorage.getItem('userProfile') !== requiredProfile) {
    window.location.replace('/login');
  }
})();
