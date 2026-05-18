import { useEffect, useMemo, useRef, useState } from "react";
import {
  useDisconnectDrive,
  useDriveAuthUrl,
  useSettings,
  useUploadLogo,
  useUpsertSettings,
} from "../hooks/useSettings";

function ModeBadge({ mode }) {
  const isDrive = mode === "google_drive";
  return (
    <span
      className={[
        "inline-flex px-2 py-1 rounded text-xs",
        isDrive ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-700",
      ].join(" ")}
    >
      {isDrive ? "Google Drive" : "Local"}
    </span>
  );
}

export default function SettingsPage() {
  const q = useSettings();
  const saveMut = useUpsertSettings();
  const logoMut = useUploadLogo();
  const authUrlMut = useDriveAuthUrl();
  const disconnectMut = useDisconnectDrive();

  const fileRef = useRef(null);

  const settings = q.data;
  const [form, setForm] = useState({
    company_name: "",
    phone: "",
    email: "",
    address: "",
    drive_client_id: "",
    drive_client_secret: "",
    drive_redirect_uri: "",
  });

  useEffect(() => {
    if (!settings) return;
    setForm({
      company_name: settings.company_name ?? "",
      phone: settings.phone ?? "",
      email: settings.email ?? "",
      address: settings.address ?? "",
      drive_client_id: settings.drive_client_id ?? "",
      drive_client_secret: "",
      drive_redirect_uri:
        settings.drive_redirect_uri ??
        "http://localhost:8000/settings/drive/callback",
    });
  }, [settings]);

  const logoPreview = useMemo(() => {
    if (!settings?.logo_base64) return null;
    return `data:image/*;base64,${settings.logo_base64}`;
  }, [settings?.logo_base64]);

  async function onSave() {
    await saveMut.mutateAsync({
      company_name: form.company_name,
      phone: form.phone || null,
      email: form.email || null,
      address: form.address || null,
      drive_client_id: form.drive_client_id || null,
      drive_client_secret: form.drive_client_secret || null,
      drive_redirect_uri: form.drive_redirect_uri || null,
    });
  }

  async function onPickLogo(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    await logoMut.mutateAsync(f);
    e.target.value = "";
  }

  async function onConnectDrive() {
    // Save creds first so backend can build URL
    await onSave();
    const out = await authUrlMut.mutateAsync();
    window.location.href = out.url;
  }

  return (
    <div className="h-full flex flex-col">
      <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-6">
        <h1 className="text-base font-semibold">Settings</h1>
      </header>

      <div className="p-6 space-y-4">
        <div className="bg-white rounded border border-gray-200 p-5 space-y-4">
          <div className="text-sm font-semibold">Company Information</div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-600 mb-1">
                Company Name *
              </label>
              <input
                value={form.company_name}
                onChange={(e) => setForm({ ...form, company_name: e.target.value })}
                className="w-full border border-gray-200 rounded px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100 bg-white"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Phone</label>
              <input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full border border-gray-200 rounded px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100 bg-white"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Email</label>
              <input
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full border border-gray-200 rounded px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100 bg-white"
              />
            </div>
            <div />
            <div className="col-span-2">
              <label className="block text-xs text-gray-600 mb-1">Address</label>
              <textarea
                rows={3}
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                className="w-full border border-gray-200 rounded px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100"
              />
            </div>
            <div className="col-span-2 flex items-center gap-3">
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={onPickLogo}
              />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="text-sm px-3 py-2 rounded border border-gray-200 hover:bg-gray-50"
                disabled={logoMut.isPending}
              >
                Upload Logo
              </button>
              {logoPreview ? (
                <img
                  src={logoPreview}
                  alt="Company logo"
                  className="h-10 w-auto border border-gray-200 rounded bg-white p-1"
                />
              ) : (
                <span className="text-sm text-gray-600">No logo</span>
              )}
            </div>
          </div>
          <div className="flex justify-end">
            <button
              type="button"
              onClick={onSave}
              className="bg-primary-600 text-white text-sm px-3 py-2 rounded hover:opacity-95 disabled:opacity-50"
              disabled={saveMut.isPending}
            >
              Save
            </button>
          </div>
        </div>

        <div className="bg-white rounded border border-gray-200 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold">PDF Storage</div>
            <ModeBadge mode={settings?.storage_mode} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-600 mb-1">
                Drive Client ID
              </label>
              <input
                value={form.drive_client_id}
                onChange={(e) =>
                  setForm({ ...form, drive_client_id: e.target.value })
                }
                className="w-full border border-gray-200 rounded px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100 bg-white"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">
                Drive Client Secret
              </label>
              <input
                value={form.drive_client_secret}
                onChange={(e) =>
                  setForm({ ...form, drive_client_secret: e.target.value })
                }
                placeholder="Enter to update (not shown once saved)"
                className="w-full border border-gray-200 rounded px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100 bg-white"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-xs text-gray-600 mb-1">
                Redirect URI
              </label>
              <input
                value={form.drive_redirect_uri}
                onChange={(e) =>
                  setForm({ ...form, drive_redirect_uri: e.target.value })
                }
                className="w-full border border-gray-200 rounded px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100 bg-white"
              />
            </div>
          </div>

          {settings?.storage_mode === "google_drive" ? (
            <div className="flex items-center justify-between">
              <span className="inline-flex px-2 py-1 rounded text-xs bg-green-50 text-green-700">
                Drive Connected
              </span>
              <button
                type="button"
                className="text-sm px-3 py-2 rounded border border-gray-200 hover:bg-gray-50 text-red-600 disabled:opacity-50"
                onClick={() => disconnectMut.mutate()}
                disabled={disconnectMut.isPending}
              >
                Disconnect
              </button>
            </div>
          ) : (
            <button
              type="button"
              className="text-sm px-3 py-2 rounded bg-primary-600 text-white hover:opacity-95 disabled:opacity-50"
              onClick={onConnectDrive}
              disabled={authUrlMut.isPending}
            >
              Connect Google Drive
            </button>
          )}

          <div className="text-xs text-gray-600">
            Local storage saves PDFs in the database. Google Drive stores them in
            your personal Drive.
          </div>
        </div>
      </div>
    </div>
  );
}

