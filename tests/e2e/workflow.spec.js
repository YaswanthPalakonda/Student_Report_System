import { test, expect } from '@playwright/test';

test('admin, teacher and student share records across isolated browser sessions', async ({ browser }) => {
  const password = process.env.SRS_TEST_PASSWORD;
  const contexts = await Promise.all([browser.newContext(), browser.newContext(), browser.newContext()]);
  const [admin, teacher, student] = await Promise.all(contexts.map(context => context.newPage()));
  const errors = [];
  for (const page of [admin, teacher, student]) page.on('pageerror', error => errors.push(error.message));
  const login = async (page, email, role) => {
    await page.goto('/login');
    await page.getByLabel('Email', { exact: true }).fill(email);
    await page.getByLabel('Password', { exact: true }).fill(password);
    await page.getByRole('button', { name: /Sign in/ }).click();
    await expect(page).toHaveURL(`/${role}`);
    await expect(page.getByText('Loading records…')).toBeHidden();
  };
  try {
    await admin.goto('/login');
    await admin.getByLabel('Email', { exact: true }).fill('admin@example.test');
    await admin.getByLabel('Password', { exact: true }).fill(password);
    await admin.getByRole('button', { name: 'Show password' }).click();
    await expect(admin.getByLabel('Password', { exact: true })).toHaveAttribute('type', 'text');
    await admin.getByRole('button', { name: 'Hide password' }).click();
    await admin.getByLabel('Remember me').check();
    await admin.getByRole('button', { name: /Sign in/ }).click();
    await expect(admin).toHaveURL('/admin');
    console.info('Browser check: administrator signed in.');
    await admin.getByRole('button', { name: /Class & Subject/ }).click();
    for (const [heading, name, button] of [['Classes', 'CSE A', 'Add Class'], ['Subjects', 'Mathematics', 'Add Subject']]) {
      const panel = admin.locator('.panel').filter({ has: admin.getByRole('heading', { name: heading, exact: true }) });
      await panel.getByLabel('Name', { exact: true }).fill(name);
      await panel.getByRole('button', { name: button }).click();
      await expect(panel.getByRole('cell', { name, exact: true })).toBeVisible();
    }
    await admin.getByRole('button', { name: /User Management/ }).click();
    console.info('Browser check: class and subject created.');
    for (const [name, email, role] of [['Teacher One', 'teacher@example.test', 'teacher'], ['Student One', 'student@example.test', 'student']]) {
      await admin.getByRole('button', { name: /Add User/ }).click();
      const modal = admin.locator('.modal');
      await modal.getByLabel('Full name').fill(name);
      await modal.getByLabel('Email', { exact: true }).fill(email);
      await modal.getByLabel('Password', { exact: true }).fill(password);
      await modal.getByLabel('Role', { exact: true }).selectOption(role);
      if (role === 'student') { await modal.getByLabel('Class / Section').selectOption({ label: 'CSE A' }); await modal.getByLabel('Student ID').fill('S001'); }
      await modal.getByRole('button', { name: 'Save User' }).click();
      await expect(modal).toBeHidden();
      await expect(admin.getByRole('cell', { name: email, exact: true })).toBeVisible();
    }
    await admin.getByRole('button', { name: /Class & Subject/ }).click();
    await admin.getByLabel('Teacher', { exact: true }).selectOption({ label: 'Teacher One' });
    await admin.getByLabel('Class / Section', { exact: true }).selectOption({ label: 'CSE A' });
    await admin.getByLabel('Subject', { exact: true }).selectOption({ label: 'Mathematics' });
    await admin.getByRole('button', { name: 'Save Assignment' }).click();
    await expect(admin.getByRole('cell', { name: 'Teacher One', exact: true })).toBeVisible();
    await login(teacher, 'teacher@example.test', 'teacher');
    await login(student, 'student@example.test', 'student');
    console.info('Browser check: accounts and assignment created; all roles signed in.');
    await teacher.getByRole('button', { name: /Marks & Attendance/ }).click();
    await teacher.getByLabel('Student', { exact: true }).selectOption({ label: 'Student One · CSE A' });
    await teacher.getByLabel('Subject', { exact: true }).selectOption({ label: 'Mathematics' });
    await teacher.getByLabel('Test / Internal Marks (40)').fill('35');
    await teacher.getByLabel('Exam Marks (60)').fill('55');
    await teacher.getByLabel('Attendance (%)').fill('92');
    await teacher.getByLabel('Teacher Remarks').fill('Excellent progress');
    await teacher.getByRole('button', { name: 'Save Student Report' }).click();
    await expect(teacher.getByText(/Report saved/)).toBeVisible();
    await student.getByRole('button', { name: /Report Card/ }).click();
    await student.evaluate(() => window.dispatchEvent(new Event('focus')));
    await expect(student.getByRole('cell', { name: 'Excellent progress' })).toBeVisible();
    await expect(student.getByRole('cell', { name: 'A+', exact: true })).toBeVisible();
    console.info('Browser check: teacher report reached the independent student browser.');
    await admin.getByRole('button', { name: /Reports/, exact: false }).click();
    await admin.evaluate(() => window.dispatchEvent(new Event('focus')));
    await expect(admin.getByRole('cell', { name: 'Student One', exact: true })).toBeVisible();
    await teacher.getByRole('button', { name: /My Reports/ }).click();
    await teacher.getByRole('button', { name: 'Edit', exact: true }).click();
    await teacher.getByLabel('Attendance (%)').fill('88');
    await teacher.getByLabel('Teacher Remarks').fill('Updated across devices');
    await teacher.getByRole('button', { name: 'Update Student Report' }).click();
    await expect(teacher.getByText(/Report saved/)).toBeVisible();
    await student.evaluate(() => window.dispatchEvent(new Event('focus')));
    await expect(student.getByRole('cell', { name: 'Updated across devices' })).toBeVisible();
    await student.reload();
    await expect(student).toHaveURL('/student');
    await student.getByRole('button', { name: /Report Card/ }).click();
    await expect(student.getByRole('cell', { name: 'Updated across devices' })).toBeVisible();
    await student.evaluate(() => { window.__printRequested = false; window.print = () => { window.__printRequested = true; }; });
    await student.getByRole('button', { name: /Print \/ Save PDF/ }).click();
    await expect.poll(() => student.evaluate(() => window.__printRequested)).toBe(true);
    await student.emulateMedia({ media: 'print' });
    await expect(student.locator('#reports')).toBeVisible();
    await expect(student.locator('.sidebar')).toBeHidden();
    await student.pdf({ path: '.test-artifacts/report-card.pdf', format: 'A4', printBackground: true });
    await student.emulateMedia({ media: 'screen' });
    await student.screenshot({ path: '.test-artifacts/student-report.png', fullPage: true });
    await student.setViewportSize({ width: 390, height: 844 });
    await expect(student.getByRole('button', { name: /Print/ })).toBeVisible();
    expect(await student.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
    await student.screenshot({ path: '.test-artifacts/student-mobile.png', fullPage: true });
    for (const page of [admin, teacher, student]) {
      const keys = await page.evaluate(() => Object.keys(localStorage));
      expect(keys.every(key => ['theme', 'rememberedUser'].includes(key))).toBeTruthy();
    }
    await admin.getByRole('button', { name: 'Logout', exact: true }).click();
    await expect(admin).toHaveURL('/login');
    await expect(admin.getByLabel('Email', { exact: true })).toHaveValue('admin@example.test');
    await expect(admin.getByLabel('Password', { exact: true })).toHaveValue('');
    expect(errors).toEqual([]);
  } finally { await Promise.all(contexts.map(context => context.close())); }
});
