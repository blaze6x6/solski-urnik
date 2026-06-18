import { useState, useEffect } from 'react';
import * as api from '../api';
import { User, SmtpSettings } from '../types';
import { Save, Send, Mail, Bell, BellOff, Server } from 'lucide-react';
export default function EmailSettingsPage({ user }: { user: User }) {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">Email nastavitve</h1>
      {/* Personal notification preferences — for everyone */}
      <NotificationPreferences />
      {/* SMTP settings — admin only */}
      {user.role === 'admin' && <SmtpSettingsForm />}
    </div>
  );
}
function NotificationPreferences() {
  const [email, setEmail] = useState('');
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    api.getEmailPreferences().then(prefs => {
      setEmail(prefs.email || '');
      setEnabled(prefs.emailNotifications);
      setLoading(false);
    });
  }, []);
  const handleSave = async () => {
    setSaving(true);
    try {
      await api.updateEmailPreferences({ email, emailNotifications: enabled });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  };
  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
      </div>
    );
  }
  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
          <Mail className="w-5 h-5 text-blue-600" />
        </div>
        <div>
          <h2 className="font-semibold text-gray-800">Moja email obvestila</h2>
          <p className="text-sm text-gray-500">Prejemanje obvestil o spremembah urnika, dogodkov in beležk</p>
        </div>
      </div>
      <div className="space-y-4 max-w-md">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email naslov</label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="ime@primer.si"
            className="w-full px-4 py-2.5 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-3">
            {enabled ? (
              <Bell className="w-5 h-5 text-green-600" />
            ) : (
              <BellOff className="w-5 h-5 text-gray-400" />
            )}
            <div>
              <p className="font-medium text-gray-800 text-sm">
                {enabled ? 'Obvestila vključena' : 'Obvestila izključena'}
              </p>
              <p className="text-xs text-gray-500">
                {enabled ? 'Prejemali boste email ob spremembah.' : 'Ne boste prejemali email obvestil.'}
              </p>
            </div>
          </div>
          <button
            onClick={() => setEnabled(!enabled)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              enabled ? 'bg-green-500' : 'bg-gray-300'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${
                enabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className={`px-5 py-2.5 rounded-lg font-medium transition flex items-center gap-2 disabled:opacity-50 ${
            saved ? 'bg-green-600 text-white' : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          <Save className="w-4 h-4" />
          {saved ? 'Shranjeno!' : 'Shrani'}
        </button>
      </div>
    </div>
  );
}
function SmtpSettingsForm() {
  const [form, setForm] = useState<SmtpSettings>({
    host: '', port: 587, secure: false, user: '', password: '', fromName: 'Šolski Urnik', fromEmail: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  useEffect(() => {
    api.getSmtpSettings().then(s => {
      setForm(s);
      setTestEmail(s.fromEmail || '');
      setLoading(false);
    });
  }, []);
  const handleSave = async () => {
    setSaving(true);
    try {
      await api.updateSmtpSettings(form);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  };
  const handleTest = async () => {
    if (!testEmail) return;
    setTesting(true);
    setTestResult(null);
    try {
      await api.sendTestEmail(testEmail);
      setTestResult('✅ Testni email uspešno poslan!');
    } catch (err: any) {
      setTestResult('❌ ' + (err.message || 'Pošiljanje ni uspelo'));
    } finally {
      setTesting(false);
    }
  };
  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
      </div>
    );
  }
  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
          <Server className="w-5 h-5 text-purple-600" />
        </div>
        <div>
          <h2 className="font-semibold text-gray-800">SMTP strežnik</h2>
          <p className="text-sm text-gray-500">Nastavitve za pošiljanje email obvestil</p>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">SMTP strežnik</label>
          <input
            value={form.host}
            onChange={e => setForm({ ...form, host: e.target.value })}
            placeholder="smtp.primer.si"
            className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Port</label>
            <input
              type="number"
              value={form.port}
              onChange={e => setForm({ ...form, port: parseInt(e.target.value) || 587 })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex items-end pb-1">
            <label className="flex items-center gap-2 cursor-pointer px-3 py-2">
              <input
                type="checkbox"
                checked={form.secure}
                onChange={e => setForm({ ...form, secure: e.target.checked })}
                className="w-4 h-4 rounded border-gray-300"
              />
              <span className="text-sm text-gray-700">SSL/TLS</span>
            </label>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Uporabniško ime</label>
          <input
            value={form.user}
            onChange={e => setForm({ ...form, user: e.target.value })}
            placeholder="user@primer.si"
            className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Geslo</label>
          <input
            type="password"
            value={form.password}
            onChange={e => setForm({ ...form, password: e.target.value })}
            placeholder="••••••••"
            className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Ime pošiljatelja</label>
          <input
            value={form.fromName}
            onChange={e => setForm({ ...form, fromName: e.target.value })}
            placeholder="Šolski Urnik"
            className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email pošiljatelja</label>
          <input
            type="email"
            value={form.fromEmail}
            onChange={e => setForm({ ...form, fromEmail: e.target.value })}
            placeholder="urnik@primer.si"
            className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>
      <div className="flex gap-2 mt-5">
        <button
          onClick={handleSave}
          disabled={saving}
          className={`px-5 py-2.5 rounded-lg font-medium transition flex items-center gap-2 disabled:opacity-50 ${
            saved ? 'bg-green-600 text-white' : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          <Save className="w-4 h-4" />
          {saved ? 'Shranjeno!' : 'Shrani'}
        </button>
      </div>
      {/* Test email */}
      <div className="mt-6 pt-5 border-t border-gray-100">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Pošlji testni email</h3>
        <div className="flex gap-2 max-w-md">
          <input
            type="email"
            value={testEmail}
            onChange={e => setTestEmail(e.target.value)}
            placeholder="test@primer.si"
            className="flex-1 px-3 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={handleTest}
            disabled={testing || !testEmail}
            className="bg-purple-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-purple-700 transition flex items-center gap-2 disabled:opacity-50"
          >
            {testing ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            ) : (
              <Send className="w-4 h-4" />
            )}
            Pošlji
          </button>
        </div>
        {testResult && (
          <p className={`mt-2 text-sm ${testResult.startsWith('✅') ? 'text-green-600' : 'text-red-600'}`}>
            {testResult}
          </p>
        )}
      </div>
    </div>
  );
}
