export default async function handler(req: any, res: any) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

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

    const [liveData, recordData] = await Promise.all([
      fetchApi("https://www.futurekul.com/admin/api/course/135/1/"),
      fetchApi("https://www.futurekul.com/admin/api/course/135/0/")
    ]);

    const mappedLive = liveData.map((course: any) => ({
      ...course,
      is_live: "1"
    }));

    const mappedRecord = recordData.map((course: any) => ({
      ...course,
      is_live: "0"
    }));

    const mergedCourses = [...mappedLive, ...mappedRecord];

    return res.status(200).json({
      state: 200,
      msg: "success",
      source: "live_api",
      data: mergedCourses
    });
  } catch (error: any) {
    return res.status(500).json({
      state: 500,
      msg: error.message || "Failed to fetch batches from live server API",
      data: []
    });
  }
}
