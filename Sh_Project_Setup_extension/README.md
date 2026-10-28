# Plementus Project Setup

## Load locally

1. Open `chrome://extensions` in Chrome.
2. Enable **Developer mode**.
3. Select **Load unpacked** and choose this `Sh_Project_Setup_extension` directory.
4. Open the Plementus Project Setup popup from the Chrome toolbar.

## Verify

The popup should show the **Set Up New Customer** wizard with local input validation and a redacted review. Navigation and module selection remain disabled; setup automation is not implemented. In `chrome://extensions`, open the extension's service-worker inspection link and confirm there are no errors. The manifest currently requests no permissions or host access.

Use an isolated local profile for testing. No account, provider site, or customer data is required.
