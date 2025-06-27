const statusDiv = document.getElementById('status');
const optionsBtn = document.getElementById('optionsBtn');

document.addEventListener('DOMContentLoaded', () => {
    browser.tabs.query({ active: true, currentWindow: true }).then((tabs) => {
        const currentTab = tabs[0];
        if (currentTab && currentTab.url && (currentTab.url.startsWith('http:') || currentTab.url.startsWith('https://'))) {
             const domain = PasswordGenerator.getSite(currentTab.url);
             if (domain) {
                statusDiv.innerHTML = `PwdHash is active for:<br/><span id="domain">${domain}</span>`;
             } else {
                statusDiv.textContent = 'PwdHash is active for this site.';
             }
        } else {
            statusDiv.textContent = 'PwdHash is inactive on this page.';
        }
    }).catch(err => {
        statusDiv.textContent = 'Could not determine tab status.';
        console.error(err);
    });
});

optionsBtn.addEventListener('click', () => {
    browser.runtime.openOptionsPage();
});
