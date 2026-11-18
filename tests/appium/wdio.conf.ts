export const config = {
  runner: 'local',
  port: 4723,
  specs: ['./**/*.spec.ts'],
  maxInstances: 1,
  capabilities: [
    {
      // Android Capability Matrix
      platformName: 'Android',
      'appium:automationName': 'UiAutomator2',
      'appium:deviceName': 'Android_Emulator',
      'appium:app': './apps/mobile/android/app/build/outputs/apk/release/app-release.apk',
      'appium:appPackage': 'com.letstrackit.app',
      'appium:appActivity': '.MainActivity',
      'appium:noReset': false,
      'appium:fullReset': false,
      'appium:newCommandTimeout': 240
    },
    {
      // iOS Capability Matrix
      platformName: 'iOS',
      'appium:automationName': 'XCUITest',
      'appium:deviceName': 'iPhone 15 Pro',
      'appium:platformVersion': '17.4',
      'appium:app': './apps/mobile/ios/build/LetsTrackIt.app',
      'appium:bundleId': 'com.letstrackit.app',
      'appium:noReset': false,
      'appium:newCommandTimeout': 240
    }
  ],
  logLevel: 'info',
  framework: 'mocha',
  reporters: ['spec'],
  mochaOpts: {
    ui: 'bdd',
    timeout: 60000
  }
};
