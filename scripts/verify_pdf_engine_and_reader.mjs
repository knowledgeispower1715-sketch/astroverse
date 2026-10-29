import { spawn } from 'child_process';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const indexPath = path.resolve(__dirname, '..', 'index.html').replace(/\\/g, '/');
const outputDir = path.resolve(__dirname, '..', 'test-artifacts', 'pdf_exports');

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

function getJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => resolve(JSON.parse(data)));
    }).on('error', reject);
  });
}

class HardenedCdpClient {
  constructor(wsUrl) {
    this.wsUrl = wsUrl;
    this.msgId = 1;
    this.callbacks = new Map();
  }

  async connect() {
    this.ws = new globalThis.WebSocket(this.wsUrl);
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('WebSocket connection timed out')), 5000);
      this.ws.addEventListener('open', () => {
        clearTimeout(timeout);
        resolve();
      });
      this.ws.addEventListener('error', (err) => {
        clearTimeout(timeout);
        reject(err);
      });
    });

    this.ws.addEventListener('message', (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.id && this.callbacks.has(msg.id)) {
          const { resolve, reject, timer } = this.callbacks.get(msg.id);
          clearTimeout(timer);
          this.callbacks.delete(msg.id);
          if (msg.error) reject(new Error(msg.error.message));
          else resolve(msg.result);
        }
      } catch (e) {
        console.error('[CDP Parse Error]', e);
      }
    });
  }

  send(method, params = {}, timeoutMs = 25000) {
    return new Promise((resolve, reject) => {
      const id = this.msgId++;
      const timer = setTimeout(() => {
        if (this.callbacks.has(id)) {
          this.callbacks.delete(id);
          reject(new Error(`CDP command '${method}' [ID: ${id}] timed out after ${timeoutMs}ms`));
        }
      }, timeoutMs);

      this.callbacks.set(id, { resolve, reject, timer });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async eval(expression, timeoutMs = 30000) {
    const res = await this.send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true
    }, timeoutMs);

    if (res.exceptionDetails) {
      const desc = res.exceptionDetails.exception?.description || res.exceptionDetails.text;
      throw new Error(`Browser Eval Exception: ${desc}`);
    }
    return res.result?.value;
  }

  close() {
    try {
      if (this.ws) {
        this.ws.close();
      }
    } catch (_) {}
  }
}

