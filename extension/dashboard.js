// Dashboard - PLACEHOLDER (NOT FUNCTIONAL)
// This dashboard is designed for Pro tier telemetry
// Currently non-functional because background.js doesn't log telemetry events yet

// TODO: Remove all fake RAM calculations
// - Line 162: ramSaved += 250 is FAKE
// - Line 82: "RAM Freed" should be "Tabs Discarded"
// - Background script needs to actually log events before this can work

document.addEventListener('DOMContentLoaded', () => {
    document.body.innerHTML = `
        <div style="padding: 40px; text-align: center; color: #fff; background: #050508;">
            <h1>📊 Dashboard (Pro Feature)</h1>
            <p style="color: #888; margin-top: 20px;">
                Historical analytics dashboard is not yet functional.<br>
                Will be enabled in a future update after telemetry logging is implemented.
            </p>
            <p style="color: #00d9ff; margin-top: 40px; font-size: 14px;">
                Current status: PLACEHOLDER - No fake data shown
            </p>
        </div>
    `;
});
