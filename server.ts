import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware to parse JSON
  app.use(express.json());

  // API Route to fetch courses directly from the original Futurekul APIs (Live and Recorded)
  app.get("/api/courses", async (req, res) => {
    try {
      const headers = {
        "Accept": "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      };

      const fetchApi = async (url: string) => {
        const response = await fetch(url, { headers });
        if (!response.ok) {
          throw new Error(`Failed to fetch from ${url} with status ${response.status}`);
        }
        const json = await response.json() as any;
        if (json && Array.isArray(json.data)) {
          return json.data;
        }
        return [];
      };

      console.log("Fetching batches from original Futurekul API...");
      const [liveData, recordData] = await Promise.all([
        fetchApi("https://www.futurekul.com/admin/api/course/135/1/"),
        fetchApi("https://www.futurekul.com/admin/api/course/135/0/")
      ]);

      // Normalize is_live field and merge both datasets
      const mappedLive = liveData.map((course: any) => ({
        ...course,
        is_live: "1" // Enforce string "1" for batches from live endpoint
      }));

      const mappedRecord = recordData.map((course: any) => ({
        ...course,
        is_live: "0" // Enforce string "0" for batches from recorded/VOD endpoint
      }));

      const mergedCourses = [...mappedLive, ...mappedRecord];
      console.log(`Original API Fetch Succeeded. Live: ${mappedLive.length}, Recorded: ${mappedRecord.length}`);

      return res.json({
        state: 200,
        msg: "success",
        source: "live_api",
        data: mergedCourses
      });
    } catch (error: any) {
      console.error("Futurekul original API fetch error:", error.message || error);
      return res.status(500).json({
        state: 500,
        msg: error.message || "Failed to fetch batches from live server API",
        data: []
      });
    }
  });

  // Dynamic route to proxy getting course material details (Video, PDFs, structure) by Batch ID (bid)
  app.get("/api/course-data/:bid", async (req, res) => {
    try {
      const bid = req.params.bid;
      const url = `https://www.futurekul.com/admin/api/getCourseDataByTopic-v2/${bid}/`;
      const headers = {
        "Accept": "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      };

      console.log(`[Server proxy] Fetching detailed course payload for BID: ${bid}`);
      const response = await fetch(url, { headers });
      if (!response.ok) {
        throw new Error(`External Futurekul syllabus API returned HTTP ${response.status}`);
      }

      const json = await response.json() as any;
      
      // Send successful dataset back
      return res.json({
        state: 200,
        msg: "success",
        data: json.data || json
      });
    } catch (error: any) {
      console.error(`[Server proxy Error] Failed fetching batch materials for BID ${req.params.bid}:`, error.message || error);
      return res.status(500).json({
        state: 500,
        msg: error.message || "Failed to fetch syllabus details from live server",
        data: null
      });
    }
  });

  // Health check endpoint
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", time: new Date().toISOString() });
  });

  // Vite development middleware vs Static Production files serving
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Futurekul App Server] Running on http://localhost:${PORT} in ${process.env.NODE_ENV || "development"} mode`);
  });
}

startServer();
