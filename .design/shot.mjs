import { chromium } from "playwright";
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1500, height: 820 } });
await p.goto("file:///Users/alexandreagostini/Documents/city-jump/.design/city-jump-settings-panel.html");
await p.waitForTimeout(8000);
await p.screenshot({ path: "/private/tmp/claude-501/-Users-alexandreagostini-Documents-city-jump/3a197386-7762-4f61-994e-c17f8c200ec2/scratchpad/hud.png" });
await b.close();