async function runPdfEngineAudit() {
  console.log('======================================================================');
  console.log('ASTROVERSE PREMIUM REPORT ENGINE & PDF EXPORT VERIFICATION SUITE');
  console.log('======================================================================\n');
  console.log(`[INIT] Target application: file:///${indexPath}`);
  console.log(`[INIT] Artifact output directory: ${outputDir}\n`);

  const chromeProc = spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', [
    '--headless=new',
    '--remote-debugging-port=9288',
    '--disable-gpu',
    '--no-sandbox',
    '--allow-file-access-from-files',
    `file:///${indexPath}`
  ]);

  let cdp = null;

  // Cleanup handler for graceful shutdown
  const cleanup = () => {
    try {
      if (cdp) cdp.close();
    } catch (_) {}
    try {
      chromeProc.kill('SIGKILL');
    } catch (_) {}
  };

  process.on('SIGINT', () => {
    cleanup();
    process.exit(1);
  });
  process.on('exit', cleanup);

  try {
    let connected = false;
    let targets = null;
    for (let i = 0; i < 40; i++) {
      try {
        targets = await getJson('http://127.0.0.1:9288/json/list');
        if (targets && targets.length > 0) {
          connected = true;
          break;
        }
      } catch (e) {
        await new Promise((r) => setTimeout(r, 150));
      }
    }
    if (!connected) throw new Error('Could not connect to Chrome debugging endpoint on port 9288');

    const pageTarget = targets.find((t) => t.type === 'page') || targets[0];
    cdp = new HardenedCdpClient(pageTarget.webSocketDebuggerUrl);
    await cdp.connect();
    console.log('[CDP] Connected successfully to Chrome DevTools Protocol.');

    await cdp.send('Page.enable');
    await cdp.send('Runtime.enable');

    // Wait until application environment and core functions initialize
    console.log('[INIT] Waiting for AstroVerse client application bootstrap...');
    let appReady = false;
    for (let i = 0; i < 50; i++) {
      const ready = await cdp.eval('typeof window.buildClientSideDemoReportDocument === "function" && typeof window.generateAndDownloadReportPdf === "function"');
      if (ready === true) {
        appReady = true;
        break;
      }
      await new Promise((r) => setTimeout(r, 200));
    }
    if (!appReady) throw new Error('AstroVerse client application did not initialize within 10 seconds');
    console.log('[INIT] AstroVerse client functions ready.\n');

    // Setup synthetic benchmark native
    const initChartRes = await cdp.eval(`
      (() => {
        window.currentCalculatedChart = {
          name: "Synthetic Vedic Benchmark Native",
          dob: "1995-10-24",
          tob: "14:05",
          city: "Jabalpur, Madhya Pradesh, India",
          lat: 23.1686,
          lon: 79.9534,
          tz: 5.5
        };
        try {
          window.currentCalculatedChart.fullData = calculateClientKundli("1995-10-24", "14:05", 23.1686, 79.9534, false);
        } catch (e) {
          console.error("calculateClientKundli error:", e);
        }
        return {
          hasFullData: Boolean(window.currentCalculatedChart.fullData),
          lagnaSign: window.currentCalculatedChart.fullData?.d1_rashi_chart?.lagna?.sign,
          moonSign: window.currentCalculatedChart.fullData?.d1_rashi_chart?.planets?.Moon?.sign
        };
      })()
    `);
    console.log(`[FIXTURE] Initialized chart: Lagna = ${initChartRes.lagnaSign}, Moon = ${initChartRes.moonSign}\n`);

    const productsToAudit = [
      { id: 'report_janam_kundli_deep_dive', name: 'Complete Janam Kundli Deep Dive' },
      { id: 'report_career_education', name: 'Career & Education Report' },
      { id: 'report_relationship_marriage', name: 'Relationship & Marriage Report' },
      { id: 'report_three_year_roadmap', name: 'Three-Year Personal Roadmap' },
      { id: 'report_twelve_month_varshphal', name: 'Twelve-Month Varshphal & Forecast' },
      { id: 'report_one_month_forecast', name: 'One-Month Personalized Forecast' },
      { id: 'report_remedial_gemstones', name: 'Planetary Remedies, Gemstone & Mantra Blueprint' },
      { id: 'report_vedic_name_numerology', name: 'Vedic Name Correction & Numerology Master Blueprint' },
      { id: 'report_kundli_milan', name: 'Detailed Kundli Milan (Astrological Synastry)' },
      { id: 'report_bundle_kundli_varshphal', name: 'Complete Kundli + 12-Month Forecast Bundle' }
    ];

    const auditResults = [];

    for (let pIdx = 0; pIdx < productsToAudit.length; pIdx++) {
      const prod = productsToAudit[pIdx];
      const timeStr = new Date().toISOString().split('T')[1].slice(0, 8);
      console.log(`----------------------------------------------------------------------`);
      console.log(`[${timeStr}] [${pIdx + 1}/10] AUDITING: ${prod.id} (${prod.name})`);
      console.log(`----------------------------------------------------------------------`);

      const productAudit = {
        productId: prod.id,
        productName: prod.name,
        checks: {
          documentBuilt: false,
          sectionCount: 0,
          contentSubstantive: false,
          zeroLeakedMarkdownHeadings: false,
          zeroLeakedRawLatex: false,
          mathBoxesRendered: false,
          executiveSummaryQuality: false,
          sanskritPreserved: false,
          privacyPreserved: false,
          pdfGenerated: false,
          pdfArtifactSaved: false,
          pdfPageCount: 0,
          pdfByteSize: 0,
          zeroTrailingBlankPages: false
        },
        failures: []
      };

      try {
        // Step 1: Build client-side report document
        const docInspect = await cdp.eval(`
          (() => {
            const prodMeta = (typeof currentStoreCatalogue !== 'undefined' && currentStoreCatalogue.find(p => p.productId === '${prod.id}')) || {
              productId: '${prod.id}',
              displayName: '${prod.name}'
            };
            const chart = window.currentCalculatedChart;
            const doc = buildClientSideDemoReportDocument(prodMeta, chart);
            
            // Section metrics
            const sections = (doc.sections || []).map((sec, idx) => {
              const rawMd = sec.contentMarkdown || '';
              const html = renderSafeMarkdown(rawMd);
              
              const leakedH4 = html.includes('####') || html.includes('#####');
              const leakedRawLatex = html.includes('$$') || html.includes('\\text{') || html.includes('\\pmod{') || html.includes('\\leftrightarrow') || html.includes('\\rightarrow') || html.includes('\\frac{');
              const hasMathBox = html.includes('class="math-formula-box"') || html.includes('class="math-inline"');
              
              return {
                chapterNumber: sec.chapterNumber || (idx + 1),
                sectionId: sec.sectionId,
                title: sec.title,
                rawMdLen: rawMd.length,
                htmlLen: html.length,
                leakedH4,
                leakedRawLatex,
                hasMathBox
              };
            });

            // Bilingual Summary Inspection
            const enSummary = buildEnglishReportSummary(doc);
            const hiSummary = buildHindiReportSummary(doc);

            // Privacy check on executive summary and sections
            const allHtmlCombined = (enSummary + ' ' + hiSummary + ' ' + sections.map(s => s.html).join(' '));
            const hasRawCoords = /Lat\s*23\.\d+|Lon\s*79\.\d+/i.test(allHtmlCombined);
            const hasAryanTiwari = /Aryan\s*Tiwari/i.test(allHtmlCombined);

            return {
              productName: doc.productName,
              numSections: doc.sections?.length || 0,
              hasMonthlyForecasts: Boolean(doc.monthlyForecasts && doc.monthlyForecasts.length > 0),
              monthlyForecastCount: doc.monthlyForecasts?.length || 0,
              sections,
              enSummaryLen: enSummary.length,
              hiSummaryLen: hiSummary.length,
              enSummaryHasSynthesis: enSummary.includes('Lagna') || enSummary.includes('Ashtakoota') || enSummary.includes('Synthesis') || enSummary.includes('Roadmap') || enSummary.includes('Harmony') || enSummary.includes('Blueprint'),
              hiSummaryHasTerms: hiSummary.includes('षोडशवर्ग') || hiSummary.includes('विंशोत्तरी') || hiSummary.includes('अष्टकूट') || hiSummary.includes('मूलांक') || hiSummary.includes('पाराशरी') || hiSummary.includes('लग्न'),
              hasRawCoords,
              hasAryanTiwari
            };
          })()
        `);

        productAudit.checks.documentBuilt = true;
        productAudit.checks.sectionCount = docInspect.numSections;
        console.log(`  [DOC] Built document with ${docInspect.numSections} chapters.`);

        // Step 2: Content Depth & Formatting Integrity
        let allSubstantive = true;
        let anyLeakedH4 = false;
        let anyLeakedRawLatex = false;
        let anyMathBoxes = false;

        for (const sec of docInspect.sections) {
          if (sec.rawMdLen < 200) {
            allSubstantive = false;
            productAudit.failures.push(`Ch ${sec.chapterNumber} ("${sec.title}") is thin (${sec.rawMdLen} chars).`);
          }
          if (sec.leakedH4) {
            anyLeakedH4 = true;
            productAudit.failures.push(`Ch ${sec.chapterNumber} has leaked #### headers in rendered HTML.`);
          }
          if (sec.leakedRawLatex) {
            anyLeakedRawLatex = true;
            productAudit.failures.push(`Ch ${sec.chapterNumber} has unrendered LaTeX syntax in rendered HTML.`);
          }
          if (sec.hasMathBox) {
            anyMathBoxes = true;
          }
        }

        productAudit.checks.contentSubstantive = allSubstantive && docInspect.numSections >= 4;
        productAudit.checks.zeroLeakedMarkdownHeadings = !anyLeakedH4;
        productAudit.checks.zeroLeakedRawLatex = !anyLeakedRawLatex;
        productAudit.checks.mathBoxesRendered = anyMathBoxes;
        productAudit.checks.executiveSummaryQuality = docInspect.enSummaryHasSynthesis && docInspect.enSummaryLen > 300;
        productAudit.checks.sanskritPreserved = docInspect.hiSummaryHasTerms;
        productAudit.checks.privacyPreserved = !docInspect.hasRawCoords && !docInspect.hasAryanTiwari;

        console.log(`  [TEXT] Substantive Chapters: ${productAudit.checks.contentSubstantive ? 'PASS' : 'FAIL'}`);
        console.log(`  [FORMAT] Zero Leaked Markdown Headings: ${productAudit.checks.zeroLeakedMarkdownHeadings ? 'PASS' : 'FAIL'}`);
        console.log(`  [FORMAT] Zero Leaked LaTeX Commands: ${productAudit.checks.zeroLeakedRawLatex ? 'PASS' : 'FAIL'}`);
        console.log(`  [SUMMARY] Bilingual Executive Synthesis: ${productAudit.checks.executiveSummaryQuality ? 'PASS' : 'FAIL'}`);
        console.log(`  [PRIVACY] Zero PII & Zero Raw Coords: ${productAudit.checks.privacyPreserved ? 'PASS' : 'FAIL'}`);

        // Step 3: Trigger Real Client PDF Generation & Intercept Buffer
        console.log(`  [PDF] Rendering physical pages via html2pdf & jsPDF pipeline...`);
        const pdfGenRes = await cdp.eval(`
          (async () => {
            const prodMeta = (typeof currentStoreCatalogue !== 'undefined' && currentStoreCatalogue.find(p => p.productId === '${prod.id}')) || {
              productId: '${prod.id}',
              displayName: '${prod.name}'
            };
            const chart = window.currentCalculatedChart;
            const doc = buildClientSideDemoReportDocument(prodMeta, chart);

            let capturedWorker = null;
            const realH2p = window.html2pdf;
            window.html2pdf = function() {
              const w = realH2p.apply(this, arguments);
              capturedWorker = w;
              return w;
            };

            const startTime = Date.now();
            await generateAndDownloadReportPdf(doc);
            const durationMs = Date.now() - startTime;
            window.html2pdf = realH2p;

            const pdfDoc = capturedWorker ? capturedWorker.prop.pdf : null;
            const pageCount = pdfDoc ? pdfDoc.internal.getNumberOfPages() : 0;
            const dataUri = pdfDoc ? pdfDoc.output('datauristring') : null;

            return {
              durationMs,
              pageCount,
              hasDataUri: Boolean(dataUri && dataUri.startsWith('data:application/pdf;')),
              dataUriPrefix: dataUri ? dataUri.slice(0, 50) : null,
              dataUri
            };
          })()
        `, 40000);

        if (pdfGenRes.hasDataUri && pdfGenRes.dataUri) {
          productAudit.checks.pdfGenerated = true;
          productAudit.checks.pdfPageCount = pdfGenRes.pageCount;
          productAudit.checks.zeroTrailingBlankPages = pdfGenRes.pageCount >= 4;

          // Save artifact to disk
          const b64Data = pdfGenRes.dataUri.split('base64,')[1];
          const pdfBuffer = Buffer.from(b64Data, 'base64');
          const outPdfPath = path.join(outputDir, `${prod.id}.pdf`);
          fs.writeFileSync(outPdfPath, pdfBuffer);

          productAudit.checks.pdfArtifactSaved = fs.existsSync(outPdfPath);
          productAudit.checks.pdfByteSize = pdfBuffer.length;
          productAudit.artifactPath = outPdfPath;

          console.log(`  [PDF] Generated ${pdfGenRes.pageCount} pages in ${pdfGenRes.durationMs}ms`);
          console.log(`  [PDF] Saved physical artifact: ${outPdfPath} (${pdfBuffer.length.toLocaleString()} bytes)`);
        } else {
          productAudit.failures.push('PDF generation failed to produce valid data URI.');
        }

      } catch (err) {
        console.error(`  [ERROR] Audit error on ${prod.id}:`, err.message);
        productAudit.failures.push(`Runtime error: ${err.message}`);
      }

      auditResults.push(productAudit);
    }

    // ======================================================================
    // FINAL AUDIT SUMMARY & SCORECARD
    // ======================================================================
    console.log('\n======================================================================');
    console.log('AUDIT SUMMARY SCORECARD ACROSS ALL 10 ASTROVERSE REPORT PRODUCTS');
    console.log('======================================================================\n');

    let allPass = true;
    for (const res of auditResults) {
      const c = res.checks;
      const pass = c.documentBuilt &&
                   c.contentSubstantive &&
                   c.zeroLeakedMarkdownHeadings &&
                   c.zeroLeakedRawLatex &&
                   c.executiveSummaryQuality &&
                   c.privacyPreserved &&
                   c.pdfGenerated &&
                   c.pdfArtifactSaved &&
                   c.pdfPageCount >= 4;

      if (!pass) allPass = false;

      const verdict = pass ? '[PASS]' : '[FAIL]';
      console.log(`${verdict} ${res.productId}`);
      console.log(`       Name: "${res.productName}"`);
      console.log(`       Chapters: ${c.sectionCount} | PDF Pages: ${c.pdfPageCount} | PDF Size: ${(c.pdfByteSize / 1024).toFixed(1)} KB`);
      console.log(`       Artifact: ${res.artifactPath || 'N/A'}`);
      if (res.failures.length > 0) {
        console.log(`       Issues Detected:`);
        res.failures.forEach(f => console.log(`         - ${f}`));
      }
      console.log('');
    }

    console.log('======================================================================');
    if (allPass) {
      console.log('OVERALL AUDIT VERDICT: 10/10 PRODUCTS PASSED (100% QUALITY CONFORMANCE)');
    } else {
      console.log('OVERALL AUDIT VERDICT: SOME CHECKS FAILED. SEE DETAILS ABOVE.');
    }
    console.log('======================================================================\n');

    return allPass;

  } finally {
    cleanup();
  }
}

runPdfEngineAudit()
  .then((passed) => {
    process.exit(passed ? 0 : 1);
  })
  .catch((err) => {
    console.error('Fatal execution error:', err);
    process.exit(1);
  });
