import axios from "axios";
import fs from "fs/promises";
import path from "path";
import puppeteer from "puppeteer";

const profiles = [
  { name: "leetcode_Rudra0", url: "https://leetcode.com/u/Rudra0/", protected: true },
  { name: "hackerrank_Rudra02", url: "https://www.hackerrank.com/profile/Rudra02" },
  { name: "codechef_rudra0200", url: "https://www.codechef.com/users/rudra0200" },
  { name: "codeforces_krkushwant", url: "https://codeforces.com/profile/krkushwant", protected: true },
  { name: "gfg_rudra02", url: "https://www.geeksforgeeks.org/profile/rudra02" },
  { name: "github_mdecoder24", url: "https://github.com/mdecoder24" },
  { name: "hackerearth_piyushgandhi811", url: "https://www.hackerearth.com/@piyushgandhi811/" },
  { name: "atcoder_junaid12", url: "https://atcoder.jp/users/junaid12" },
  { name: "code360_junaidahmed", url: "https://www.naukri.com/code360/profile/junaidahmed" }
];

// Axios with browser-like headers
const axiosInstance = axios.create({
  headers: {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
    "Accept-Language": "en-US,en;q=0.9",
    "Accept": "text/html,application/xhtml+xml"
  },
  timeout: 15000
});

// Utility: ensure folder exists
async function ensureFolder() {
  const folder = path.join(process.cwd(), "profile_snapshots");
  try {
    await fs.mkdir(folder);
  } catch (_) {}
}

// 🔥 Puppeteer fallback for protected sites
async function fetchUsingPuppeteer(name: string, url: string) {
  console.log(`🟡 Using Puppeteer for ${name}: ${url}`);

  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  await page.goto(url, { waitUntil: "networkidle2" });

  const html = await page.content();
  await fs.writeFile(`profile_snapshots/${name}.html`, html);

  await browser.close();

  console.log(`✅ Saved ${name}.html (Puppeteer)`);
}

// Normal fetch using axios
async function fetchUsingAxios(name: string, url: string) {
  try {
    console.log(`➡️  Fetching ${name} from ${url}`);

    const response = await axiosInstance.get(url);
    await fs.writeFile(`profile_snapshots/${name}.html`, response.data);

    console.log(`✅ Saved ${name}.html`);
  } catch (err: any) {
    console.log(`❌ Axios failed for ${name}: ${err.response?.status}`);

    throw new Error("Axios failed");
  }
}

// Entry function
async function start() {
  await ensureFolder();

  for (const profile of profiles) {
    const { name, url, protected: isProtected } = profile;

    // If site is protected → directly use puppeteer
    if (isProtected) {
      await fetchUsingPuppeteer(name, url);
      continue;
    }

    // Try axios first
    try {
      await fetchUsingAxios(name, url);
    } catch (_) {
      console.log(`⚠️ Retrying with Puppeteer for ${name}...`);
      await fetchUsingPuppeteer(name, url);
    }
  }

  console.log("🎉 Done. Check the 'profile_snapshots' folder.");
}

start();
