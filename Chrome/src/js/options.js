/**
 * @file Logic for the PwdHash options page.
 * @description Handles saving and loading user preferences.
 */
document.addEventListener('DOMContentLoaded', function() {
  const statusDiv = document.getElementById('status');
  const alertPwdCheckbox = document.getElementById('alertPwd');
  const modernRadio = document.getElementById('mode-modern');
  const legacyRadio = document.getElementById('mode-legacy');

  // Load saved settings
  chrome.storage.sync.get({
    alertPwd: false,
    passwordMode: 'modern'
  }, function(items) {
    alertPwdCheckbox.checked = items.alertPwd;

    if (items.passwordMode === 'modern') {
      modernRadio.checked = true;
    } else {
      legacyRadio.checked = true;
    }
  });

  // Save settings when changed
  function saveSettings() {
    const passwordMode = modernRadio.checked ? 'modern' : 'legacy';

    chrome.storage.sync.set({
      alertPwd: alertPwdCheckbox.checked,
      passwordMode: passwordMode
    }, function() {
      // Show status message
      statusDiv.textContent = '✓ Settings saved';
      statusDiv.classList.add('show');

      setTimeout(function() {
        statusDiv.classList.remove('show');
      }, 2000);
    });
  }

  // Listen for changes
  alertPwdCheckbox.addEventListener('change', saveSettings);
  modernRadio.addEventListener('change', saveSettings);
  legacyRadio.addEventListener('change', saveSettings);
});
