const axios = require("axios");
const FormData = require("form-data");
require("dotenv").config();

// "api.pcloud.com" (US) ou "eapi.pcloud.com" (Europe) selon la région du compte
const PCLOUD_HOST = process.env.PCLOUD_HOST || "api.pcloud.com";

// Dossier racine commun à tout le site, configurable en un seul endroit.
// Chaque appel précise ensuite juste le sous-dossier (ex: "ludotheque").
const PCLOUD_BASE_FOLDER = process.env.PCLOUD_FOLDER || "/PortfolioSite";

// Token OAuth obtenu une seule fois (voir procédure de configuration),
// stocké directement dans .env. Plus besoin de login dynamique.
function getAuthToken() {
  const token = process.env.PCLOUD_AUTH_TOKEN;
  if (!token) {
    throw new Error(
      "PCLOUD_AUTH_TOKEN manquant dans .env — voir la procédure d'autorisation OAuth.",
    );
  }
  return token;
}

/**
 * Upload une image encodée en Base64 (data URI) vers pCloud, dans le
 * sous-dossier `subfolder` indiqué (ex: "ludotheque" -> /PortfolioSite/ludotheque).
 * Retourne le fileid pCloud du fichier créé.
 */
async function uploadBase64Image(base64String, filename, subfolder) {
  const matches = base64String.match(/^data:(.+);base64,(.+)$/);
  const buffer = matches
    ? Buffer.from(matches[2], "base64")
    : Buffer.from(base64String, "base64");

  // Important : un token OAuth se passe via "access_token", pas "auth"
  // ("auth" est réservé à l'ancien système login/mot de passe ou digest).
  const access_token = getAuthToken();

  const folderPath = `${PCLOUD_BASE_FOLDER}/${subfolder}`;

  const form = new FormData();
  form.append("file", buffer, { filename });

  const { data } = await axios.post(`https://${PCLOUD_HOST}/uploadfile`, form, {
    params: {
      access_token,
      path: folderPath,
      filename,
    },
    headers: form.getHeaders(),
  });

  if (data.result !== 0) {
    throw new Error(`pCloud upload failed: ${JSON.stringify(data)}`);
  }

  return data.fileids[0];
}

/**
 * Génère un lien de téléchargement FRAIS (expire après quelques heures)
 * pour un fichier déjà présent sur pCloud. À appeler à chaque affichage,
 * jamais à stocker en base.
 */
async function getFreshImageLink(fileid) {
  const access_token = getAuthToken();

  const { data } = await axios.get(`https://${PCLOUD_HOST}/getfilelink`, {
    params: { access_token, fileid },
  });

  if (data.result !== 0) {
    throw new Error(`pCloud getfilelink failed: ${JSON.stringify(data)}`);
  }

  return `https://${data.hosts[0]}${data.path}`;
}

/**
 * Récupère l'image directement depuis pCloud, côté serveur, et renvoie
 * le flux + le type de contenu — pour la retransmettre nous-mêmes au
 * navigateur plutôt que de le rediriger vers pCloud (plus robuste,
 * fonctionne uniformément sur tous les navigateurs/appareils).
 */
async function getImageStream(fileid) {
  const url = await getFreshImageLink(fileid);
  const response = await axios.get(url, { responseType: "stream" });
  return {
    contentType: response.headers["content-type"] || "image/webp",
    stream: response.data,
  };
}

async function deleteFile(fileid) {
  if (!fileid) return;
  const access_token = getAuthToken();
  await axios.get(`https://${PCLOUD_HOST}/deletefile`, {
    params: { access_token, fileid },
  });
}

module.exports = {
  getAuthToken,
  uploadBase64Image,
  getFreshImageLink,
  getImageStream,
  deleteFile,
};
