const { chromium } = require('playwright');
const config = require('./config');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;

class CombinedGoogleMapsScraper {
  constructor(options = {}) {
    this.options = {
      stealthLevel: 'optimized', // 'optimized' or 'high-stealth'
      batchSize: 3,
      proxy: null, // Proxy configuration
      ...options
    };
    this.browser = null;
    this.context = null;
    this.page = null;
  }

  formatPhoneNumber(phoneNumber) {
    if (!phoneNumber || phoneNumber.trim() === '') {
      return '';
    }
    
    // Remove all non-digit characters
    const digits = phoneNumber.replace(/\D/g, '');
    
    // Handle different phone number formats
    if (digits.length === 10) {
      // US 10-digit number (e.g., 808 969-3899)
      return `+1${digits}`;
    } else if (digits.length === 11 && digits.startsWith('1')) {
      // US 11-digit number starting with 1 (e.g., 1 808 969-3899)
      return `+${digits}`;
    } else if (digits.length === 11 && !digits.startsWith('1')) {
      // International 11-digit number (e.g., 44 20 7946 0958)
      return `+${digits}`;
    } else if (digits.length > 11) {
      // Longer international number
      return `+${digits}`;
    } else if (digits.length === 7) {
      // Local 7-digit number (assume US)
      return `+1${digits}`;
    } else {
      // If we can't determine format, return as is with + prefix if it doesn't have one
      return phoneNumber.startsWith('+') ? phoneNumber : `+${digits}`;
    }
  }

  // Format phone number for CSV export (adds single quote to prevent Excel formula interpretation)
  formatPhoneNumberForCSV(phoneNumber) {
    const formattedPhone = this.formatPhoneNumber(phoneNumber);
    if (!formattedPhone) return '';
    
    // Add single quote prefix to prevent CSV parsing issues with + symbol
    return `'${formattedPhone}`;
  }

  async init() {
    // Always use headless mode for production
    const headless = true;
    
    // Choose browser based on config or random selection
    const browsers = ['chromium', 'firefox'];
    const selectedBrowser = this.options.browser || browsers[Math.floor(Math.random() * browsers.length)];
    
    // Prepare launch options with proxy support
    const launchOptions = {
      headless: headless,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage'
      ]
    };
    
    // Add proxy configuration if provided
    if (this.options.proxy) {
      if (typeof this.options.proxy === 'string') {
        // Single proxy string
        launchOptions.proxy = {
          server: this.options.proxy
        };
      } else if (this.options.proxy.proxy) {
        // Proxy object with additional options
        launchOptions.proxy = {
          server: this.options.proxy.proxy,
          username: this.options.proxy.username,
          password: this.options.proxy.password
        };
      }
    }
    
    if (selectedBrowser === 'firefox') {
      const { firefox } = require('playwright');
      this.browser = await firefox.launch(launchOptions);
    } else {
      // Add Chrome-specific args for better stealth
      launchOptions.args.push(
        '--disable-blink-features=AutomationControlled',
        '--disable-features=VizDisplayCompositor'
      );
      this.browser = await chromium.launch(launchOptions);
    }
    
