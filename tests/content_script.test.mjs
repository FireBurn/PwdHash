import assert from "node:assert/strict";
import test from "node:test";
import { makeLoginForm, type, dispatch, context } from "./content_script_harness.mjs";

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
