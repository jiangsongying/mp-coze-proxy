// api/search.js
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: '仅支持 POST 请求' });
  }

  const { formula, material_id } = req.body;

  // 从环境变量读取 API Key（稍后在 Vercel 设置）
  const MP_API_KEY = process.env.MP_API_KEY;
  if (!MP_API_KEY) {
    return res.status(500).json({ error: '服务器未配置 MP_API_KEY' });
  }

  const BASE_URL = 'https://next-gen.materialsproject.org/api/v1';

  try {
    let mpData;

    if (formula) {
      // 按化学式搜索材料
      const response = await fetch(`${BASE_URL}/materials/find`, {
        method: 'POST',
        headers: {
          'X-API-KEY': MP_API_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          criteria: { formula: formula },
          properties: ["material_id", "formula_pretty", "symmetry", "density", "structure"]
        })
      });

      if (!response.ok) throw new Error(`MP API 错误: ${response.status}`);
      const result = await response.json();
      if (!result.data || result.data.length === 0) {
        return res.status(404).json({ error: `未找到 "${formula}"` });
      }
      mpData = result.data[0]; // 取第一个结果

    } else if (material_id) {
      // 按材料ID查询
      const response = await fetch(`${BASE_URL}/materials/${material_id}`, {
        headers: { 'X-API-KEY': MP_API_KEY }
      });

      if (!response.ok) throw new Error(`MP API 错误: ${response.status}`);
      mpData = await response.json();

    } else {
      return res.status(400).json({ error: '需提供 formula 或 material_id' });
    }

    // 提取关键数据
    const symmetry = mpData.symmetry || {};
    const lattice = mpData.structure?.lattice || {};

    res.status(200).json({
      success: true,
      material_id: mpData.material_id,
      formula_pretty: mpData.formula_pretty,
      crystal_system: symmetry.crystal_system,
      space_group_symbol: symmetry.symbol,
      space_group_number: symmetry.number,
      density: mpData.density,
      volume: lattice.volume,
      source: "Materials Project via Vercel Proxy"
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: '服务器内部错误', details: error.message });
  }
}
