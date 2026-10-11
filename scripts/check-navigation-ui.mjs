// Playwright MCP: browser_run_code_unsafe({ filename: 'scripts/check-navigation-ui.mjs' })
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function checkNavigationUi(page) {
  const baseURL = new URL(page.url()).origin;
  const results = [];
  for (const width of [375, 1200]) {
    await page.setViewportSize({ width, height: 800 });
    await page.goto(`${baseURL}/fixture?mode=series&size=long`);
    await page.waitForFunction(() => Boolean(window.uiFixture));
    await page.evaluate(() => {
      document.querySelector('#dialog')?.remove();
      const native = document.createElement('div');
      native.className = 'nav-control';
      native.style.cssText = 'position:fixed;right:16px;bottom:20px';
      native.innerHTML =
        '<a style="display:block;width:44px;height:44px;background:rgb(35,45,55);color:white;border-radius:2px">↑</a>';
      document.body.append(native);
    });
    const trigger = page.locator('.arcafeed-navigation-trigger');
    await page.mouse.move(width / 2, 10);
    for (const index of [0, 150, 249]) {
      await page.evaluate((currentIndex) => {
        const vault = window.uiFixture.vault;
        vault.articleList = Array.from(
          { length: 250 },
          (_, i) => `/b/test0/${1000 - i}`,
        );
        vault.activeIndex = currentIndex;
        vault.href.mode = 'ARTICLE';
        vault.href.articleId = String(1000 - currentIndex);
        document.dispatchEvent(new Event('pointerdown'));
      }, index);
      await trigger.click();
      await page.waitForFunction(() => {
        const container = document.querySelector(
          '.arcafeed-navigation-panel .arcafeed-modal-content',
        );
        const current = container?.querySelector('[aria-current="page"]');
        if (!current) return false;
        const a = container.getBoundingClientRect();
        const b = current.getBoundingClientRect();
        return (
          Math.abs(b.top + b.height / 2 - a.top - container.clientHeight / 2) <
          2
        );
      });
      const rows = await page.locator('.arcafeed-navigation-row').count();
      if (rows > 100)
        throw new Error('Initial list exceeds its rendering window');
      if (index === 150) {
        const moved = await page.evaluate(() => {
          const row = document.querySelector('[aria-current="page"]');
          const before = row.getBoundingClientRect().top;
          Array.from(
            document.querySelectorAll('.arcafeed-navigation-panel button'),
          )
            .find((button) => button.textContent === '이전 목록 더 보기')
            .click();
          return Math.abs(before - row.getBoundingClientRect().top);
        });
        if (moved > 2)
          throw new Error('Prepending rows moved the current article');
      }
      await page
        .locator('.arcafeed-navigation-panel .arcafeed-reading-close')
        .click();
    }
    await trigger.hover();
    await page.waitForTimeout(3400);
    if (!(await trigger.isVisible()))
      throw new Error('Hovered button disappeared');
    await page.mouse.move(width / 2, 10);
    await page.waitForTimeout(2500);
    if (!(await trigger.isVisible()))
      throw new Error('Button disappeared before 3 seconds');
    await page.waitForTimeout(1000);
    if (await trigger.isVisible())
      throw new Error('Button remained visible after leaving hover');
    await page.mouse.move(width / 2 + 20, 10);
    await page.waitForTimeout(100);
    if (!(await trigger.isVisible()))
      throw new Error('Button did not reappear');
    const layout = await page.evaluate(() => {
      const button = document.querySelector('.arcafeed-navigation-trigger');
      const bounds = button.getBoundingClientRect();
      return {
        left: bounds.left,
        bottom: bounds.bottom,
        background: getComputedStyle(button).backgroundColor,
        overflow: document.documentElement.scrollWidth > innerWidth,
      };
    });
    if (
      layout.left > 20 ||
      layout.bottom < 700 ||
      layout.overflow ||
      layout.background !== 'rgb(35, 45, 55)'
    )
      throw new Error(`Unexpected button layout: ${JSON.stringify(layout)}`);
    results.push({ width, centered: [0, 150, 249], hover: 'passed', layout });
  }
  return { passed: true, results };
}
