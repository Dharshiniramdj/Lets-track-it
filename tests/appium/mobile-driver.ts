export interface AppiumElement {
  testID: string;
  accessibilityLabel?: string;
  value?: string;
  text?: string;
  isDisplayed: boolean;
  isEnabled: boolean;
}

export class AppiumMobileDriver {
  public platform: 'Android' | 'iOS';
  public elements = new Map<string, AppiumElement>();
  public networkConnected: boolean = true;

  constructor(platform: 'Android' | 'iOS' = 'Android') {
    this.platform = platform;
  }

  public register(testID: string, el: Partial<AppiumElement>): void {
    this.elements.set(testID, {
      testID,
      accessibilityLabel: el.accessibilityLabel,
      value: el.value || '',
      text: el.text || '',
      isDisplayed: el.isDisplayed !== false,
      isEnabled: el.isEnabled !== false
    });
  }

  public async $(selector: string): Promise<AppiumElement> {
    const testID = selector.replace('~', '').replace('#', '');
    const el = this.elements.get(testID);
    if (!el) throw new Error(`NoSuchElementError: Native element with testID="${testID}" not found`);
    return el;
  }

  public async setValue(selector: string, value: string): Promise<void> {
    const el = await this.$(selector);
    el.value = value;
  }

  public async click(selector: string): Promise<void> {
    const el = await this.$(selector);
    if (!el.isDisplayed) throw new Error(`ElementNotInteractable: testID="${el.testID}" is not displayed`);
  }

  public setAirplaneMode(enabled: boolean): void {
    this.networkConnected = !enabled;
  }
}
