import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { pushBellNotification } from '@/lib/notification-helpers';
import { playInfoSound, setSoundPreferences } from '@/lib/sounds';
import { preferencesAPI } from '@/api/preferences';
import { UserCog, Lock, Trash2, Bell, Sun, Moon } from 'lucide-react';
import { useUnsavedChangesGuard } from '@/hooks/useUnsavedChangesGuard';

export default function AccountSettingsPage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState({
    username: user?.username || '',
    email: user?.email || '',
  });
  const [editing, setEditing] = useState<{ username: boolean; email: boolean }>({ username: false, email: false });
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwords, setPasswords] = useState({ current: '', new: '', confirm: '' });
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [soundVolume, setSoundVolume] = useState(0.3);
  const [theme, setTheme] = useState<'light' | 'dark'>(() =>
    document.documentElement.classList.contains('dark') ? 'dark' : 'light',
  );
  const passwordDirty = showPasswordModal && Boolean(passwords.current || passwords.new || passwords.confirm);
  const { confirmDiscard, discardDialog } = useUnsavedChangesGuard(passwordDirty);

  useEffect(() => {
    const loadPreferences = async () => {
      try {
        const pref = await preferencesAPI.getAccountPreferences();
        setTheme(pref.theme);
        setSoundEnabled(pref.notificationSoundEnabled);
        setSoundVolume(pref.notificationSoundVolume);
        setSoundPreferences(pref.notificationSoundEnabled, pref.notificationSoundVolume);
        document.documentElement.classList.toggle('dark', pref.theme === 'dark');
      } catch {
        // Fallback to current in-memory defaults.
      }
    };
    void loadPreferences();
  }, []);

  const handleSoundEnabledChange = async (checked: boolean) => {
    setSoundEnabled(checked);
    setSoundPreferences(checked, soundVolume);
    await preferencesAPI.updateAccountPreferences({
      notificationSoundEnabled: checked,
      notificationSoundVolume: soundVolume,
      theme,
    });
  };

  const handleSoundVolumeChange = async (value: number) => {
    const normalized = Math.min(1, Math.max(0, value));
    setSoundVolume(normalized);
    setSoundPreferences(soundEnabled, normalized);
    await preferencesAPI.updateAccountPreferences({
      notificationSoundEnabled: soundEnabled,
      notificationSoundVolume: normalized,
      theme,
    });
  };

  const handlePreviewSound = () => {
    playInfoSound();
  };

  const applyTheme = async (nextTheme: 'light' | 'dark') => {
    if (theme === nextTheme) {
      return;
    }
    setTheme(nextTheme);
    document.documentElement.classList.toggle('dark', nextTheme === 'dark');
    await preferencesAPI.updateAccountPreferences({
      theme: nextTheme,
      notificationSoundEnabled: soundEnabled,
      notificationSoundVolume: soundVolume,
    });
    pushBellNotification({
      title: 'Theme updated',
      message: `${nextTheme === 'dark' ? 'Dark' : 'Light'} mode enabled.`,
      type: 'system',
      priority: 'low',
    });
  };

  const requestClosePasswordModal = async () => {
    if (!(await confirmDiscard())) return;
    setShowPasswordModal(false);
    setPasswords({ current: '', new: '', confirm: '' });
  };

  return (
    <Layout className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#eef6ff_100%)] p-4 dark:bg-[linear-gradient(180deg,#020617_0%,#0f172a_100%)]">
      <div className="mb-4 overflow-hidden rounded-[20px] border border-slate-200/70 bg-white/92 shadow-[0_14px_40px_rgba(15,23,42,0.05)] backdrop-blur dark:border-slate-800 dark:bg-slate-950/78">
        <div className="grid gap-3 px-4 py-4 lg:grid-cols-[minmax(0,1.5fr),360px] lg:px-5">
          <div className="space-y-2.5">
            <span className="inline-flex w-fit items-center rounded-lg border border-sky-200 bg-sky-50 px-3 py-1 text-sm font-medium text-sky-700 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-200">
              Account Desk
            </span>
            <div>
              <h1 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">Account Settings</h1>
              <p className="mt-0.5 text-sm font-medium text-slate-500 dark:text-slate-400">Manage your account profile, security, appearance, and notifications</p>
            </div>
          </div>

          <div className="flex items-center gap-4 justify-start lg:justify-end">
            <Avatar className="h-14 w-14">
              <AvatarImage src={''} alt={user?.username || ''} />
              <AvatarFallback>{user?.username?.[0]?.toUpperCase() || '?'}</AvatarFallback>
            </Avatar>
            <div>
              <div className="text-sm font-semibold text-slate-900 dark:text-slate-50">{user?.username}</div>
              <div className="text-sm text-slate-500 dark:text-slate-400">{user?.email}</div>
            </div>
          </div>
        </div>
      </div>

      <Tabs defaultValue="profile" className="w-full space-y-4">
        <TabsList className="h-auto flex-wrap gap-2 rounded-2xl border border-slate-200/70 bg-white/92 p-2 shadow-[0_14px_40px_rgba(15,23,42,0.04)] dark:border-slate-800 dark:bg-slate-950/78">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="appearance">Appearance</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="danger">Danger Zone</TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <Card className="max-w-2xl border-slate-200/70 bg-white/92 shadow-[0_14px_40px_rgba(15,23,42,0.04)] dark:border-slate-800 dark:bg-slate-950/78">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><UserCog className="h-5 w-5" /> Profile Information</CardTitle>
              <CardDescription>Update your account details</CardDescription>
            </CardHeader>
            <CardContent>
              <form className="space-y-4">
                <div>
                  <Label htmlFor="username">Username</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="username"
                      value={profile.username}
                      disabled={!editing.username}
                      onChange={e => setProfile(p => ({ ...p, username: e.target.value }))}
                      className="mt-1"
                    />
                    {!editing.username ? (
                      <Button type="button" variant="outline" size="sm" onClick={() => setEditing(e => ({ ...e, username: true }))}>Edit</Button>
                    ) : (
                      <>
                        <Button type="button" size="sm" onClick={() => setEditing(e => ({ ...e, username: false }))}>Save</Button>
                        <Button type="button" variant="ghost" size="sm" onClick={() => { setProfile(p => ({ ...p, username: user?.username || '' })); setEditing(e => ({ ...e, username: false })); }}>Cancel</Button>
                      </>
                    )}
                  </div>
                </div>
                <div>
                  <Label htmlFor="email">Email Address</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="email"
                      type="email"
                      value={profile.email}
                      disabled={!editing.email}
                      onChange={e => setProfile(p => ({ ...p, email: e.target.value }))}
                      className="mt-1"
                    />
                    {!editing.email ? (
                      <Button type="button" variant="outline" size="sm" onClick={() => setEditing(e => ({ ...e, email: true }))}>Edit</Button>
                    ) : (
                      <>
                        <Button type="button" size="sm" onClick={() => setEditing(e => ({ ...e, email: false }))}>Save</Button>
                        <Button type="button" variant="ghost" size="sm" onClick={() => { setProfile(p => ({ ...p, email: user?.email || '' })); setEditing(e => ({ ...e, email: false })); }}>Cancel</Button>
                      </>
                    )}
                  </div>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security">
          <Card className="max-w-2xl border-slate-200/70 bg-white/92 shadow-[0_14px_40px_rgba(15,23,42,0.04)] dark:border-slate-800 dark:bg-slate-950/78">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Lock className="h-5 w-5" /> Security</CardTitle>
              <CardDescription>Change your password</CardDescription>
            </CardHeader>
            <CardContent>
              <Dialog open={showPasswordModal} onOpenChange={(open) => {
                if (open) {
                  setShowPasswordModal(true);
                  return;
                }
                void requestClosePasswordModal();
              }}>
                <DialogTrigger asChild>
                  <Button type="button" onClick={() => setShowPasswordModal(true)}>Change Password</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Change Password</DialogTitle>
                    <DialogDescription>Enter your current and new password below.</DialogDescription>
                  </DialogHeader>
                  <form className="space-y-4">
                    <div>
                      <Label htmlFor="currentPassword">Current Password</Label>
                      <Input
                        id="currentPassword"
                        type="password"
                        value={passwords.current}
                        onChange={e => setPasswords(p => ({ ...p, current: e.target.value }))}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="newPassword">New Password</Label>
                      <Input
                        id="newPassword"
                        type="password"
                        value={passwords.new}
                        onChange={e => setPasswords(p => ({ ...p, new: e.target.value }))}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="confirmPassword">Confirm New Password</Label>
                      <Input
                        id="confirmPassword"
                        type="password"
                        value={passwords.confirm}
                        onChange={e => setPasswords(p => ({ ...p, confirm: e.target.value }))}
                        className="mt-1"
                      />
                    </div>
                  </form>
                  <DialogFooter>
                    <Button type="button" onClick={() => setShowPasswordModal(false)}>Save</Button>
                    <Button type="button" variant="ghost" onClick={() => void requestClosePasswordModal()}>Cancel</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="appearance">
          <Card className="max-w-2xl border-slate-200/70 bg-white/92 shadow-[0_14px_40px_rgba(15,23,42,0.04)] dark:border-slate-800 dark:bg-slate-950/78">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {theme === 'dark' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
                Appearance
              </CardTitle>
              <CardDescription>Choose your preferred theme for the dashboard.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => applyTheme('light')}
                  className={`rounded-lg border p-4 text-left transition ${
                    theme === 'light'
                      ? 'border-blue-500 bg-blue-50 shadow-sm'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="mb-2 flex items-center gap-2">
                    <Sun className="h-4 w-4" />
                    <span className="font-medium">Light</span>
                  </div>
                  <p className="text-sm text-gray-600">Clean and bright interface for daytime use.</p>
                </button>

                <button
                  type="button"
                  onClick={() => applyTheme('dark')}
                  className={`rounded-lg border p-4 text-left transition ${
                    theme === 'dark'
                      ? 'border-blue-500 bg-blue-50 shadow-sm'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="mb-2 flex items-center gap-2">
                    <Moon className="h-4 w-4" />
                    <span className="font-medium">Dark</span>
                  </div>
                  <p className="text-sm text-gray-600">Reduced glare and better low-light comfort.</p>
                </button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications">
          <Card className="max-w-2xl border-slate-200/70 bg-white/92 shadow-[0_14px_40px_rgba(15,23,42,0.04)] dark:border-slate-800 dark:bg-slate-950/78">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Bell className="h-5 w-5" /> Notification Preferences</CardTitle>
              <CardDescription>Control alert sounds and volume.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between rounded-md border p-4">
                <div>
                  <h3 className="font-medium text-gray-900">Enable notification sounds</h3>
                  <p className="text-sm text-gray-600">Play a short sound for toast alerts.</p>
                </div>
                <input
                  type="checkbox"
                  checked={soundEnabled}
                  onChange={(e) => void handleSoundEnabledChange(e.target.checked)}
                  className="h-5 w-5 cursor-pointer rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
              </div>

              <div className="space-y-3 rounded-md border p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-gray-900">Sound volume</h3>
                    <p className="text-sm text-gray-600">Adjust notification loudness.</p>
                  </div>
                  <span className="text-sm font-medium text-gray-700">{Math.round(soundVolume * 100)}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={Math.round(soundVolume * 100)}
                  disabled={!soundEnabled}
                  onChange={(e) => void handleSoundVolumeChange(Number(e.target.value) / 100)}
                  className="w-full accent-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
                />
                <div className="flex justify-end">
                  <Button type="button" variant="outline" size="sm" onClick={handlePreviewSound} disabled={!soundEnabled}>
                    Play Test Sound
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="danger">
          <Card className="max-w-2xl border-red-300 bg-white/92 shadow-[0_14px_40px_rgba(15,23,42,0.04)] dark:border-red-900/60 dark:bg-slate-950/78">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-600"><Trash2 className="h-5 w-5" /> Danger Zone</CardTitle>
              <CardDescription>This action is irreversible. Please proceed with caution.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="destructive" type="button">Delete Account</Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      {discardDialog}
    </Layout>
  );
}
