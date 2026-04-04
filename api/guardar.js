// api/guardar.js - SGF-AURA API Bridge for Vercel
const GITHUB_USER = 'proyectomaps2026';
const GITHUB_REPO = 'mapa_hecho';
const FILE_PATH = 'mapa_censo/config.json';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { objetoJSON, mensajeCommit } = req.body;
    const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

    if (!GITHUB_TOKEN) {
        return res.status(500).json({ error: 'GITHUB_TOKEN not configured in Vercel' });
    }

    const url = `https://api.github.com/repos/${GITHUB_USER}/${GITHUB_REPO}/contents/${FILE_PATH}`;

    try {
        // 1. Obtener SHA actual (Protocolo de 3 niveles)
        const getRes = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `token ${GITHUB_TOKEN}`,
                'Accept': 'application/vnd.github.v3+json',
                'Cache-Control': 'no-cache'
            }
        });

        let currentSha = null;
        if (getRes.ok) {
            const getData = await getRes.json();
            currentSha = getData.sha;
        } else if (getRes.status !== 404) {
            return res.status(getRes.status).json({ error: `GitHub GET Error: ${getRes.status}` });
        }

        // 2. Preparar el contenido (UTF-8 Safe)
        const jsonStr = JSON.stringify(objetoJSON, null, 2);
        const contentEncoded = Buffer.from(jsonStr).toString('base64');

        const payload = {
            message: mensajeCommit || `SGF Cloud Update ${new Date().toISOString()}`,
            content: contentEncoded,
            branch: 'main'
        };
        if (currentSha) payload.sha = currentSha;

        // 3. Subir a GitHub (PUT)
        const putRes = await fetch(url, {
            method: 'PUT',
            headers: {
                'Authorization': `token ${GITHUB_TOKEN}`,
                'Content-Type': 'application/json',
                'Accept': 'application/vnd.github.v3+json'
            },
            body: JSON.stringify(payload)
        });

        if (putRes.ok) {
            return res.status(200).json({ success: true, message: 'SINCRO EXITOSA: DATA EN LA NUBE' });
        } else {
            const errData = await putRes.json();
            return res.status(putRes.status).json({ error: errData.message || 'GitHub PUT Error' });
        }
    } catch (error) {
        console.error('API Error:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
}
