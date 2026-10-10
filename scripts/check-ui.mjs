// Playwright MCP: browser_run_code_unsafe({ filename: "scripts/check-ui.mjs" })
// Runs with MCP's existing page; no new browser package is needed.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function checkUi(page) {
  const baseURL = page.url().startsWith('http://127.0.0.1:')
    ? new URL(page.url()).origin
    : 'http://127.0.0.1:4317';
  const originalViewport = page.viewportSize();
  const statusResponse = await page.request.get(`${baseURL}/status`);
  const status = await statusResponse.json();
  if (!status.hash || status.error)
    throw new Error(`UI build is not ready: ${JSON.stringify(status)}`);
  const runId = new Date().toISOString().replace(/[:.]/g, '-');
  const report = {
    runId,
    hash: status.hash,
    scenarios: 0,
    tabsChecked: 0,
    failures: [],
    screenshots: [],
  };
  const runtimeErrors = [];
  const onError = (error) => runtimeErrors.push(error.stack || String(error));
  const onConsole = (message) => {
    if (message.type() === 'error') runtimeErrors.push(message.text());
  };
  page.on('pageerror', onError);
  page.on('console', onConsole);

  async function screenshot(name) {
    const filename = `${status.resultsDirectory}/${runId}-${name}.png`;
    await page.screenshot({ path: filename });
    report.screenshots.push(filename);
    return filename;
  }
  function expect(value, message) {
    if (!value) throw new Error(message);
  }
  async function check(name, action) {
    report.scenarios++;
    try {
      await action();
    } catch (error) {
      const failure = { name, error: error.stack || String(error) };
      report.failures.push(failure);
      failure.screenshot = await screenshot(
        `failure-${name.replace(/[^a-z0-9-]/gi, '-')}`,
      );
    }
  }
  async function render(options) {
    await page.evaluate(
      (scenario) => window.uiFixture.render(scenario),
      options,
    );
  }
  async function selectTab(id) {
    await page.locator(`label[for="${id}"]`).click();
  }

  try {
    await page.goto(`${baseURL}/fixture`);
    await page.waitForFunction(() => !!window.uiFixture);
    expect(
      (await page.evaluate(() => window.uiFixture.buildHash)) === status.hash,
      'Fixture is running an outdated build',
    );
    await check('preview-controls', async () => {
      await page.goto(baseURL);
      await page.frameLocator('#preview').locator('#dialog').waitFor();
      await page.locator('select[name="mode"]').selectOption('home');
      await page.locator('select[name="size"]').selectOption('empty');
      await page.locator('select[name="theme"]').selectOption('dark');
      await page.locator('select[name="network"]').selectOption('error');
      await page.locator('select[name="viewport"]').selectOption('844x390');
      await page
        .frameLocator('#preview')
        .locator('label[for="subscribe"]')
        .click();
      await page
        .frameLocator('#preview')
        .getByText(
          '구독 채널이 없습니다. /b/my에서 로그인 상태와 구독 목록을 확인해주세요.',
          { exact: true },
        )
        .waitFor();
      const frame = page
        .frames()
        .find((frame) => frame.url().includes('/fixture'));
      expect(
        await frame.evaluate(
          () =>
            window.uiFixture.scenario.theme === 'dark' &&
            innerWidth === 844 &&
            innerHeight === 390,
        ),
        'Preview options were not applied',
      );
    });
    await page.goto(`${baseURL}/fixture`);
    await page.waitForFunction(() => !!window.uiFixture);
    const viewports = [
      [1280, 900],
      [375, 667],
      [320, 568],
      [844, 390],
      [375, 390],
    ];
    const modes = ['channel', 'home', 'series', 'feed', 'scrap'];
    for (const [width, height] of viewports) {
      await page.setViewportSize({ width, height });
      for (const theme of ['light', 'dark'])
        for (const mode of modes)
          for (const size of ['empty', 'short', 'long']) {
            await check(
              `${width}x${height}-${theme}-${mode}-${size}`,
              async () => {
                await render({ mode, size, theme });
                const result = await page.evaluate((mode) => {
                  const errors = [];
                  const labels = [
                    ...document.querySelectorAll('.helper-modal-tab-label'),
                  ];
                  const actual = labels.map((label) => label.htmlFor);
                  const expected =
                    mode === 'home' || mode === 'feed'
                      ? ['subscribe', 'ui', 'history', 'resume']
                      : mode === 'series' || mode === 'scrap'
                        ? ['ui', 'history', 'resume']
                        : ['filter', 'ui', 'history', 'resume'];
                  if (actual.join() !== expected.join())
                    errors.push(`Unexpected tabs: ${actual}`);
                  for (const id of actual) {
                    document.getElementById(id).checked = true;
                    const body = document.querySelector('.helper-modal-body');
                    const tab = document.querySelector(`.helper-modal-${id}`);
                    const box = tab.getBoundingClientRect();
                    const content = tab.querySelector(
                      '.arcafeed-modal-content',
                    );
                    const header = tab.querySelector(
                      '.arcafeed-reading-header',
                    );
                    const footer = tab.querySelector(
                      '.arcafeed-modal-actions, .arcafeed-history-footer',
                    );
                    if (
                      Math.abs(
                        body.getBoundingClientRect().height - innerHeight * 0.8,
                      ) > 1
                    )
                      errors.push(`${id}: height differs from 80%`);
                    if (tab.scrollHeight > tab.clientHeight + 1)
                      errors.push(`${id}: nested outer scroll`);
                    if (content.clientHeight < 20)
                      errors.push(`${id}: collapsed content`);
                    if (content.scrollWidth > content.clientWidth + 1)
                      errors.push(`${id}: horizontal overflow`);
                    const headerTop = header.getBoundingClientRect().top;
                    const footerTop = footer?.getBoundingClientRect().top;
                    content.scrollTop = content.scrollHeight;
                    if (
                      header.getBoundingClientRect().top !== headerTop ||
                      footer?.getBoundingClientRect().top !== footerTop
                    )
                      errors.push(`${id}: header/footer moves while scrolling`);
                    for (const button of footer?.querySelectorAll(
                      'button, a',
                    ) || []) {
                      const rect = button.getBoundingClientRect();
                      if (
                        rect.left < box.left ||
                        rect.right > box.right ||
                        rect.top < box.top ||
                        rect.bottom > box.bottom
                      )
                        errors.push(`${id}: footer button is clipped`);
                    }
                    if (id === 'history') {
                      const [a, b] = [
                        ...footer.querySelector(
                          '.arcafeed-history-footer-actions',
                        ).children,
                      ].map((node) => node.getBoundingClientRect());
                      if (Math.abs(b.left - a.right - 8) > 1 || a.top !== b.top)
                        errors.push('history: footer buttons are separated');
                    }
                  }
                  return { errors, count: actual.length };
                }, mode);
                report.tabsChecked += result.count;
                expect(!result.errors.length, result.errors.join('\n'));
              },
            );
          }
    }

    await page.setViewportSize({ width: 375, height: 667 });
    await check('history-search-pagination', async () => {
      await render({ tab: 'history' });
      const search = page.getByRole('searchbox', { name: '최근 본 글 검색' });
      await search.fill('게시글 69');
      expect(
        (await page.locator('.arcafeed-history-row').count()) === 1,
        'History search failed',
      );
      await page.getByRole('button', { name: '검색어 지우기' }).click();
      expect(
        (await page.locator('.arcafeed-history-row').count()) === 50,
        'History search clear failed',
      );
      await page
        .getByRole('button', { name: '더 보기 · 20개', exact: true })
        .click();
      expect(
        (await page.locator('.arcafeed-history-row').count()) === 70,
        'History pagination failed',
      );
      await page
        .getByRole('combobox', { name: '채널 필터', exact: true })
        .selectOption('test0');
      expect(
        (await page.locator('.arcafeed-history-row').count()) === 1,
        'History channel filter failed',
      );
      await search.fill('없는 검색어');
      expect(
        await page
          .getByText('검색 결과가 없습니다', { exact: true })
          .isVisible(),
        'History empty state missing',
      );
    });
    await check('tab-scroll-reset', async () => {
      await render({ tab: 'ui' });
      await page.evaluate(() => {
        document.querySelector(
          '.helper-modal-ui .arcafeed-modal-content',
        ).scrollTop = 10000;
      });
      await selectTab('history');
      await selectTab('ui');
      expect(
        (await page.evaluate(
          () =>
            document.querySelector('.helper-modal-ui .arcafeed-modal-content')
              .scrollTop,
        )) === 0,
        'Tab scroll did not reset',
      );
      expect(
        (await page.evaluate(
          () => window.uiFixture.vault.uiSettings.lastModalTab,
        )) === 'ui',
        'Tab preference was not saved',
      );
    });
    await check('ui-save-and-close', async () => {
      await render({ tab: 'ui' });
      await page
        .locator('input[data-key="hideNavControl"]')
        .check({ force: true });
      await page.getByRole('button', { name: '적용', exact: true }).click();
      expect(
        (await page.locator('#dialog').count()) === 0,
        'UI apply did not close the dialog',
      );
      expect(
        await page.evaluate(
          () => window.uiFixture.vault.uiSettings.hideNavControl,
        ),
        'UI setting was not saved',
      );
      await page.getByRole('button', { name: '모달 다시 열기' }).click();
      await page.keyboard.press('Escape');
      expect(
        (await page.locator('#dialog').count()) === 0,
        'Escape did not close the dialog',
      );
    });
    await check('resume-search-delete', async () => {
      await render({ tab: 'resume' });
      const search = page.getByRole('searchbox', { name: '이어보기 검색' });
      await search.fill('게시글 19');
      expect(
        (await page.locator('.arcafeed-resume-card').count()) === 1,
        'Resume search failed',
      );
      await page.locator('.arcafeed-resume-delete').click();
      expect(
        (await page.locator('.arcafeed-resume-card').count()) === 0,
        'Resume delete failed',
      );
      expect(
        (await page.evaluate(
          () => window.uiFixture.vault.reading.sessions.length,
        )) === 19,
        'Resume session was not deleted',
      );
    });
    for (const [width, height] of viewports) {
      await page.setViewportSize({ width, height });
      await check(`filter-editor-${width}x${height}`, async () => {
        await render({ mode: 'home', tab: 'subscribe' });
        await page
          .getByRole('button', {
            name: '테스트 채널 1 긴 이름 테스트 필터 수정',
            exact: true,
          })
          .click();
        await page
          .locator('.arcafeed-subscribe-filter-editor')
          .waitFor({ state: 'visible' });
        expect(
          await page.evaluate(() => {
            const editor = document.querySelector(
              '.arcafeed-subscribe-filter-editor',
            );
            return (
              editor.scrollHeight <= editor.clientHeight + 1 &&
              editor
                .querySelector('.arcafeed-modal-actions')
                .getBoundingClientRect().bottom <=
                editor.getBoundingClientRect().bottom + 1
            );
          }),
          'Embedded filter editor overflows',
        );
        await page
          .locator('.arcafeed-subscribe-filter-editor #exclude-title')
          .fill('검증 키워드');
        await page
          .locator('.arcafeed-subscribe-filter-editor #exclude-btn')
          .click();
        await page
          .locator('.arcafeed-subscribe-filter-editor #filter-check-btn')
          .click();
        expect(
          (await page.locator('.arcafeed-subscribe-filter-editor').count()) ===
            0,
          'Filter editor did not close',
        );
        expect(
          (
            await page
              .locator('.arcafeed-subscribe-summary')
              .nth(1)
              .textContent()
          ).includes('차단 키워드 1개'),
          'Filter draft was not applied',
        );
        expect(
          (await page
            .locator('#subscribe-buttons')
            .evaluate((node) => getComputedStyle(node).display)) === 'flex',
          'Subscription footer layout was not restored',
        );
        await page.locator('#subscribe-save-btn').click();
        expect(
          (await page.locator('#dialog').count()) === 0,
          'Subscription save did not close the dialog',
        );
        expect(
          await page.evaluate(() =>
            window.uiFixture.vault.articleFilterConfig.test1?.title.includes(
              '검증 키워드',
            ),
          ),
          'Subscription filter was not saved',
        );
      });
    }
    await page.setViewportSize({ width: 375, height: 667 });
    await check('filter-fetch-error', async () => {
      await render({ mode: 'home', tab: 'subscribe', network: 'error' });
      await page
        .getByRole('button', {
          name: '테스트 채널 1 긴 이름 테스트 필터 수정',
          exact: true,
        })
        .click();
      await page
        .getByText(
          '카테고리를 불러오지 못했습니다. 저장된 카테고리와 다른 필터는 수정할 수 있습니다.',
          { exact: true },
        )
        .waitFor();
      expect(
        (await page
          .locator('.arcafeed-modal-content [role="status"]')
          .count()) === 1,
        'Error notice is outside the content',
      );
      await page.locator('#filter-cancel-btn').click();
      expect(
        await page.locator('#subscribe-buttons').isVisible(),
        'Error cancel did not restore subscriptions',
      );
    });
    await check('filter-fetch-cancel', async () => {
      await render({ mode: 'home', tab: 'subscribe', network: 'slow' });
      await page
        .getByRole('button', {
          name: '테스트 채널 1 긴 이름 테스트 필터 수정',
          exact: true,
        })
        .click();
      await page.locator('.arcafeed-subscribe-filter-loading').waitFor();
      await page.getByRole('button', { name: '취소', exact: true }).click();
      await page.waitForTimeout(1600);
      expect(
        (await page.locator('.arcafeed-subscribe-filter-editor').count()) === 0,
        'Cancelled request reopened the editor',
      );
    });
    for (const [device, width, height] of [
      ['mobile', 375, 667],
      ['desktop', 1280, 900],
      ['landscape', 844, 390],
    ]) {
      await page.setViewportSize({ width, height });
      for (const tab of ['filter', 'ui', 'subscribe', 'history', 'resume']) {
        await render({ mode: tab === 'subscribe' ? 'home' : 'channel', tab });
        await screenshot(`${device}-${tab}`);
      }
    }
    const finalStatus = await (
      await page.request.get(`${baseURL}/status`)
    ).json();
    expect(
      finalStatus.hash === status.hash,
      'Sources changed during the tests; rerun against a single build',
    );
  } catch (error) {
    report.failures.push({
      name: 'suite',
      error: error.stack || String(error),
    });
  } finally {
    page.off('pageerror', onError);
    page.off('console', onConsole);
    if (originalViewport) await page.setViewportSize(originalViewport);
  }
  if (runtimeErrors.length)
    report.failures.push({
      name: 'runtime',
      errors: runtimeErrors,
      screenshot: await screenshot('failure-runtime'),
    });
  report.passed = !report.failures.length;
  const saved = await page.request.post(`${baseURL}/results`, { data: report });
  expect(saved.ok(), `Cannot save UI test report: HTTP ${saved.status()}`);
  report.reportPath = (await saved.json()).reportPath;
  return report;
}
