export default async function handler(req: any, res: any) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  try {
    const bid = req.query?.bid || (req.query?.path ? String(req.query.path).replace(/.*\//, "") : "");
    if (!bid) {
      return res.status(400).json({
        state: 400,
        msg: "Missing batch ID (bid)",
        data: null
      });
    }

    const url = `https://www.futurekul.com/admin/api/getCourseDataByTopic-v2/${bid}/`;
    const headers = {
      "Accept": "application/json",
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    };

    const response = await fetch(url, { headers });
    if (!response.ok) {
      throw new Error(`External Futurekul syllabus API returned HTTP ${response.status}`);
    }

    const json = await response.json() as any;

    return res.status(200).json({
      state: 200,
      msg: "success",
      data: json.data || json
    });
  } catch (error: any) {
    return res.status(500).json({
      state: 500,
      msg: error.message || "Failed to fetch syllabus details from live server",
      data: null
    });
  }
}
