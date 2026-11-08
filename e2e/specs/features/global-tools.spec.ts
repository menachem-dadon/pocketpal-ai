import * as fs from 'fs';
import * as path from 'path';
import {expect} from '@wdio/globals';
import {ChatPage} from '../../pages/ChatPage';
import {byTestId, byText, Selectors} from '../../helpers/selectors';
import {
  downloadAndLoadModel,
  waitForAiMessage,
  waitForInferenceComplete,
} from '../../helpers/model-actions';
import {QUICK_TEST_MODEL} from '../../fixtures/models';
import {SCREENSHOT_DIR} from '../../wdio.shared.conf';

declare const browser: WebdriverIO.Browser;

const APP = 'com.menachem.pocketpal.tools';
const DEFAULTS: Record<string, boolean> = {
  render_html: false,
  calculate: false,
  datetime: true,
  web_search: true,
  read_url: true,
};

const screenshot = async (name: string) => {
  fs.mkdirSync(SCREENSHOT_DIR, {recursive: true});
  await browser.saveScreenshot(path.join(SCREENSHOT_DIR, `${name}.png`));
};

const openTools = async () => {
  await new ChatPage().openDrawer();
  const tools = browser.$(Selectors.drawer.toolsTab);
  await tools.waitForDisplayed({timeout: 30000});
  await tools.click();
  await browser.$(byTestId('tools-screen')).waitForDisplayed({timeout: 30000});
};

const toolSwitch = async (name: string) => {
  const id = `tool-switch-${name}`;
  let element = browser.$(byTestId(id));
  if (!(await element.isDisplayed().catch(() => false))) {
    await browser.$(
      `android=new UiScrollable(new UiSelector().scrollable(true)).setMaxSearchSwipes(8).scrollIntoView(new UiSelector().resourceIdMatches(".*${id}"))`,
    );
    element = browser.$(byTestId(id));
  }
  await element.waitForDisplayed({timeout: 15000});
  return element;
};

const setTools = async (settings: Record<string, boolean>) => {
  for (const [name, enabled] of Object.entries(settings)) {
    const element = await toolSwitch(name);
    if ((await element.getAttribute('checked')) !== String(enabled)) {
      await element.click();
    }
    await expect(element).toHaveAttribute('checked', String(enabled));
  }
  // Allow the persisted storage write to finish before killing the process.
  await browser.pause(1000);
};

const assertTools = async (settings: Record<string, boolean>) => {
  for (const [name, enabled] of Object.entries(settings)) {
    await expect(await toolSwitch(name)).toHaveAttribute(
      'checked',
      String(enabled),
    );
  }
};

const restart = async () => {
  await browser.terminateApp(APP);
  await browser.activateApp(APP);
  await browser.$('~Open drawer').waitForDisplayed({timeout: 120000});
};

describe('Tools edition on the production APK', function () {
  this.timeout(1200000);

  afterEach(async function () {
    await screenshot(
      this.currentTest?.state === 'failed' ? 'failure' : 'complete',
    );
    fs.writeFileSync(
      path.join(SCREENSHOT_DIR, 'last-ui.xml'),
      await browser.getPageSource(),
    );
  });

  it('persists global choices, selects only models, runs local inference, and coexists with upstream', async () => {
    await browser.$('~Open drawer').waitForDisplayed({timeout: 120000});
    await openTools();
    await assertTools(DEFAULTS);
    await screenshot('tools-defaults-bottom');
    await toolSwitch('render_html');
    await screenshot('tools-defaults-top');

    const custom = {...DEFAULTS, calculate: true, web_search: false};
    await setTools(custom);
    await restart();
    await openTools();
    await assertTools(custom);
    await screenshot('tools-persisted');

    const off = Object.fromEntries(
      Object.keys(DEFAULTS).map(name => [name, false]),
    );
    await setTools(off);
    await restart();
    await openTools();
    await assertTools(off);
    await screenshot('tools-all-off-persisted');

    await new ChatPage().openDrawer();
    await browser.$(Selectors.drawer.chatTab).click();
    await downloadAndLoadModel(QUICK_TEST_MODEL);
    const chat = new ChatPage();
    await chat.resetChat();
    await chat.sendMessage('Hi');
    await waitForAiMessage(180000);
    await waitForInferenceComplete(180000);
    await screenshot('native-local-inference');

    await browser.$('~Select model').click();
    await browser.$(byText('Models')).waitForDisplayed({timeout: 15000});
    await expect(browser.$(byText('Pals'))).not.toExist();
    await expect(
      browser.$(byTestId('chat-pal-model-picker-tab-pals')),
    ).not.toExist();
    await screenshot('model-picker');
    await browser.back();

    await openTools();
    await setTools(DEFAULTS);
    await toolSwitch('render_html');
    await screenshot('tools-restored-defaults');

    await expect(await browser.isAppInstalled('com.pocketpalai')).toBe(true);
    await browser.activateApp('com.pocketpalai');
    await browser.waitUntil(
      async () => (await browser.getCurrentPackage()) === 'com.pocketpalai',
      {timeout: 30000},
    );
    await screenshot('upstream-installed');
    await browser.activateApp(APP);
    await browser.waitUntil(
      async () => (await browser.getCurrentPackage()) === APP,
      {timeout: 30000},
    );
  });
});
