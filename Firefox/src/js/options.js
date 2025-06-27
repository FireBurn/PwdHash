const checkbox = document.getElementById('alertPwd');
const statusDiv = document.getElementById('status');

function restoreOptions() {
    browser.storage.sync.get({ alertPwd: false }).then((items) => {
        checkbox.checked = items.alertPwd;
    }, (error) => {
        console.error(`Error: ${error}`);
    });
}

function saveOptions() {
    browser.storage.sync.set({
        alertPwd: checkbox.checked
    }).then(() => {
        statusDiv.textContent = 'Options saved.';
        setTimeout(() => {
            statusDiv.textContent = '';
        }, 1500);
    });
}

document.addEventListener('DOMContentLoaded', restoreOptions);
checkbox.addEventListener('change', saveOptions);