    // Use optimized context setup by default
    if (this.options.stealthLevel === 'high-stealth') {
      await this.initHighStealthContext();
    } else {
      await this.initOptimizedContext();
    }
  }

  async initOptimizedContext() {
    // Optimized context - faster with basic stealth
    this.context = await this.browser.newContext({
      userAgent: this.getRandomUserAgent(),
      viewport: { width: 1366, height: 768 },
      locale: 'en-US',
      timezoneId: 'America/New_York'
    });
    this.page = await this.context.newPage();
    
    // Basic stealth: Remove webdriver
    await this.page.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
      delete navigator.__proto__.webdriver;
    });
  }

  async initHighStealthContext() {
    // High stealth context - slower but more anti-detection
    this.context = await this.browser.newContext({
      userAgent: this.getRandomUserAgent(),
      viewport: this.getRandomViewport(),
      locale: this.getRandomLocale(),
      timezoneId: this.getRandomTimezone(),
      bypassCSP: true
    });
    this.page = await this.context.newPage();
    
    // Enhanced stealth: Remove webdriver and add more anti-detection
    await this.page.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
      delete navigator.__proto__.webdriver;
      
      // Additional stealth measures
      Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
      Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
      Object.defineProperty(navigator, 'permissions', { get: () => ({ query: () => Promise.resolve({ state: 'granted' }) }) });
    });

    // Enable network interception for high stealth mode
    await this.page.route('**/*', (route) => {
      const resourceType = route.request().resourceType();
      // Block unnecessary resources for faster scraping
      if (['image', 'stylesheet', 'font', 'media'].includes(resourceType)) {
        route.abort();
      } else {
        route.continue();
      }
    });
  }

  getRandomUserAgent() {
    const userAgents = [
      // Chrome User Agents
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
      
      // Firefox User Agents
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:109.0) Gecko/20100101 Firefox/121.0',
      'Mozilla/5.0 (X11; Linux x86_64; rv:109.0) Gecko/20100101 Firefox/121.0',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:120.0) Gecko/20100101 Firefox/120.0',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:120.0) Gecko/20100101 Firefox/120.0'
    ];
    
    return userAgents[Math.floor(Math.random() * userAgents.length)];
  }

  getRandomViewport() {
    const viewports = [
      { width: 1366, height: 768 },
      { width: 1920, height: 1080 },
      { width: 1440, height: 900 },
      { width: 1536, height: 864 },
      { width: 1280, height: 720 }
    ];
    return viewports[Math.floor(Math.random() * viewports.length)];
  }

  getRandomLocale() {
    const locales = ['en-US', 'en-GB', 'en-CA', 'en-AU'];
    return locales[Math.floor(Math.random() * locales.length)];
  }

  getRandomTimezone() {
    const timezones = [
      'America/New_York',
      'America/Los_Angeles',
      'America/Chicago',
      'America/Denver',
      'Europe/London',
      'Europe/Paris',
      'Asia/Tokyo',
      'Australia/Sydney'
    ];
    return timezones[Math.floor(Math.random() * timezones.length)];
  }

  async scrapeUrls(searchTerm, location, maxResults = 9999, progressCb = () => {}) {
    console.log(`[Scraper] Starting URL scrape for: ${searchTerm} in ${location}`);
    
    // Build Google Maps search URL
    const mapsUrl = `https://www.google.com/maps/search/${encodeURIComponent(searchTerm)}+${encodeURIComponent(location)}`;
    await this.page.goto(mapsUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await this.page.waitForTimeout(2000 + Math.random() * 2000);
    await this.page.waitForSelector('div[role="feed"], div[aria-label*="Results for"]', { timeout: 20000 });
    // Wait for the main results list to load
    await this.page.waitForSelector('.XltNde.tTVLSc', { timeout: 20000 });

    // Find the scrollable container
    const allFeeds = await this.page.$$('div[role="feed"]');
    console.log('Number of div[role="feed"] found:', allFeeds.length);
    if (allFeeds.length > 0) {
      const classNames = await Promise.all(allFeeds.map(el => el.getAttribute('class')));
      console.log('Classes of feed divs:', classNames);
    }
    const scrollable = await this.page.$('div[role="feed"]');
    if (!scrollable) {
      console.log('Scrollable element not found.');
      return [];
    }

    // Find business cards
    let cards = await this.page.$$('a.hfpxzc');
    let scrollTries = 0;
    let endOfList = false;
    let lastCardCount = cards.length;
    let lastNewCardTime = Date.now();
    console.time('Scroll to end of list');
    while (!endOfList && scrollTries < 50) {
      await scrollable.evaluate(node => { node.scrollBy(0, 1500); });
      await this.page.waitForTimeout(1000);
      cards = await this.page.$$('a.hfpxzc');
      if (cards.length > lastCardCount) {
        lastCardCount = cards.length;
        lastNewCardTime = Date.now();
      }
      if (Date.now() - lastNewCardTime > 10000) {
        console.log('No new cards loaded for 10 seconds, finishing scroll.');
        break;
      }
      endOfList = await this.page.evaluate(() => document.body.innerText.includes("You've reached the end of the list."));
      scrollTries++;
    }
    console.timeEnd('Scroll to end of list');
    if (endOfList) {
      console.log("We're at the end of the list");
      // Scrape the entire page for urls that start with https://www.google.com/maps/place/
      const placeUrls = await this.page.$$eval('a', links => links.map(link => link.href).filter(href => href.startsWith('https://www.google.com/maps/place/')));
      console.log(`Found ${placeUrls.length} urls that start with https://www.google.com/maps/place/`);
    }
    console.log(`[Scraper] Found ${cards.length} business cards.`);
    cards = cards.slice(0, maxResults);

    // Extract URLs from each card
    const urls = [];
    for (let i = 0; i < cards.length; i++) {
      try {
        // Check if this card is sponsored
        const isSponsored = await cards[i].evaluate(card => {
          let el = card;
          for (let j = 0; j < 3; j++) {
            if (!el) break;
            if (el.innerText && el.innerText.includes('Sponsored')) return true;
            el = el.parentElement;
          }
          if (card.parentElement) {
            const sponsored = card.parentElement.querySelector('span, h1');
            if (sponsored && sponsored.innerText && sponsored.innerText.includes('Sponsored')) return true;
          }
          return false;
        });
        if (isSponsored) {
          console.log(`[Scraper] Skipping sponsored card ${i + 1}`);
          continue;
        }
        const url = await cards[i].getAttribute('href');
        urls.push(url);
        progressCb(Math.round(((i + 1) / cards.length) * 100), [...urls]);
        console.log(`[Scraper] Found business url: ${url}`);
      } catch (err) {
        console.error(`[Scraper] Error extracting card ${i + 1}:`, err.message);
        continue;
      }
    }
    console.log(`[Scraper] URL scraping complete. Total URLs found: ${urls.length}`);
    return urls;
  }

  async extractBusinessDetails(url, page) {
    try {
      console.log(`[Extractor] Opening URL: ${url}`);
      await page.goto(url, { timeout: 60000 });
      await page.waitForSelector('[role="main"]', { timeout: 10000 });
      await page.waitForTimeout(500);

      // Helper functions for extraction
      const getByXPath = async (xpath) => {
        const el = await page.$(`xpath=${xpath}`);
        if (!el) return '';
        return (await el.textContent()).trim();
      };

      const getBySelector = async (selector) => {
        const el = await page.$(selector);
        if (!el) return '';
        return (await el.textContent()).trim();
      };

      // Extract all business details
      const businessName = await getByXPath('/html/body/div[1]/div[3]/div[8]/div[9]/div/div/div[1]/div[2]/div/div[1]/div/div/div[2]/div/div[1]/div[1]/h1');
      const companyType = await getByXPath('/html/body/div[1]/div[3]/div[8]/div[9]/div/div/div[1]/div[2]/div/div[1]/div/div/div[2]/div/div[1]/div[2]/div/div[2]/span/span/button');
      let rating = await getByXPath('/html/body/div[1]/div[3]/div[8]/div[9]/div/div/div[1]/div[2]/div/div[1]/div/div/div[2]/div/div[1]/div[2]/div/div[1]/div[2]/span[1]/span[1]');
      // Clean rating: remove quotation marks
      rating = rating.replace(/[""]/g, '');
      let reviews = await getByXPath('/html/body/div[1]/div[3]/div[8]/div[9]/div/div/div[1]/div[2]/div/div[1]/div/div/div[2]/div/div[1]/div[2]/div/div[1]/div[2]/span[2]/span/span');
      reviews = reviews
        .replace(/[()]/g, '') // Remove parentheses
        .replace(/["""'']/g, '') // Remove quotes
        .replace(/,/g, '') // Remove commas
        .replace(/[^\d]/g, '') // Remove all non-digit characters
        .trim();
      // Extract address - get text content
      let address = await page.evaluate(() => {
        const addressBtn = document.querySelector('button[data-tooltip="Copy address"]');
        if (!addressBtn) return '';
        return addressBtn.textContent.trim();
      });
      // Clean address: remove all types of quotation marks, special characters, and trailing commas
      address = address
        .replace(/["""'']/g, '') // Remove all types of quotes
        .replace(/[\u200B\u200C\u200D\uFEFF\u200E\u200F]/g, '') // Remove zero-width characters
        .replace(/[\uE000-\uF8FF]/g, '') // Remove Unicode private use area characters (Google Maps icons)
        .replace(/,\s*$/, '') // Remove trailing comma
        .replace(/^\s*,\s*/, '') // Remove leading comma
        .replace(/NO GLYPH/g, '') // Remove NO GLYPH placeholders
        .trim();
      
      // Website: try Open website first, then Open menu link
      let website = await page.$eval('a[data-tooltip="Open website"]', el => el.href).catch(() => '');
      if (!website) {
        website = await page.$eval('a[data-tooltip="Open menu link"]', el => el.href).catch(() => '');
      }
      
      // Extract phone number - get text content
      let phoneNumber = await page.evaluate(() => {
        const phoneBtn = document.querySelector('button[data-tooltip="Copy phone number"]');
        if (!phoneBtn) return '';
        return phoneBtn.textContent.trim();
      });
      phoneNumber = phoneNumber
        .replace(/[()]/g, '') // Remove parentheses
        .replace(/[\u200B\u200C\u200D\uFEFF\u200E\u200F]/g, '') // Remove zero-width characters
        .replace(/[\uE000-\uF8FF]/g, '') // Remove Unicode private use area characters (Google Maps icons)
        .replace(/NO GLYPH/g, '') // Remove NO GLYPH placeholders
        .trim();
      
      // Format phone number to international format
      phoneNumber = this.formatPhoneNumber(phoneNumber);

      return {
        'Business Name': businessName,
        'Company Type': companyType,
        'Rating': rating,
        'Reviews': reviews,
        'Address': address,
        'Phone Number': phoneNumber,
        'Website': website,
        'URL': url
      };
    } catch (err) {
      console.error(`[Extractor] Error extracting details from ${url}:`, err.message);
      return {
        'Business Name': '',
        'Company Type': '',
        'Rating': '',
        'Reviews': '',
        'Address': '',
        'Phone Number': '',
        'Website': '',
        'Email': '',
        'Instagram': '',
        'LinkedIn': '',
        'Facebook': '',
        'URL': url
      };
    }
  }

  async scrapeWebsiteForContactInfo(websiteUrl, page) {
    try {
      if (!websiteUrl || websiteUrl === '') {
        return { email: '', instagram: '', linkedin: '', facebook: '' };
      }

      console.log(`[Website Scraper] Scraping website: ${websiteUrl}`);
      // Helper to extract emails/socials from the current page
      const extractFromCurrentPage = async () => {
        // Extract email addresses from text and mailto links
        const emails = await page.evaluate(() => {
          const allEmails = new Set();
          
          // 1. Extract emails from page text using regex
          const emailRegex = /\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b/g;
          const pageText = document.body.innerText;
          const emailMatches = pageText.match(emailRegex) || [];
          
          // Filter out false positives (phone numbers, etc.)
          const validEmails = emailMatches.filter(email => {
            const emailPart = email.split('@')[0];
            if (/^[0-9\-\(\)\s]+$/.test(emailPart)) return false;
            if (emailPart.length < 2) return false;
            if (/^[0-9\.]+$/.test(emailPart)) return false;
            if (/^[0-9\-\(\)\s]{3,}[a-zA-Z]/.test(emailPart)) return false;
            if (/[0-9]{3,4}[-\(\)\s]?[0-9]{3,4}/.test(emailPart)) return false;
            const numbers = (emailPart.match(/[0-9]/g) || []).length;
            const letters = (emailPart.match(/[a-zA-Z]/g) || []).length;
            if (numbers > letters && numbers > 3) return false;
            return true;
          });
          
          // Add valid emails from text
          validEmails.forEach(email => allEmails.add(email.toLowerCase()));
          
          // 2. Extract emails from mailto links
          const mailtoLinks = Array.from(document.querySelectorAll('a[href^="mailto:"]'));
          mailtoLinks.forEach(link => {
            const href = link.href;
            const mailtoMatch = href.match(/^mailto:([^?]+)/);
            if (mailtoMatch) {
              const email = mailtoMatch[1].trim();
              // Validate the email from mailto link
              if (emailRegex.test(email)) {
                allEmails.add(email.toLowerCase());
              }
            }
          });
          
          return Array.from(allEmails);
        });
        // Extract social media links
        const socialLinks = await page.evaluate(() => {
          const links = Array.from(document.querySelectorAll('a[href]'));
          const socialMedia = { instagram: '', linkedin: '', facebook: '' };
          links.forEach(link => {
            const href = link.href.toLowerCase();
            if (href.includes('instagram.com') && !socialMedia.instagram) {
              if (href.match(/instagram\.com\/[a-zA-Z0-9._]{3,30}/) && !href.includes('instagram.com/wix')) {
                // Additional check: ensure the URL doesn't contain 'wix' anywhere in the path
                const urlPath = href.split('instagram.com/')[1];
                if (urlPath && !urlPath.includes('wix')) {
                  socialMedia.instagram = link.href;
                }
              }
            }
            if (href.includes('linkedin.com') && !socialMedia.linkedin) {
              socialMedia.linkedin = link.href;
            }
            if (href.includes('facebook.com') && !socialMedia.facebook) {
              if (!href.includes('developers.facebook.com') && 
                  !href.includes('facebook.com/developers') &&
                  !href.includes('facebook.com/docs') &&
                  !href.includes('facebook.com/help') &&
                  !href.includes('facebook.com/support') &&
                  !href.includes('facebook.com/business') &&
                  !href.includes('facebook.com/legal') &&
                  !href.includes('facebook.com/policy') &&
                  !href.includes('facebook.com/terms') &&
                  !href.includes('facebook.com/privacy') &&
                  !href.includes('facebook.com/wix') &&
                  !href.match(/^https?:\/\/[^\/]*facebook\.com\/?$/) &&
                  !href.match(/^https?:\/\/[^\/]*facebook\.com\/[a-zA-Z0-9._-]{1,2}$/)) {
                socialMedia.facebook = link.href;
              }
            }
          });
          return socialMedia;
        });
        // Also check for social media in text content
        const textSocialLinks = await page.evaluate(() => {
          const pageText = document.body.innerText;
          const socialMedia = { instagram: '', linkedin: '', facebook: '' };
          const instagramPatterns = [
            /instagram\.com\/[a-zA-Z0-9._]+/g,
            /@[a-zA-Z0-9._]{3,30}/g
          ];
          const linkedinPatterns = [ /linkedin\.com\/[a-zA-Z0-9._-]+/g ];
          const facebookPatterns = [ /facebook\.com\/[a-zA-Z0-9._-]+/g ];
          instagramPatterns.forEach(pattern => {
            const matches = pageText.match(pattern);
            if (matches && matches.length > 0 && !socialMedia.instagram) {
              // Check all matches to find the first valid one (not wix)
              for (const match of matches) {
                if (match.includes('instagram.com/') && !match.includes('instagram.com/wix')) {
                  // Additional check: ensure the URL doesn't contain 'wix' anywhere in the path
                  const urlPath = match.split('instagram.com/')[1];
                  if (urlPath && !urlPath.includes('wix')) {
                    socialMedia.instagram = match;
                    break; // Found a valid Instagram URL
                  }
                } else if (match.startsWith('@')) {
                  const username = match.substring(1);
                  if (!username.includes('@') && !username.includes('.com') && !username.includes('.org') && !username.includes('.net')) {
                    socialMedia.instagram = 'https://instagram.com/' + username;
                    break; // Found a valid Instagram username
                  }
                }
              }
            }
          });
          linkedinPatterns.forEach(pattern => {
            const matches = pageText.match(pattern);
            if (matches && matches.length > 0 && !socialMedia.linkedin) {
              socialMedia.linkedin = matches[0];
            }
          });
          facebookPatterns.forEach(pattern => {
            const matches = pageText.match(pattern);
            if (matches && matches.length > 0 && !socialMedia.facebook) {
              const match = matches[0];
              if (!match.includes('developers.facebook.com') && 
                  !match.includes('facebook.com/developers') &&
                  !match.includes('facebook.com/docs') &&
                  !match.includes('facebook.com/help') &&
                  !match.includes('facebook.com/support') &&
                  !match.includes('facebook.com/business') &&
                  !match.includes('facebook.com/legal') &&
                  !match.includes('facebook.com/policy') &&
                  !match.includes('facebook.com/terms') &&
                  !match.includes('facebook.com/privacy') &&
                  !match.includes('facebook.com/wix') &&
                  !match.match(/^https?:\/\/[^\/]*facebook\.com\/?$/) &&
                  !match.match(/^https?:\/\/[^\/]*facebook\.com\/[a-zA-Z0-9._-]{1,2}$/)) {
                socialMedia.facebook = match;
              }
            }
          });
          return socialMedia;
        });
        const finalSocialLinks = {
          instagram: socialLinks.instagram || textSocialLinks.instagram,
          linkedin: socialLinks.linkedin || textSocialLinks.linkedin,
          facebook: socialLinks.facebook || textSocialLinks.facebook
        };
        Object.keys(finalSocialLinks).forEach(platform => {
          if (finalSocialLinks[platform]) {
            if (!finalSocialLinks[platform].startsWith('http')) {
              finalSocialLinks[platform] = 'https://' + finalSocialLinks[platform];
            }
          }
        });
        return {
          email: emails.length > 0 ? emails.map(email => email.toLowerCase()).join(', ') : '',
          instagram: finalSocialLinks.instagram,
          linkedin: finalSocialLinks.linkedin,
          facebook: finalSocialLinks.facebook
        };
      };

      // 1. Scrape homepage
      await page.goto(websiteUrl, { timeout: 30000, waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(2000);
      let result = await extractFromCurrentPage();
      console.log(`[Website Scraper] Found: Email=${result.email ? `Yes` : 'No'}, Instagram=${result.instagram ? 'Yes' : 'No'}, LinkedIn=${result.linkedin ? 'Yes' : 'No'}, Facebook=${result.facebook ? 'Yes' : 'No'}`);

      // 2. If no email found, try to find and scrape the Contact page
      if (!result.email) {
        // Try to find a Contact page link
        const contactHref = await page.evaluate(() => {
          const candidates = Array.from(document.querySelectorAll('a[href]'));
          // Look for links with text or href containing 'contact'
          let contactLink = candidates.find(link => {
            const href = link.href;
            const text = link.innerText.trim().toLowerCase();
            // Skip mailto links and other non-http links
            return !href.startsWith('mailto:') && 
                   !href.startsWith('tel:') && 
                   !href.startsWith('javascript:') &&
                   (text.includes('contact') || href.toLowerCase().includes('contact'));
          });
          return contactLink ? contactLink.href : '';
        });
        if (contactHref && contactHref !== websiteUrl && !contactHref.startsWith('mailto:')) {
          try {
            console.log(`[Website Scraper] No email on homepage, checking Contact page: ${contactHref}`);
            await page.goto(contactHref, { timeout: 20000, waitUntil: 'domcontentloaded' });
            await page.waitForTimeout(2000);
            const contactResult = await extractFromCurrentPage();
            // If we found an email or socials on the contact page, use them
            if (contactResult.email || contactResult.instagram || contactResult.linkedin || contactResult.facebook) {
              result = contactResult;
              console.log(`[Website Scraper] Found contact info on Contact page.`);
            } else {
              console.log(`[Website Scraper] No contact info found on Contact page.`);
            }
          } catch (err) {
            console.log(`[Website Scraper] Error scraping Contact page: ${err.message}`);
          }
        } else {
          console.log(`[Website Scraper] No Contact page link found.`);
        }
      }
      return result;
    } catch (error) {
      console.error(`[Website Scraper] Error scraping website ${websiteUrl}:`, error.message);
      return { email: '', instagram: '', linkedin: '', facebook: '' };
    }
  }

  async processUrlsInBatches(urls, progressCb, batchSize = 3) {
    // Process URLs concurrently with configurable batch size
    const results = [];
    const totalUrls = urls.length;
    
    console.log(`[Batch Processor] Processing ${totalUrls} URLs in batches of ${batchSize}`);
    console.log(`[Batch Processor] Using stealth level: ${this.options.stealthLevel}`);
    
    for (let i = 0; i < urls.length; i += batchSize) {
      const batch = urls.slice(i, i + batchSize);
      console.log(`[Batch Processor] Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(urls.length / batchSize)} (URLs ${i + 1}-${Math.min(i + batchSize, urls.length)})`);
      
      if (this.options.stealthLevel === 'high-stealth') {
        // High stealth: Process each URL with its own context
        const batchPromises = batch.map(async (url, index) => {
          // Create new context for each URL with rotating settings
          const individualContext = await this.browser.newContext({
            userAgent: this.getRandomUserAgent(),
            viewport: this.getRandomViewport(),
            locale: this.getRandomLocale(),
            timezoneId: this.getRandomTimezone(),
            bypassCSP: true
          });
          
          // Enhanced stealth script for each context
          await individualContext.addInitScript(() => {
            Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
            delete navigator.__proto__.webdriver;
            
            // Additional stealth measures
            Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
            Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
            Object.defineProperty(navigator, 'permissions', { get: () => ({ query: () => Promise.resolve({ state: 'granted' }) }) });
          });
          
          const page = await individualContext.newPage();
          
          // Enable network interception for faster loading
          await page.route('**/*', (route) => {
            const resourceType = route.request().resourceType();
            // Block unnecessary resources for faster scraping
            if (['image', 'stylesheet', 'font', 'media'].includes(resourceType)) {
              route.abort();
            } else {
              route.continue();
            }
          });
          
          try {
            const result = await this.extractBusinessDetails(url, page);
            
            // Step 3: Scrape website for contact info if website exists
            if (result['Website'] && result['Website'] !== '') {
              console.log(`[Batch Worker ${index + 1}] Scraping website for contact info: ${result['Website']}`);
              const contactInfo = await this.scrapeWebsiteForContactInfo(result['Website'], page);
              
              // Add contact info to result
              result['Email'] = contactInfo.email;
              result['Instagram'] = contactInfo.instagram;
              result['LinkedIn'] = contactInfo.linkedin;
              result['Facebook'] = contactInfo.facebook;
            } else {
              // Add empty contact fields if no website
              result['Email'] = '';
              result['Instagram'] = '';
              result['LinkedIn'] = '';
              result['Facebook'] = '';
            }
            
            console.log(`[Batch Worker ${index + 1}] Completed: ${url}`);
            return result;
          } catch (error) {
            console.error(`[Batch Worker ${index + 1}] Error processing ${url}:`, error.message);
            return {
              'Business Name': '',
              'Company Type': '',
              'Rating': '',
              'Reviews': '',
              'Address': '',
              'Phone Number': '',
              'Website': '',
              'Email': '',
              'Instagram': '',
              'LinkedIn': '',
              'Facebook': '',
              'URL': url
            };
          } finally {
            await page.close();
            await individualContext.close();
          }
        });
        
        // Wait for all URLs in the batch to complete
        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);
        
        // Update progress
        const progress = Math.round(((i + batchSize) / totalUrls) * 100);
        progressCb(Math.min(progress, 100), [...results]);
        
        // Add delay between batches to be respectful
        if (i + batchSize < urls.length) {
          console.log(`[Batch Processor] Waiting 3000ms before next batch...`);
          await new Promise(resolve => setTimeout(resolve, 3000));
        }
      } else {
        // Optimized: Use one context per batch for better performance
        const batchContext = await this.browser.newContext({
          userAgent: this.getRandomUserAgent(),
          viewport: { width: 1366, height: 768 },
          locale: 'en-US',
          timezoneId: 'America/New_York'
        });
        
        // Basic stealth script
        await batchContext.addInitScript(() => {
          Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
          delete navigator.__proto__.webdriver;
        });
        
        const batchPromises = batch.map(async (url, index) => {
          const page = await batchContext.newPage();
          
          try {
            const result = await this.extractBusinessDetails(url, page);
            
            // Step 3: Scrape website for contact info if website exists
            if (result['Website'] && result['Website'] !== '') {
              console.log(`[Batch Worker ${index + 1}] Scraping website for contact info: ${result['Website']}`);
              const contactInfo = await this.scrapeWebsiteForContactInfo(result['Website'], page);
              
              // Add contact info to result
              result['Email'] = contactInfo.email;
              result['Instagram'] = contactInfo.instagram;
              result['LinkedIn'] = contactInfo.linkedin;
              result['Facebook'] = contactInfo.facebook;
            } else {
              // Add empty contact fields if no website
              result['Email'] = '';
              result['Instagram'] = '';
              result['LinkedIn'] = '';
              result['Facebook'] = '';
            }
            
            console.log(`[Batch Worker ${index + 1}] Completed: ${url}`);
            return result;
          } catch (error) {
            console.error(`[Batch Worker ${index + 1}] Error processing ${url}:`, error.message);
            return {
              'Business Name': '',
              'Company Type': '',
              'Rating': '',
              'Reviews': '',
              'Address': '',
              'Phone Number': '',
              'Website': '',
              'Email': '',
              'Instagram': '',
              'LinkedIn': '',
              'Facebook': '',
              'URL': url
            };
          } finally {
            await page.close();
          }
        });
        
        // Wait for all URLs in the batch to complete
        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);
        
        // Close the shared context
        await batchContext.close();
        
        // Update progress
        const progress = Math.round(((i + batchSize) / totalUrls) * 100);
        progressCb(Math.min(progress, 100), [...results]);
        
        // Add delay between batches to be respectful
        if (i + batchSize < urls.length) {
          console.log(`[Batch Processor] Waiting 1000ms before next batch...`);
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
              }
      }
    
    console.log(`[Batch Processor] All batches completed. Total results: ${results.length}`);
    return results;
  }

  async scrapeAndEnrich(searchTerm, location, maxResults = 9999, progressCb = () => {}) {
    console.log(`[Combined Scraper] Starting complete scrape and enrich process for: ${searchTerm} in ${location}`);
    
    try {
      // Step 1: Scrape URLs from Google Maps search
      const urls = await this.scrapeUrls(searchTerm, location, maxResults, progressCb);
      
      if (urls.length === 0) {
        console.log('[Combined Scraper] No URLs found, stopping process');
        return [];
      }

      console.log(`[Combined Scraper] Found ${urls.length} URLs, now extracting business details in batches...`);

      // Step 2: Extract detailed information from URLs in batches
      const batchSize = this.options.batchSize || 3;
      const results = await this.processUrlsInBatches(urls, progressCb, batchSize);

      // Step 3: Save results to CSV with CSV-safe phone numbers
      const csvResults = results.map(result => ({
        ...result,
        'Phone Number': this.formatPhoneNumberForCSV(result['Phone Number'])
      }));

      const csvWriter = createCsvWriter({
        path: 'combined_results.csv',
        header: [
          { id: 'Business Name', title: 'Business Name' },
          { id: 'Company Type', title: 'Company Type' },
          { id: 'Rating', title: 'Rating' },
          { id: 'Reviews', title: 'Reviews' },
          { id: 'Address', title: 'Address' },
          { id: 'Phone Number', title: 'Phone Number' },
          { id: 'Website', title: 'Website' },
          { id: 'Email', title: 'Email' },
          { id: 'Instagram', title: 'Instagram' },
          { id: 'LinkedIn', title: 'LinkedIn' },
          { id: 'Facebook', title: 'Facebook' },
          { id: 'URL', title: 'URL' }
        ],
        alwaysQuote: false,
        // Quote fields that contain commas, quotes, or newlines
        shouldQuote: (value) => {
          return typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'));
        }
      });
      
      await csvWriter.writeRecords(csvResults);
      console.log(`[Combined Scraper] Complete! Results written to combined_results.csv`);
      console.log(`[Combined Scraper] Total businesses processed: ${results.length}`);

      return results;
    } catch (error) {
      console.error('[Combined Scraper] Error during scrape and enrich process:', error);
      throw error;
    }
  }

  async close() {
    if (this.browser) await this.browser.close();
  }
}

// Export the class
module.exports = CombinedGoogleMapsScraper;

// If run directly, execute the scraper
if (require.main === module) {
  (async () => {
    const scraper = new CombinedGoogleMapsScraper();
    try {
      await scraper.init();
      
      // You can modify these parameters
      const searchTerm = process.argv[2] || 'restaurants';
      const location = process.argv[3] || 'New York';
      const maxResults = parseInt(process.argv[4]) || 10;
      
      console.log(`Starting combined scraper with: "${searchTerm}" in "${location}", max ${maxResults} results`);
      
      const results = await scraper.scrapeAndEnrich(searchTerm, location, maxResults, (progress, currentResults) => {
        console.log(`Progress: ${progress}% (${currentResults.length} businesses processed)`);
      });
      
      console.log('Scraping completed successfully!');
    } catch (error) {
      console.error('Error:', error);
    } finally {
      await scraper.close();
    }
  })();
} 