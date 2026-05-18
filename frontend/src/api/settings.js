import { http } from "./http";

export async function getSettings() {
  const res = await http.get("/settings");
  return res.data.data;
}

export async function upsertSettings(payload) {
  const res = await http.put("/settings", payload);
  return res.data.data;
}

export async function uploadLogo(file) {
  const form = new FormData();
  form.append("file", file);
  const res = await http.post("/settings/logo", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data.data;
}

export async function getDriveAuthUrl() {
  const res = await http.get("/settings/drive/auth-url");
  return res.data.data;
}

export async function disconnectDrive() {
  const res = await http.delete("/settings/drive/disconnect");
  return res.data.data;
}

