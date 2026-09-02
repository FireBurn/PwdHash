import assert from "node:assert/strict";
import test from "node:test";
import { addPageListener, makeLoginForm, type, dispatch, context } from "./content_script_harness.mjs";
import { extensionModernPassword } from "./extension_internals.mjs";

const hiddenOf = (form, field) => form.children.find(c => c !== field);

test("failed login leaves the field editable", async () => {
    const { form, field } = makeLoginForm();
    await type(field, '@@master');
    assert.equal(field.value, 'master');
    await dispatch('blur', field);
    const hashed = field.value;
    assert.notEqual(hashed, 'master');
    assert.equal(hiddenOf(form, field).value, hashed);

    // Site rejects the login and leaves the generated password in the box; user hits backspace.
    field.value = hashed.slice(0, -1);
    await dispatch('input', field);
    assert.equal(field.value, hashed.slice(0, -1), 'user edit must survive');
    assert.equal(field.name, 'password', 'name restored');
    assert.equal(form.children.length, 1, 'hidden field removed');

    // ...and the user can arm PwdHash again without reloading.
    field.value = '';
    await type(field, '@@master2');
    assert.equal(field.value, 'master2');
    await dispatch('blur', field);
    assert.notEqual(field.value, 'master2');
    assert.equal(hiddenOf(form, field).value, field.value);
});

test("a page script cannot revert the field to the master password", async () => {
    const { form, field } = makeLoginForm();
    await type(field, '@@master');
    await dispatch('blur', field);
    const hashed = field.value;

    field.value = 'master';
    await dispatch('input', field, { isTrusted: false });
    assert.equal(field.value, hashed);
    assert.equal(field.name, '', 'still armed');
});

test("pasting a fresh @@ password over a generated one re-arms", async () => {
    const { form, field } = makeLoginForm();
    await type(field, '@@master');
    await dispatch('blur', field);

    field.value = '@@other';
    await dispatch('input', field);
    assert.equal(field.value, 'other', 'prefix stripped, treated as a new master password');
    assert.equal(form.children.length, 2, 'exactly one hidden field');
    await dispatch('blur', field);
    assert.notEqual(field.value, 'other');
    assert.equal(hiddenOf(form, field).value, field.value);
});

test("no stray alerts", () => assert.deepEqual(context.__alerts, []));

test("the page is told about the generated password", async () => {
    const seen = [];
    addPageListener("input", (event) => seen.push(event.target.value));

    const { form, field } = makeLoginForm();
    await type(field, '@@master');
    await dispatch('blur', field);

    // A framework keeps its own copy of the value and submits that, so the last thing the page
    // heard has to be the generated password. (It unavoidably saw the master password being
    // typed - the original extension masked keystrokes for that; we do not.)
    assert.ok(seen.length > 0, "the page saw no input events at all");
    assert.notEqual(field.value, 'master');
    assert.equal(seen[seen.length - 1], field.value, "the page's last value is not the hash");
    assert.equal(hiddenOf(form, field).value, field.value);
});

test("the service worker supplies the suffix list when the page cannot fetch it", async () => {
    context.blockFetch = true;
    try {
        const { form, field } = makeLoginForm();
        await type(field, '@@master');
        await dispatch('blur', field);
        assert.notEqual(field.value, 'master', "nothing was generated");
        assert.equal(hiddenOf(form, field).value, field.value);
    } finally {
        context.blockFetch = false;
    }
});

test("a saved override changes which domain is hashed", async () => {
    // The page is my.mintmobile.com, which the rule resolves to mintmobile.com.
    context.syncStorage = { domainOverrides: { 'mintmobile.com': 'shared-login.example' } };
    try {
        const { form, field } = makeLoginForm();
        await type(field, '@@master');
        await dispatch('blur', field);

        assert.equal(
            field.value,
            await extensionModernPassword('master', 'shared-login.example'),
            "the override was not used as the salt"
        );
        assert.equal(hiddenOf(form, field).value, field.value);
    } finally {
        context.syncStorage = {};
    }
});

test("nothing is generated when the settings cannot be read", async () => {
    context.storageFails = true;
    try {
        const { field } = makeLoginForm();
        await type(field, '@@master');
        await dispatch('blur', field);

        // Falling back to defaults here would silently produce a password for the wrong mode or
        // without the user's override, which looks right and does not work.
        assert.equal(field.value, 'master', "a password was generated from unknown settings");
        assert.deepEqual(context.__alerts, [
            'PwdHash could not generate the password. Please try again.'
        ]);
    } finally {
        context.storageFails = false;
        context.__alerts.length = 0;
    }
});
