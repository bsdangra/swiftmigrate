export const RULES = [
  {
    id: "Locators- 1",
    SeleniumConstruct: 'driver.findElement(By.id("x"))',
    PlaywrightEquivalent: "page.locator('#x')",
    label: "Element identification using Id",
    severity: "low",
    test: (code) => /By\.id\s*\(/.test(code),
    suggestion: "Replace the Selenium Id with equivalent CSS Id in Playwright",
    Notes: "id -> CSS #id"
  },
  {
    id: "Locators- 2",
    SeleniumConstruct: 'driver.findElement(By.name("x"))',
    PlaywrightEquivalent: 'page.locator(\'[name="x"]\')',
    label: "Element identification using Name",
    severity: "low",
    test: (code) => /By\.name\s*\(/.test(code),
    suggestion: "Use attribute selector for name in Playwright",
    Notes: "name -> attr selector"
  },
  {
    id: "Locators- 3",
    SeleniumConstruct: 'driver.findElement(By.className("x"))',
    PlaywrightEquivalent: "page.locator('.x')",
    label: "Element identification using class name",
    severity: "low",
    test: (code) => /By\.className\s*\(/.test(code),
    suggestion: "Replace Selenium className with Playwright CSS class selector",
    Notes: "class -> CSS .class"
  },
  {
    id: "Locators- 4",
    SeleniumConstruct: 'driver.findElement(By.cssSelector("x"))',
    PlaywrightEquivalent: "page.locator('x')",
    label: "Element identification using CSS selector",
    severity: "low",
    test: (code) => /By\.cssSelector\s*\(/.test(code),
    suggestion: "Use the same CSS selector directly in Playwright",
    Notes: "CSS selector passthrough"
  },
  {
    id: "Locators- 5",
    SeleniumConstruct: 'driver.findElement(By.xpath("x"))',
    PlaywrightEquivalent: "page.locator('xpath=x')",
    label: "Element identification using XPath",
    severity: "low",
    test: (code) => /By\.xpath\s*\(/.test(code),
    suggestion: "Use the Playwright XPath locator passthrough",
    Notes: "XPath passthrough"
  },
  {
    id: "Locators- 6",
    SeleniumConstruct: 'driver.findElement(By.linkText("x"))',
    PlaywrightEquivalent: "page.getByText('x', {exact:true})",
    label: "Element identification using link text",
    severity: "low",
    test: (code) => /By\.linkText\s*\(/.test(code),
    suggestion: "Use Playwright getByText for exact visible link text",
    Notes: "Exact visible text"
  },
  {
    id: "Locators- 7",
    SeleniumConstruct: 'driver.findElement(By.partialLinkText("x"))',
    PlaywrightEquivalent: "page.getByText('x')",
    label: "Element identification using partial link text",
    severity: "low",
    test: (code) => /By\.partialLinkText\s*\(/.test(code),
    suggestion: "Use Playwright getByText for partial link text",
    Notes: "Partial text match"
  },
  {
    id: "Locators- 8",
    SeleniumConstruct: 'driver.findElement(By.tagName("x"))',
    PlaywrightEquivalent: "page.locator('x')",
    label: "Element identification using tag name",
    severity: "low",
    test: (code) => /By\.tagName\s*\(/.test(code),
    suggestion: "Use tag name selector directly in Playwright",
    Notes: "Tag name passthrough"
  },
  {
    id: "Locators- 9",
    SeleniumConstruct: 'driver.findElements(By.*)',
    PlaywrightEquivalent: "page.locator(...).all()",
    label: "Multiple element selection with By locator",
    severity: "low",
    test: (code) => /driver\.findElements\s*\(\s*By\./.test(code),
    suggestion: "Use locator(...).all() to return multiple elements in Playwright",
    Notes: "Returns array; add await"
  },
  {
    id: "Actions- 1",
    SeleniumConstruct: '.click()',
    PlaywrightEquivalent: '.click()',
    label: "Click action",
    severity: "low",
    test: (code) => /\.click\s*\(/.test(code),
    suggestion: "Use Playwright click action",
    Notes: "Direct mapping"
  },
  {
    id: "Actions- 2",
    SeleniumConstruct: '.sendKeys("x")',
    PlaywrightEquivalent: ".fill('x')",
    label: "Text input using sendKeys",
    severity: "low",
    test: (code) => /\.sendKeys\s*\(\s*"[^"]*"\s*\)/.test(code),
    suggestion: "Use fill() to send text input in Playwright",
    Notes: "Clears then fills"
  },
  {
    id: "Actions- 3",
    SeleniumConstruct: '.sendKeys(Keys.ENTER)',
    PlaywrightEquivalent: ".press('Enter')",
    label: "Keyboard Enter input via sendKeys",
    severity: "low",
    test: (code) => /\.sendKeys\s*\(\s*Keys\.ENTER\s*\)/.test(code),
    suggestion: "Use press('Enter') for enter key input",
    Notes: "Keys enum -> key string"
  },
  {
    id: "Actions- 4",
    SeleniumConstruct: '.sendKeys(Keys.TAB)',
    PlaywrightEquivalent: ".press('Tab')",
    label: "Keyboard Tab input via sendKeys",
    severity: "low",
    test: (code) => /\.sendKeys\s*\(\s*Keys\.TAB\s*\)/.test(code),
    suggestion: "Use press('Tab') for tab key input",
    Notes: "Keys enum -> key string"
  },
  {
    id: "Actions- 5",
    SeleniumConstruct: '.clear()',
    PlaywrightEquivalent: ".clear()",
    label: "Clear input action",
    severity: "low",
    test: (code) => /\.clear\s*\(/.test(code),
    suggestion: "Use clear() in Playwright to clear input",
    Notes: "Direct mapping"
  },
  {
    id: "Actions- 6",
    SeleniumConstruct: '.submit()',
    PlaywrightEquivalent: ".press('Enter')",
    label: "Form submit action",
    severity: "low",
    test: (code) => /\.submit\s*\(/.test(code),
    suggestion: "Use press('Enter') as Playwright does not have form.submit()",
    Notes: "No form.submit() in PW"
  },
  {
    id: "Actions- 7",
    SeleniumConstruct: '.getText()',
    PlaywrightEquivalent: ".textContent()",
    label: "Get element text",
    severity: "low",
    test: (code) => /\.getText\s*\(/.test(code),
    suggestion: "Use textContent() and await the promise in Playwright",
    Notes: "Returns promise; await"
  },
  {
    id: "Actions- 8",
    SeleniumConstruct: '.getAttribute("x")',
    PlaywrightEquivalent: ".getAttribute('x')",
    label: "Get element attribute",
    severity: "low",
    test: (code) => /\.getAttribute\s*\(\s*"[^"]*"\s*\)/.test(code),
    suggestion: "Use getAttribute('x') in Playwright",
    Notes: "Direct mapping"
  },
  {
    id: "Actions- 9",
    SeleniumConstruct: '.isDisplayed()',
    PlaywrightEquivalent: ".isVisible()",
    label: "Check element visibility",
    severity: "low",
    test: (code) => /\.isDisplayed\s*\(/.test(code),
    suggestion: "Use isVisible() for element display check",
    Notes: "Semantic equivalent"
  },
  {
    id: "Actions- 10",
    SeleniumConstruct: '.isEnabled()',
    PlaywrightEquivalent: ".isEnabled()",
    label: "Check element enabled state",
    severity: "low",
    test: (code) => /\.isEnabled\s*\(/.test(code),
    suggestion: "Use isEnabled() for enabled state check",
    Notes: "Direct mapping"
  },
  {
    id: "Actions- 11",
    SeleniumConstruct: '.isSelected()',
    PlaywrightEquivalent: ".isChecked()",
    label: "Check element selection state",
    severity: "low",
    test: (code) => /\.isSelected\s*\(/.test(code),
    suggestion: "Use isChecked() for checkbox or radio selection state",
    Notes: "For checkboxes/radios"
  },
  {
    id: "Navigation- 1",
    SeleniumConstruct: 'driver.get("url")',
    PlaywrightEquivalent: "await page.goto('url')",
    label: "Navigate to URL",
    severity: "low",
    test: (code) => /driver\.get\s*\(/.test(code),
    suggestion: "Use await page.goto('url') to navigate",
    Notes: "Add await"
  },
  {
    id: "Navigation- 2",
    SeleniumConstruct: 'driver.navigate().to("url")',
    PlaywrightEquivalent: "await page.goto('url')",
    label: "Navigate to URL via navigate().to",
    severity: "low",
    test: (code) => /driver\.navigate\s*\(\)\.to\s*\(/.test(code),
    suggestion: "Use await page.goto('url') as an alias for driver.get()",
    Notes: "Alias of driver.get()"
  },
  {
    id: "Navigation- 3",
    SeleniumConstruct: 'driver.navigate().back()',
    PlaywrightEquivalent: "await page.goBack()",
    label: "Navigate back",
    severity: "low",
    test: (code) => /driver\.navigate\s*\(\)\.back\s*\(/.test(code),
    suggestion: "Use await page.goBack() to navigate back",
    Notes: "Direct mapping"
  },
  {
    id: "Navigation- 4",
    SeleniumConstruct: 'driver.navigate().forward()',
    PlaywrightEquivalent: "await page.goForward()",
    label: "Navigate forward",
    severity: "low",
    test: (code) => /driver\.navigate\s*\(\)\.forward\s*\(/.test(code),
    suggestion: "Use await page.goForward() to navigate forward",
    Notes: "Direct mapping"
  },
  {
    id: "Navigation- 5",
    SeleniumConstruct: 'driver.navigate().refresh()',
    PlaywrightEquivalent: "await page.reload()",
    label: "Refresh page",
    severity: "low",
    test: (code) => /driver\.navigate\s*\(\)\.refresh\s*\(/.test(code),
    suggestion: "Use await page.reload() to refresh the page",
    Notes: "Direct mapping"
  },
  {
    id: "Navigation- 6",
    SeleniumConstruct: 'driver.getCurrentUrl()',
    PlaywrightEquivalent: "page.url()",
    label: "Get current URL",
    severity: "low",
    test: (code) => /driver\.getCurrentUrl\s*\(/.test(code),
    suggestion: "Use page.url() to get the current URL",
    Notes: "Sync in PW; no await"
  },
  {
    id: "Navigation- 7",
    SeleniumConstruct: 'driver.getTitle()',
    PlaywrightEquivalent: "await page.title()",
    label: "Get page title",
    severity: "low",
    test: (code) => /driver\.getTitle\s*\(/.test(code),
    suggestion: "Use await page.title() to get the page title",
    Notes: "Add await"
  },
  {
    id: "Waits- 1",
    SeleniumConstruct: 'WebDriverWait + ExpectedConditions',
    PlaywrightEquivalent: "REMOVE — built-in auto-wait",
    label: "Explicit wait using WebDriverWait",
    severity: "low",
    test: (code) => /WebDriverWait|ExpectedConditions/.test(code),
    suggestion: "Remove explicit WebDriverWait; Playwright auto-waits",
    Notes: "PW waits automatically"
  },
  {
    id: "Waits- 2",
    SeleniumConstruct: 'Thread.sleep(ms)',
    PlaywrightEquivalent: "REMOVE — or await page.waitForTimeout(ms)",
    label: "Hardcoded thread sleep",
    severity: "low",
    test: (code) => /Thread\.sleep\s*\(/.test(code),
    suggestion: "Remove Thread.sleep; use waitForTimeout only if essential",
    Notes: "Remove; add waitForTimeout only if essential"
  },
  {
    id: "Waits- 3",
    SeleniumConstruct: 'driver.manage().timeouts().implicitlyWait()',
    PlaywrightEquivalent: "REMOVE — use explicit locator timeout",
    label: "Implicit wait configuration",
    severity: "low",
    test: (code) => /implicitlyWait\s*\(/.test(code),
    suggestion: "Remove implicit waits; use explicit locator timeout in Playwright",
    Notes: "No implicit wait concept"
  },
  {
    id: "Waits- 4",
    SeleniumConstruct: 'fluentWait / polling wait',
    PlaywrightEquivalent: "page.waitForSelector(sel, {timeout})",
    label: "Fluent polling wait",
    severity: "low",
    test: (code) => /fluentWait|polling wait/.test(code),
    suggestion: "Use page.waitForSelector(...) instead of fluent polling wait",
    Notes: "Polling is built-in to PW"
  },
  {
    id: "Waits- 5",
    SeleniumConstruct: 'wait.until(ExpectedConditions.visibilityOf(el))',
    PlaywrightEquivalent: "await el.waitFor({state:'visible'})",
    label: "Wait until element visibility",
    severity: "low",
    test: (code) => /visibilityOf\s*\(/.test(code),
    suggestion: "Use await el.waitFor({state:'visible'}) for visibility waits",
    Notes: "Direct state mapping"
  },
  {
    id: "Waits- 6",
    SeleniumConstruct: 'wait.until(ExpectedConditions.elementToBeClickable(el))',
    PlaywrightEquivalent: "await el.waitFor({state:'visible'})",
    label: "Wait until element clickable",
    severity: "low",
    test: (code) => /elementToBeClickable\s*\(/.test(code),
    suggestion: "Use await el.waitFor({state:'visible'}) since Playwright click already waits",
    Notes: "PW click already waits"
  },
  {
    id: "Assertions- 1",
    SeleniumConstruct: 'Assert.assertEquals(actual, expected)',
    PlaywrightEquivalent: "expect(actual).toBe(expected)",
    label: "Assert equals",
    severity: "low",
    test: (code) => /Assert\.assertEquals\s*\(/.test(code),
    suggestion: "Use expect(actual).toBe(expected) in Playwright",
    Notes: "JUnit/TestNG -> PW expect"
  },
  {
    id: "Assertions- 2",
    SeleniumConstruct: 'Assert.assertTrue(condition)',
    PlaywrightEquivalent: "expect(condition).toBeTruthy()",
    label: "Assert true",
    severity: "low",
    test: (code) => /Assert\.assertTrue\s*\(/.test(code),
    suggestion: "Use expect(condition).toBeTruthy() in Playwright",
    Notes: "Direct mapping"
  },
  {
    id: "Assertions- 3",
    SeleniumConstruct: 'Assert.assertFalse(condition)',
    PlaywrightEquivalent: "expect(condition).toBeFalsy()",
    label: "Assert false",
    severity: "low",
    test: (code) => /Assert\.assertFalse\s*\(/.test(code),
    suggestion: "Use expect(condition).toBeFalsy() in Playwright",
    Notes: "Direct mapping"
  },
  {
    id: "Assertions- 4",
    SeleniumConstruct: 'Assert.assertNull(obj)',
    PlaywrightEquivalent: "expect(obj).toBeNull()",
    label: "Assert null",
    severity: "low",
    test: (code) => /Assert\.assertNull\s*\(/.test(code),
    suggestion: "Use expect(obj).toBeNull() in Playwright",
    Notes: "Direct mapping"
  },
  {
    id: "Assertions- 5",
    SeleniumConstruct: 'Assert.assertNotNull(obj)',
    PlaywrightEquivalent: "expect(obj).not.toBeNull()",
    label: "Assert not null",
    severity: "low",
    test: (code) => /Assert\.assertNotNull\s*\(/.test(code),
    suggestion: "Use expect(obj).not.toBeNull() in Playwright",
    Notes: "Direct mapping"
  },
  {
    id: "Assertions- 6",
    SeleniumConstruct: 'Assert.assertContains(str, sub)',
    PlaywrightEquivalent: "expect(str).toContain(sub)",
    label: "Assert contains",
    severity: "low",
    test: (code) => /Assert\.assertContains\s*\(/.test(code),
    suggestion: "Use expect(str).toContain(sub) in Playwright",
    Notes: "Direct mapping"
  },
  {
    id: "Assertions- 7",
    SeleniumConstruct: 'softAssert.assertAll()',
    PlaywrightEquivalent: "expect.soft() chaining",
    label: "Soft assertions finalization",
    severity: "low",
    test: (code) => /softAssert\.assertAll\s*\(/.test(code),
    suggestion: "Use expect.soft() chaining for soft assertions",
    Notes: "PW has soft assertions"
  },
  {
    id: "Browser- 1",
    SeleniumConstruct: 'driver.manage().window().maximize()',
    PlaywrightEquivalent: "await page.setViewportSize({w,h})",
    label: "Maximize browser window",
    severity: "low",
    test: (code) => /driver\.manage\(\)\.window\(\)\.maximize\s*\(/.test(code),
    suggestion: "Use page.setViewportSize({w,h}) instead of maximize",
    Notes: "No 'maximize' API; use fixed size"
  },
  {
    id: "Browser- 2",
    SeleniumConstruct: 'driver.manage().deleteAllCookies()',
    PlaywrightEquivalent: "await context.clearCookies()",
    label: "Delete all cookies",
    severity: "low",
    test: (code) => /deleteAllCookies\s*\(/.test(code),
    suggestion: "Use await context.clearCookies() to delete cookies",
    Notes: "Context-level in PW"
  },
  {
    id: "Browser- 3",
    SeleniumConstruct: 'driver.manage().getCookies()',
    PlaywrightEquivalent: "await context.cookies()",
    label: "Get cookies",
    severity: "low",
    test: (code) => /manage\(\)\.getCookies\s*\(/.test(code),
    suggestion: "Use await context.cookies() to get cookies",
    Notes: "Context-level in PW"
  },
  {
    id: "Browser- 4",
    SeleniumConstruct: 'driver.manage().addCookie(cookie)',
    PlaywrightEquivalent: "await context.addCookies([cookie])",
    label: "Add cookie",
    severity: "low",
    test: (code) => /addCookie\s*\(/.test(code),
    suggestion: "Use await context.addCookies([cookie]) to add cookies",
    Notes: "Array input in PW"
  },
  {
    id: "Browser- 5",
    SeleniumConstruct: 'driver.switchTo().frame(index)',
    PlaywrightEquivalent: "page.frameLocator('iframe').nth(index)",
    label: "Switch to frame by index",
    severity: "low",
    test: (code) => /switchTo\(\)\.frame\s*\(\s*index\s*\)/.test(code),
    suggestion: "Use page.frameLocator('iframe').nth(index) for frame selection",
    Notes: "FrameLocator API"
  },
  {
    id: "Browser- 6",
    SeleniumConstruct: 'driver.switchTo().frame(name)',
    PlaywrightEquivalent: "page.frameLocator('[name=\"x\"]')",
    label: "Switch to frame by name",
    severity: "low",
    test: (code) => /switchTo\(\)\.frame\s*\(\s*name\s*\)/.test(code),
    suggestion: "Use page.frameLocator('[name=\"x\"]') for named frames",
    Notes: "Name as attr selector"
  },
  {
    id: "Browser- 7",
    SeleniumConstruct: 'driver.switchTo().defaultContent()',
    PlaywrightEquivalent: "(no op — auto-scoped in PW)",
    label: "Switch to default content",
    severity: "low",
    test: (code) => /defaultContent\s*\(/.test(code),
    suggestion: "No-op in Playwright; scope is automatic",
    Notes: "PW scope is automatic"
  },
  {
    id: "Browser- 8",
    SeleniumConstruct: 'driver.getWindowHandles()',
    PlaywrightEquivalent: "context.pages()",
    label: "Get window handles",
    severity: "low",
    test: (code) => /getWindowHandles\s*\(/.test(code),
    suggestion: "Use context.pages() instead of window handles",
    Notes: "Pages replace windows"
  },
  {
    id: "Browser- 9",
    SeleniumConstruct: 'driver.switchTo().window(handle)',
    PlaywrightEquivalent: "const page = context.pages()[i]",
    label: "Switch browser window by handle",
    severity: "low",
    test: (code) => /switchTo\(\)\.window\s*\(/.test(code),
    suggestion: "Index into context.pages() to switch windows",
    Notes: "Index into pages array"
  },
  {
    id: "Screenshot- 1",
    SeleniumConstruct: '((TakesScreenshot)driver).getScreenshotAs()',
    PlaywrightEquivalent: "await page.screenshot({path:'x.png'})",
    label: "Capture screenshot",
    severity: "low",
    test: (code) => /getScreenshotAs\s*\(/.test(code),
    suggestion: "Use await page.screenshot({path:'x.png'}) in Playwright",
    Notes: "Built-in; simpler API"
  },
  {
    id: "JS Exec- 1",
    SeleniumConstruct: '((JavascriptExecutor)driver).executeScript("js", el)',
    PlaywrightEquivalent: "await page.evaluate(js, el)",
    label: "Execute JavaScript synchronously",
    severity: "low",
    test: (code) => /executeScript\s*\(/.test(code),
    suggestion: "Use await page.evaluate(js, el) to execute JavaScript",
    Notes: "Direct mapping"
  },
  {
    id: "JS Exec- 2",
    SeleniumConstruct: '((JavascriptExecutor)driver).executeAsyncScript()',
    PlaywrightEquivalent: "await page.evaluate(() => new Promise(...))",
    label: "Execute JavaScript asynchronously",
    severity: "low",
    test: (code) => /executeAsyncScript\s*\(/.test(code),
    suggestion: "Use await page.evaluate(() => new Promise(...)) for async JS",
    Notes: "Wrap in Promise"
  },
  {
    id: "Dropdowns- 1",
    SeleniumConstruct: 'new Select(el).selectByVisibleText("x")',
    PlaywrightEquivalent: "await el.selectOption({label:'x'})",
    label: "Select dropdown by visible text",
    severity: "low",
    test: (code) => /selectByVisibleText\s*\(/.test(code),
    suggestion: "Use await el.selectOption({label:'x'}) to select by visible text",
    Notes: "Select class removed"
  },
  {
    id: "Dropdowns- 2",
    SeleniumConstruct: 'new Select(el).selectByValue("x")',
    PlaywrightEquivalent: "await el.selectOption({value:'x'})",
    label: "Select dropdown by value",
    severity: "low",
    test: (code) => /selectByValue\s*\(/.test(code),
    suggestion: "Use await el.selectOption({value:'x'}) to select by value",
    Notes: "Direct mapping"
  },
  {
    id: "Dropdowns- 3",
    SeleniumConstruct: 'new Select(el).selectByIndex(i)',
    PlaywrightEquivalent: "await el.selectOption({index:i})",
    label: "Select dropdown by index",
    severity: "low",
    test: (code) => /selectByIndex\s*\(/.test(code),
    suggestion: "Use await el.selectOption({index:i}) to select by index",
    Notes: "Direct mapping"
  },
  {
    id: "Dropdowns- 4",
    SeleniumConstruct: 'new Select(el).getOptions()',
    PlaywrightEquivalent: "await el.locator('option').all()",
    label: "Get dropdown options",
    severity: "low",
    test: (code) => /getOptions\s*\(/.test(code),
    suggestion: "Use await el.locator('option').all() to query options",
    Notes: "Query option elements"
  },
  {
    id: "Alerts- 1",
    SeleniumConstruct: 'driver.switchTo().alert().accept()',
    PlaywrightEquivalent: "page.on('dialog', d => d.accept())",
    label: "Accept browser alert",
    severity: "low",
    test: (code) => /switchTo\(\)\.alert\(\)\.accept\s*\(/.test(code),
    suggestion: "Use page.on('dialog', d => d.accept()) to accept alerts",
    Notes: "Event-driven in PW"
  },
  {
    id: "Alerts- 2",
    SeleniumConstruct: 'driver.switchTo().alert().dismiss()',
    PlaywrightEquivalent: "page.on('dialog', d => d.dismiss())",
    label: "Dismiss browser alert",
    severity: "low",
    test: (code) => /switchTo\(\)\.alert\(\)\.dismiss\s*\(/.test(code),
    suggestion: "Use page.on('dialog', d => d.dismiss()) to dismiss alerts",
    Notes: "Event-driven in PW"
  },
  {
    id: "Alerts- 3",
    SeleniumConstruct: 'driver.switchTo().alert().getText()',
    PlaywrightEquivalent: "dialog.message() inside handler",
    label: "Read alert text",
    severity: "low",
    test: (code) => /switchTo\(\)\.alert\(\)\.getText\s*\(/.test(code),
    suggestion: "Use dialog.message() inside dialog handler to read text",
    Notes: "Via dialog event"
  },
  {
    id: "Alerts- 4",
    SeleniumConstruct: 'driver.switchTo().alert().sendKeys("x")',
    PlaywrightEquivalent: "dialog.accept('x') for prompts",
    label: "Send input to alert",
    severity: "low",
    test: (code) => /switchTo\(\)\.alert\(\)\.sendKeys\s*\(/.test(code),
    suggestion: "Use dialog.accept('x') to send prompt input",
    Notes: "Pass value to accept()"
  },
  {
    id: "Test struct- 1",
    SeleniumConstruct: '@BeforeClass / @BeforeTest',
    PlaywrightEquivalent: "test.beforeAll(() => {})",
    label: "Suite-level setup before all tests",
    severity: "low",
    test: (code) => /@BeforeClass|@BeforeTest/.test(code),
    suggestion: "Use test.beforeAll() for suite setup",
    Notes: "Suite-level setup"
  },
  {
    id: "Test struct- 2",
    SeleniumConstruct: '@BeforeMethod / @Before',
    PlaywrightEquivalent: "test.beforeEach(() => {})",
    label: "Test-level setup before each test",
    severity: "low",
    test: (code) => /@BeforeMethod|@Before\b/.test(code),
    suggestion: "Use test.beforeEach() for test-level setup",
    Notes: "Test-level setup"
  },
  {
    id: "Test struct- 3",
    SeleniumConstruct: '@AfterMethod / @After',
    PlaywrightEquivalent: "test.afterEach(() => {})",
    label: "Test-level teardown after each test",
    severity: "low",
    test: (code) => /@AfterMethod|@After\b/.test(code),
    suggestion: "Use test.afterEach() for teardown",
    Notes: "Test-level teardown"
  },
  {
    id: "Test struct- 4",
    SeleniumConstruct: '@AfterClass / @AfterTest',
    PlaywrightEquivalent: "test.afterAll(() => {})",
    label: "Suite-level teardown after all tests",
    severity: "low",
    test: (code) => /@AfterClass|@AfterTest/.test(code),
    suggestion: "Use test.afterAll() for suite teardown",
    Notes: "Suite-level teardown"
  },
  {
    id: "Test struct- 5",
    SeleniumConstruct: '@Test(description="x")',
    PlaywrightEquivalent: "test('x', async ({page}) => {})",
    label: "Define test with description",
    severity: "low",
    test: (code) => /@Test\(description\s*=/.test(code),
    suggestion: "Use test('x', async ({page}) => {}) for test definition",
    Notes: "Description -> test name"
  },
  {
    id: "Test struct- 6",
    SeleniumConstruct: '@Test(enabled=false)',
    PlaywrightEquivalent: "test.skip('x', ...)",
    label: "Disable test via annotation",
    severity: "low",
    test: (code) => /@Test\(enabled\s*=\s*false\)/.test(code),
    suggestion: "Use test.skip('x', ...) to disable tests",
    Notes: "Disabled -> skip"
  },
  {
    id: "Test struct- 7",
    SeleniumConstruct: '@DataProvider + @Test(dataProvider)',
    PlaywrightEquivalent: "for loop or test.each([...])",
    label: "Data-driven test pattern",
    severity: "low",
    test: (code) => /@DataProvider|@Test\(dataProvider\s*=/.test(code),
    suggestion: "Use for loop or test.each([...]) for data-driven tests",
    Notes: "Data-driven pattern"
  },
  {
    id: "Unsupported- 1",
    SeleniumConstruct: 'Robot Framework keywords in Selenium suite',
    PlaywrightEquivalent: "null",
    label: "Robot Framework keyword usage",
    severity: "low",
    test: (code) => /Robot Framework|robot framework/i.test(code),
    suggestion: "Flag Robot Framework keywords for manual review",
    Notes: "Custom DSL; flag only"
  },
  {
    id: "Unsupported- 2",
    SeleniumConstruct: 'Selenium Grid RemoteWebDriver config',
    PlaywrightEquivalent: "playwright.connect() — different API",
    label: "RemoteWebDriver config",
    severity: "low",
    test: (code) => /RemoteWebDriver|Grid/.test(code),
    suggestion: "Map RemoteWebDriver config to playwright.connect() with manual changes",
    Notes: "Infra config; flag for manual"
  },
  {
    id: "Unsupported- 3",
    SeleniumConstruct: 'Custom @Listener / ITestListener',
    PlaywrightEquivalent: "No direct equivalent",
    label: "Custom test listener",
    severity: "low",
    test: (code) => /@Listener|ITestListener/.test(code),
    suggestion: "Flag custom @Listener or ITestListener usage for manual porting",
    Notes: "Reporter hooks differ"
  },
  {
    id: "Unsupported- 4",
    SeleniumConstruct: 'SoftAssertions via custom wrapper class',
    PlaywrightEquivalent: "Needs manual port",
    label: "Soft assertions with custom wrapper",
    severity: "low",
    test: (code) => /SoftAssertions|soft assertion/i.test(code),
    suggestion: "Flag custom soft assertion wrapper for manual porting",
    Notes: "AI resolver attempt"
  },
  {
    id: "Unsupported- 5",
    SeleniumConstruct: 'File upload via sendKeys(filePath)',
    PlaywrightEquivalent: "await el.setInputFiles(path)",
    label: "File upload via sendKeys",
    severity: "low",
    test: (code) => /setInputFiles|sendKeys\s*\(.*filePath.*\)/.test(code),
    suggestion: "Use await el.setInputFiles(path) instead of sendKeys for uploads",
    Notes: "Actually mappable"
  },
  {
    id: "Unsupported- 6",
    SeleniumConstruct: 'Drag and drop via Actions class',
    PlaywrightEquivalent: "page.dragAndDrop(src, tgt)",
    label: "Drag and drop via Actions",
    severity: "low",
    test: (code) => /dragAndDrop|Actions.*dragAndDrop/.test(code),
    suggestion: "Use page.dragAndDrop(src, tgt) instead of Actions drag and drop",
    Notes: "Direct mapping"
  },
  {
    id: "Unsupported- 7",
    SeleniumConstruct: 'Hover via Actions.moveToElement()',
    PlaywrightEquivalent: "await el.hover()",
    label: "Hover via Actions",
    severity: "low",
    test: (code) => /moveToElement\s*\(/.test(code),
    suggestion: "Use await el.hover() instead of Actions hover",
    Notes: "Direct mapping"
  },
  {
    id: "Unsupported- 8",
    SeleniumConstruct: 'Right-click via Actions.contextClick()',
    PlaywrightEquivalent: "await el.click({button:'right'})",
    label: "Right-click via Actions",
    severity: "low",
    test: (code) => /contextClick\s*\(/.test(code),
    suggestion: "Use await el.click({button:'right'}) for right-click",
    Notes: "Option param"
  },
  {
    id: "Unsupported- 9",
    SeleniumConstruct: 'Double-click via Actions.doubleClick()',
    PlaywrightEquivalent: "await el.dblclick()",
    label: "Double-click via Actions",
    severity: "low",
    test: (code) => /doubleClick\s*\(/.test(code),
    suggestion: "Use await el.dblclick() for double-click",
    Notes: "Direct mapping"
  },
  {
    id: "Unsupported- 10",
    SeleniumConstruct: 'Multi-window OAuth popup flow',
    PlaywrightEquivalent: "context.waitForEvent('page')",
    label: "Multi-window OAuth popup flow",
    severity: "low",
    test: (code) => /OAuth|waitForEvent\('page'\)/.test(code),
    suggestion: "Use context.waitForEvent('page') for multi-window OAuth popups",
    Notes: "Complex; AI resolver"
  },
  {
    id: "Unsupported- 11",
    SeleniumConstruct: 'Custom retry logic / custom wait wrappers',
    PlaywrightEquivalent: "null — retries built into PW",
    label: "Custom retry or wait wrappers",
    severity: "low",
    test: (code) => /retry|wait wrappers/.test(code),
    suggestion: "Flag custom retry/wait wrappers for manual review",
    Notes: "Flag; manual review"
  },
  {
    id: "Unsupported- 12",
    SeleniumConstruct: 'Extent Reports / Allure annotations',
    PlaywrightEquivalent: "null — PW has own reporter",
    label: "Reporting annotation usage",
    severity: "low",
    test: (code) => /Extent Reports|Allure|annotations/.test(code),
    suggestion: "Flag report annotation usage for manual review",
    Notes: "Reporting infra; flag"
  }
];

export function preprocess(code) {
  const issues = [];
  const promptHints = [];

  RULES.forEach((rule) => {
    if (rule.test(code)) {
      issues.push({
        type: rule.id,
        message: rule.label,
        severity: rule.severity,
        suggestion: rule.suggestion
      });

      promptHints.push(rule.suggestion);
    }
  });

  const penaltyMap = {
    low: 10,
    medium: 20,
    high: 30
  };

  const score = Math.max(
    100 - issues.reduce((acc, i) => acc + penaltyMap[i.severity], 0),
    0
  );

  return {
    cleanedCode: code,
    issues,
    score,
    promptHints
  };
}