"use strict";
(() => {
  // src/app.ts
  (() => {
    const store = {
      theme: "dastavez-theme",
      reminder: "dastavez-reminder",
      reminderOn: "dastavez-reminder-on",
      docs: "dastavez-docs",
      installed: "dastavez-installed"
    };
    const presetBase = {
      document: { b: 12, c: 28, gray: true },
      receipt: { b: 18, c: 42, gray: true },
      bw: { b: 10, c: 60, gray: true, t: 148 },
      color: { b: 2, c: 10, gray: false }
    };
    const refs = {
      body: document.body,
      drawer: document.getElementById("drawer"),
      openDrawerBtn: document.getElementById("openDrawerBtn"),
      closeDrawerBtn: document.getElementById("closeDrawerBtn"),
      themeBtn: document.getElementById("themeBtn"),
      installBtn: document.getElementById("installBtn"),
      reminderTime: document.getElementById("reminderTime"),
      saveReminderBtn: document.getElementById("saveReminderBtn"),
      reminderStatus: document.getElementById("reminderStatus"),
      tabs: document.getElementById("viewTabs"),
      fileInput: document.getElementById("fileInput"),
      importBtn: document.getElementById("importBtn"),
      cameraBtn: document.getElementById("cameraBtn"),
      stopCameraBtn: document.getElementById("stopCameraBtn"),
      captureBtn: document.getElementById("capturePhotoBtn"),
      video: document.getElementById("cameraPreview"),
      cameraState: document.getElementById("cameraState"),
      strip: document.getElementById("pageStrip"),
      stripEmpty: document.getElementById("pageStripEmpty"),
      preview: document.getElementById("previewCanvas"),
      previewEmpty: document.getElementById("previewEmpty"),
      title: document.getElementById("titleInput"),
      preset: document.getElementById("presetSelect"),
      brightness: document.getElementById("brightnessRange"),
      contrast: document.getElementById("contrastRange"),
      rotateLeft: document.getElementById("rotateLeftBtn"),
      rotateRight: document.getElementById("rotateRightBtn"),
      autoCrop: document.getElementById("autoCropBtn"),
      duplicate: document.getElementById("duplicateBtn"),
      remove: document.getElementById("deleteBtn"),
      exportPdf: document.getElementById("exportPdfBtn"),
      sharePdf: document.getElementById("sharePdfBtn"),
      clear: document.getElementById("clearStackBtn"),
      ocrLang: document.getElementById("ocrLangSelect"),
      ocrBtn: document.getElementById("ocrBtn"),
      copyOcrBtn: document.getElementById("copyOcrBtn"),
      ocrOutput: document.getElementById("ocrOutput"),
      status: document.getElementById("exportStatus"),
      docs: document.getElementById("recentDocsList"),
      profile: document.getElementById("profileCard"),
      pagesMetric: document.getElementById("pagesMetricValue"),
      docsMetric: document.getElementById("docsMetricValue"),
      modeMetric: document.getElementById("modeMetricValue")
    };
    const state = {
      theme: localStorage.getItem(store.theme) || "ink",
      view: "capture",
      pages: [],
      current: "",
      docs: loadDocs(),
      stream: null,
      installPrompt: null,
      blob: null,
      filename: ""
    };
    function loadDocs() {
      try {
        return JSON.parse(localStorage.getItem(store.docs) || "[]");
      } catch {
        return [];
      }
    }
    function saveDocs() {
      localStorage.setItem(store.docs, JSON.stringify(state.docs.slice(0, 12)));
    }
    function id(prefix) {
      return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
    }
    function q(selector) {
      return Array.from(document.querySelectorAll(selector));
    }
    function setView(view) {
      state.view = view;
      q(".tool-view").forEach((el) => el.classList.toggle("active", el.id === `view-${view}`));
      renderTabs();
    }
    function renderTabs() {
      refs.tabs.innerHTML = "";
      ["capture", "review", "export"].forEach((name) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = `tab-btn${state.view === name ? " active" : ""}`;
        button.textContent = name[0].toUpperCase() + name.slice(1);
        button.addEventListener("click", () => setView(name));
        refs.tabs.appendChild(button);
      });
    }
    function currentPage() {
      return state.pages.find((page) => page.id === state.current) || null;
    }
    function ensureCurrent() {
      if (state.pages.length && !currentPage()) state.current = state.pages[0].id;
      if (!state.pages.length) state.current = "";
    }
    function renderProfile() {
      refs.profile.innerHTML = "";
      const rows = [
        ["Theme", state.theme === "ink" ? "Ink" : "Paper"],
        ["Reminder", localStorage.getItem(store.reminderOn) === "true" ? localStorage.getItem(store.reminder) || "--" : "--"],
        ["Install", localStorage.getItem(store.installed) === "true" ? "Ready" : "Browser"],
        ["Exports", String(state.docs.length)]
      ];
      rows.forEach(([label, value]) => {
        const row = document.createElement("div");
        row.className = "stack-row";
        row.innerHTML = `<span>${label}</span><strong>${value}</strong>`;
        refs.profile.appendChild(row);
      });
    }
    function renderMetrics() {
      refs.pagesMetric.textContent = String(state.pages.length);
      refs.docsMetric.textContent = String(state.docs.length);
      refs.modeMetric.textContent = currentPage()?.preset || "document";
    }
    function renderDocs() {
      refs.docs.innerHTML = "";
      if (!state.docs.length) {
        refs.docs.innerHTML = `<div class="empty-card">No PDF exports yet.</div>`;
        return;
      }
      state.docs.forEach((doc) => {
        const item = document.createElement("article");
        item.className = "history-item";
        item.innerHTML = `<img src="${doc.thumb}" alt="${doc.title}"><div><strong>${doc.title}</strong><p>${doc.pages} pages \xB7 ${doc.size}</p><span>${new Date(doc.at).toLocaleString()}</span></div>`;
        refs.docs.appendChild(item);
      });
    }
    function syncControls() {
      const page = currentPage();
      if (!page) return;
      refs.preset.value = page.preset;
      refs.brightness.value = String(page.brightness);
      refs.contrast.value = String(page.contrast);
    }
    function renderStrip() {
      ensureCurrent();
      refs.strip.innerHTML = "";
      refs.stripEmpty.hidden = state.pages.length > 0;
      if (!state.pages.length) {
        refs.preview.hidden = true;
        refs.previewEmpty.hidden = false;
        renderMetrics();
        return;
      }
      state.pages.forEach((page, i) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = `page-thumb${page.id === state.current ? " active" : ""}`;
        button.innerHTML = `<img src="${page.src}" alt="Page ${i + 1}"><span>${i + 1}</span>`;
        button.addEventListener("click", () => {
          state.current = page.id;
          syncControls();
          renderStrip();
        });
        refs.strip.appendChild(button);
      });
      syncControls();
      void renderPreview();
      renderMetrics();
    }
    async function img(src) {
      return new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = reject;
        image.src = src;
      });
    }
    async function processed(page) {
      const image = await img(page.src);
      const turns = (page.rotation % 360 + 360) % 360;
      const quarter = turns === 90 || turns === 270;
      const w = image.naturalWidth;
      const h = image.naturalHeight;
      const canvas = document.createElement("canvas");
      canvas.width = quarter ? h : w;
      canvas.height = quarter ? w : h;
      const context = canvas.getContext("2d", { willReadFrequently: true });
      if (!context) throw new Error("No canvas");
      context.save();
      context.translate(canvas.width / 2, canvas.height / 2);
      context.rotate(turns * Math.PI / 180);
      context.drawImage(image, -w / 2, -h / 2);
      context.restore();
      const data = context.getImageData(0, 0, canvas.width, canvas.height);
      const px = data.data;
      const base = presetBase[page.preset];
      const contrastSeed = Math.max(-100, Math.min(100, base.c + page.contrast));
      const cf = 259 * (contrastSeed + 255) / (255 * (259 - contrastSeed));
      const light = Math.max(-100, Math.min(100, base.b + page.brightness)) / 100 * 255;
      for (let i = 0; i < px.length; i += 4) {
        let r = px[i];
        let g = px[i + 1];
        let b = px[i + 2];
        if (base.gray) {
          const gray = r * 0.299 + g * 0.587 + b * 0.114;
          r = gray;
          g = gray;
          b = gray;
        }
        r = cf * (r - 128) + 128 + light;
        g = cf * (g - 128) + 128 + light;
        b = cf * (b - 128) + 128 + light;
        if (base.t !== void 0) {
          const level = (r + g + b) / 3 >= base.t ? 255 : 0;
          r = level;
          g = level;
          b = level;
        }
        px[i] = clamp(r);
        px[i + 1] = clamp(g);
        px[i + 2] = clamp(b);
      }
      context.putImageData(data, 0, 0);
      return canvas;
    }
    function clamp(value) {
      return Math.max(0, Math.min(255, Math.round(value)));
    }
    async function waitForGlobal(key, ready, timeout = 2e4) {
      const start = Date.now();
      return new Promise((resolve, reject) => {
        const tick = () => {
          const value = window[key];
          if (value && ready(value)) {
            resolve(value);
            return;
          }
          if (Date.now() - start > timeout) {
            reject(new Error(`${key} not ready`));
            return;
          }
          setTimeout(tick, 120);
        };
        tick();
      });
    }
    function orderedCorners(points) {
      const sum = (point) => point.x + point.y;
      const diff = (point) => point.y - point.x;
      const tl = points.reduce((best, point) => sum(point) < sum(best) ? point : best);
      const br = points.reduce((best, point) => sum(point) > sum(best) ? point : best);
      const tr = points.reduce((best, point) => diff(point) < diff(best) ? point : best);
      const bl = points.reduce((best, point) => diff(point) > diff(best) ? point : best);
      return [tl, tr, br, bl];
    }
    function distance(a, b) {
      return Math.hypot(a.x - b.x, a.y - b.y);
    }
    async function renderPreview() {
      const page = currentPage();
      if (!page) return;
      const canvas = await processed(page);
      refs.preview.hidden = false;
      refs.previewEmpty.hidden = true;
      refs.preview.width = 720;
      refs.preview.height = Math.round(720 * (canvas.height / canvas.width));
      const context = refs.preview.getContext("2d");
      if (!context) return;
      context.clearRect(0, 0, refs.preview.width, refs.preview.height);
      context.drawImage(canvas, 0, 0, refs.preview.width, refs.preview.height);
    }
    async function autoCropPage() {
      const page = currentPage();
      if (!page) {
        refs.status.textContent = "Select a page before running auto crop.";
        return;
      }
      refs.status.textContent = "Auto edge detection running...";
      try {
        const cv = await waitForGlobal("cv", (value) => typeof value.Mat === "function");
        const image = await img(page.src);
        const input = document.createElement("canvas");
        input.width = image.naturalWidth;
        input.height = image.naturalHeight;
        const inputContext = input.getContext("2d");
        if (!inputContext) throw new Error("Input canvas unavailable");
        inputContext.drawImage(image, 0, 0, input.width, input.height);
        const src = cv.imread(input);
        const gray = new cv.Mat();
        const blur = new cv.Mat();
        const edges = new cv.Mat();
        const contours = new cv.MatVector();
        const hierarchy = new cv.Mat();
        cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY, 0);
        cv.GaussianBlur(gray, blur, new cv.Size(5, 5), 0);
        cv.Canny(blur, edges, 75, 200);
        cv.findContours(edges, contours, hierarchy, cv.RETR_LIST, cv.CHAIN_APPROX_SIMPLE);
        let bestArea = 0;
        let best = null;
        for (let i = 0; i < contours.size(); i += 1) {
          const contour = contours.get(i);
          const approx = new cv.Mat();
          cv.approxPolyDP(contour, approx, 0.02 * cv.arcLength(contour, true), true);
          const area = Math.abs(cv.contourArea(contour));
          if (approx.rows === 4 && area > bestArea) {
            bestArea = area;
            best = [];
            for (let j = 0; j < 4; j += 1) {
              best.push({ x: approx.data32S[j * 2], y: approx.data32S[j * 2 + 1] });
            }
          }
          contour.delete();
          approx.delete();
        }
        if (!best) {
          src.delete();
          gray.delete();
          blur.delete();
          edges.delete();
          contours.delete();
          hierarchy.delete();
          refs.status.textContent = "Auto crop could not find a clear page edge.";
          return;
        }
        const [tl, tr, br, bl] = orderedCorners(best);
        const maxWidth = Math.max(distance(tl, tr), distance(bl, br), 1);
        const maxHeight = Math.max(distance(tl, bl), distance(tr, br), 1);
        const srcTri = cv.matFromArray(4, 1, cv.CV_32FC2, [tl.x, tl.y, tr.x, tr.y, br.x, br.y, bl.x, bl.y]);
        const dstTri = cv.matFromArray(4, 1, cv.CV_32FC2, [0, 0, maxWidth, 0, maxWidth, maxHeight, 0, maxHeight]);
        const matrix = cv.getPerspectiveTransform(srcTri, dstTri);
        const output = new cv.Mat();
        cv.warpPerspective(src, output, matrix, new cv.Size(maxWidth, maxHeight), cv.INTER_LINEAR, cv.BORDER_CONSTANT, new cv.Scalar());
        const view = document.createElement("canvas");
        cv.imshow(view, output);
        page.src = view.toDataURL("image/jpeg", 0.96);
        page.rotation = 0;
        page.preset = "document";
        page.brightness = 0;
        page.contrast = 0;
        src.delete();
        gray.delete();
        blur.delete();
        edges.delete();
        contours.delete();
        hierarchy.delete();
        srcTri.delete();
        dstTri.delete();
        matrix.delete();
        output.delete();
        refs.status.textContent = "Auto crop complete. Perspective corrected.";
        renderStrip();
      } catch {
        refs.status.textContent = "Auto crop engine is still loading. Try again in a moment.";
      }
    }
    async function runOcr() {
      const page = currentPage();
      if (!page) {
        refs.status.textContent = "Select a page before extracting text.";
        return;
      }
      refs.status.textContent = "OCR engine loading...";
      try {
        const Tesseract = await waitForGlobal("Tesseract", (value) => typeof value.recognize === "function", 25e3);
        const canvas = await processed(page);
        const language = refs.ocrLang.value || "eng";
        const result = await Tesseract.recognize(canvas, language, {
          logger: (event) => {
            if (!event.status) return;
            const progress = event.progress ? ` ${Math.round(event.progress * 100)}%` : "";
            refs.status.textContent = `${event.status}${progress}`;
          }
        });
        refs.ocrOutput.value = result.data?.text?.trim() || "";
        refs.status.textContent = refs.ocrOutput.value ? "OCR text ready." : "OCR completed but no readable text was found.";
        setView("export");
      } catch {
        refs.status.textContent = "OCR engine is not ready yet. Try again in a moment.";
      }
    }
    async function copyOcrText() {
      if (!refs.ocrOutput.value.trim()) {
        refs.status.textContent = "Run OCR first to get text.";
        return;
      }
      await navigator.clipboard.writeText(refs.ocrOutput.value);
      refs.status.textContent = "OCR text copied.";
    }
    function addPage(src) {
      state.pages.unshift({ id: id("page"), src, preset: "document", brightness: 0, contrast: 0, rotation: 0 });
      state.current = state.pages[0].id;
      refs.status.textContent = "Page added to your stack.";
      setView("review");
      renderStrip();
    }
    async function importFiles(files) {
      if (!files?.length) return;
      const all = await Promise.all(Array.from(files).filter((f) => f.type.startsWith("image/")).map((file) => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = reject;
        reader.readAsDataURL(file);
      })));
      all.forEach(addPage);
      refs.status.textContent = `${all.length} page${all.length > 1 ? "s" : ""} imported.`;
    }
    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false });
        state.stream = stream;
        refs.video.srcObject = stream;
        await refs.video.play().catch(() => void 0);
        refs.cameraBtn.disabled = true;
        refs.stopCameraBtn.disabled = false;
        refs.captureBtn.disabled = false;
        refs.cameraState.textContent = "Rear camera ready. Keep the page flat inside the frame.";
      } catch {
        refs.cameraState.textContent = "Camera access blocked. Import from gallery instead.";
      }
    }
    function stopCamera() {
      state.stream?.getTracks().forEach((track) => track.stop());
      state.stream = null;
      refs.video.srcObject = null;
      refs.cameraBtn.disabled = false;
      refs.stopCameraBtn.disabled = true;
      refs.captureBtn.disabled = true;
      refs.cameraState.textContent = "Start camera to see the live preview here.";
    }
    function snap() {
      if (!state.stream || !refs.video.videoWidth) return;
      const canvas = document.createElement("canvas");
      canvas.width = refs.video.videoWidth;
      canvas.height = refs.video.videoHeight;
      const context = canvas.getContext("2d");
      if (!context) return;
      context.drawImage(refs.video, 0, 0, canvas.width, canvas.height);
      addPage(canvas.toDataURL("image/jpeg", 0.94));
    }
    function updateCurrent() {
      const page = currentPage();
      if (!page) return;
      page.preset = refs.preset.value;
      page.brightness = Number(refs.brightness.value);
      page.contrast = Number(refs.contrast.value);
      renderMetrics();
      void renderPreview();
    }
    function rotate(step) {
      const page = currentPage();
      if (!page) return;
      page.rotation = (page.rotation + step + 360) % 360;
      void renderPreview();
    }
    function duplicate() {
      const page = currentPage();
      if (!page) return;
      state.pages.unshift({ ...page, id: id("page") });
      state.current = state.pages[0].id;
      refs.status.textContent = "Page duplicated.";
      renderStrip();
    }
    function removePage() {
      const page = currentPage();
      if (!page) return;
      state.pages = state.pages.filter((item) => item.id !== page.id);
      refs.status.textContent = "Page removed.";
      renderStrip();
    }
    function clearAll() {
      state.pages = [];
      state.current = "";
      state.blob = null;
      refs.status.textContent = "Current stack cleared.";
      renderStrip();
    }
    function bytes(url) {
      const binary = atob(url.split(",")[1] || "");
      const out = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i += 1) out[i] = binary.charCodeAt(i);
      return out;
    }
    function join(parts) {
      const total = parts.reduce((n, item) => n + item.length, 0);
      const out = new Uint8Array(total);
      let offset = 0;
      parts.forEach((item) => {
        out.set(item, offset);
        offset += item.length;
      });
      return out;
    }
    function makePdf(canvases) {
      const encoder = new TextEncoder();
      const objects = [];
      const offsets = [];
      let oid = 1;
      const pages = canvases.map((canvas) => ({ canvas, page: oid++, content: oid++, image: oid++ }));
      const total = 2 + pages.length * 3;
      const push = (idNum, body) => {
        const chunk = typeof body === "string" ? encoder.encode(body) : body;
        objects[idNum] = join([encoder.encode(`${idNum} 0 obj
`), chunk, encoder.encode(`
endobj
`)]);
      };
      push(1, `<< /Type /Catalog /Pages 2 0 R >>`);
      push(2, `<< /Type /Pages /Count ${pages.length} /Kids [${pages.map((p) => `${p.page} 0 R`).join(" ")}] >>`);
      pages.forEach((entry) => {
        const jpg = bytes(entry.canvas.toDataURL("image/jpeg", 0.92));
        const landscape = entry.canvas.width > entry.canvas.height;
        const pw = landscape ? 842 : 595;
        const ph = landscape ? 595 : 842;
        const scale = Math.min(pw / entry.canvas.width, ph / entry.canvas.height);
        const w = Math.round(entry.canvas.width * scale);
        const h = Math.round(entry.canvas.height * scale);
        const x = Math.round((pw - w) / 2);
        const y = Math.round((ph - h) / 2);
        const stream = `q
${w} 0 0 ${h} ${x} ${y} cm
/Im0 Do
Q
`;
        push(entry.page, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pw} ${ph}] /Resources << /XObject << /Im0 ${entry.image} 0 R >> /ProcSet [/PDF /ImageC] >> /Contents ${entry.content} 0 R >>`);
        push(entry.content, `<< /Length ${stream.length} >>
stream
${stream}endstream`);
        push(entry.image, join([encoder.encode(`<< /Type /XObject /Subtype /Image /Width ${entry.canvas.width} /Height ${entry.canvas.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpg.length} >>
stream
`), jpg, encoder.encode(`
endstream`)]));
      });
      const chunks = [encoder.encode("%PDF-1.4\n")];
      for (let i = 1; i <= total; i += 1) {
        offsets[i] = chunks.reduce((n, item) => n + item.length, 0);
        chunks.push(objects[i]);
      }
      const xrefAt = chunks.reduce((n, item) => n + item.length, 0);
      let xref = `xref
0 ${total + 1}
0000000000 65535 f 
`;
      for (let i = 1; i <= total; i += 1) xref += `${String(offsets[i]).padStart(10, "0")} 00000 n 
`;
      chunks.push(encoder.encode(xref));
      chunks.push(encoder.encode(`trailer
<< /Size ${total + 1} /Root 1 0 R >>
startxref
${xrefAt}
%%EOF`));
      return new Blob(chunks, { type: "application/pdf" });
    }
    function saveBlob(blob, filename) {
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 800);
    }
    function sizeLabel(bytesCount) {
      if (bytesCount < 1024) return `${bytesCount} B`;
      if (bytesCount < 1024 * 1024) return `${(bytesCount / 1024).toFixed(1)} KB`;
      return `${(bytesCount / (1024 * 1024)).toFixed(1)} MB`;
    }
    async function exportPdf() {
      if (!state.pages.length) {
        refs.status.textContent = "Add at least one page before exporting.";
        return;
      }
      const title = refs.title.value.trim() || `scan-${(/* @__PURE__ */ new Date()).toISOString().slice(0, 10)}`;
      const canvases = await Promise.all(state.pages.slice().reverse().map((page) => processed(page)));
      const blob = makePdf(canvases);
      state.blob = blob;
      state.filename = `${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.pdf`;
      saveBlob(blob, state.filename);
      state.docs.unshift({ id: id("doc"), title, at: (/* @__PURE__ */ new Date()).toISOString(), pages: state.pages.length, size: sizeLabel(blob.size), thumb: canvases[0].toDataURL("image/jpeg", 0.72) });
      saveDocs();
      refs.status.textContent = `${title} exported as PDF.`;
      renderDocs();
      renderMetrics();
      setView("export");
    }
    async function sharePdf() {
      if (!state.blob) await exportPdf();
      if (!state.blob) return;
      const file = new File([state.blob], state.filename || "scan.pdf", { type: "application/pdf" });
      if (navigator.share && (!navigator.canShare || navigator.canShare({ files: [file] }))) {
        await navigator.share({ title: refs.title.value || "Dastavez Sathi scan", files: [file] });
        refs.status.textContent = "Share sheet opened.";
      } else {
        saveBlob(state.blob, state.filename || "scan.pdf");
      }
    }
    function init() {
      refs.body.setAttribute("data-theme", state.theme);
      refs.reminderTime.value = localStorage.getItem(store.reminder) || "19:30";
      refs.title.value = `scan-${(/* @__PURE__ */ new Date()).toISOString().slice(0, 10)}`;
      refs.stopCameraBtn.disabled = true;
      refs.captureBtn.disabled = true;
      refs.preset.innerHTML = `<option value="document">Document</option><option value="receipt">Receipt</option><option value="bw">B&W</option><option value="color">Color</option>`;
      renderTabs();
      renderStrip();
      renderDocs();
      renderProfile();
      refs.openDrawerBtn.addEventListener("click", () => refs.drawer.classList.add("open"));
      refs.closeDrawerBtn.addEventListener("click", () => refs.drawer.classList.remove("open"));
      refs.drawer.addEventListener("click", (event) => {
        if (event.target === refs.drawer) refs.drawer.classList.remove("open");
      });
      refs.themeBtn.addEventListener("click", () => {
        state.theme = state.theme === "ink" ? "paper" : "ink";
        localStorage.setItem(store.theme, state.theme);
        refs.body.setAttribute("data-theme", state.theme);
        renderProfile();
      });
      refs.saveReminderBtn.addEventListener("click", () => {
        localStorage.setItem(store.reminder, refs.reminderTime.value || "19:30");
        localStorage.setItem(store.reminderOn, "true");
        refs.reminderStatus.textContent = `Reminder saved for ${refs.reminderTime.value || "19:30"}.`;
        renderProfile();
      });
      refs.installBtn.addEventListener("click", () => {
        if (!state.installPrompt) {
          refs.reminderStatus.textContent = "Install prompt not ready yet. Try browser install.";
          return;
        }
        state.installPrompt.prompt().catch(() => void 0);
      });
      refs.importBtn.addEventListener("click", () => refs.fileInput.click());
      refs.fileInput.addEventListener("change", async () => {
        await importFiles(refs.fileInput.files);
        refs.fileInput.value = "";
      });
      refs.cameraBtn.addEventListener("click", () => void startCamera());
      refs.stopCameraBtn.addEventListener("click", stopCamera);
      refs.captureBtn.addEventListener("click", snap);
      refs.preset.addEventListener("change", updateCurrent);
      refs.brightness.addEventListener("input", updateCurrent);
      refs.contrast.addEventListener("input", updateCurrent);
      refs.rotateLeft.addEventListener("click", () => rotate(-90));
      refs.rotateRight.addEventListener("click", () => rotate(90));
      refs.autoCrop.addEventListener("click", () => void autoCropPage());
      refs.duplicate.addEventListener("click", duplicate);
      refs.remove.addEventListener("click", removePage);
      refs.clear.addEventListener("click", clearAll);
      refs.exportPdf.addEventListener("click", () => void exportPdf());
      refs.sharePdf.addEventListener("click", () => void sharePdf());
      refs.ocrBtn.addEventListener("click", () => void runOcr());
      refs.copyOcrBtn.addEventListener("click", () => void copyOcrText());
      window.addEventListener("beforeinstallprompt", (event) => {
        event.preventDefault();
        state.installPrompt = event;
      });
      window.addEventListener("appinstalled", () => {
        localStorage.setItem(store.installed, "true");
        renderProfile();
      });
      if ("serviceWorker" in navigator) navigator.serviceWorker.register("./sw.js").catch(() => void 0);
      window.addEventListener("beforeunload", stopCamera);
    }
    init();
  })();
})();
