import { useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { useSettingsStore } from '@/stores';
import Layout from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Mail, Phone, MapPin, Edit, Save, X } from 'lucide-react';
import { pushBellNotification } from '@/lib/notification-helpers';
import { useAutoRefresh } from '@/hooks/useAutoRefresh';

const ContactPage = observer(() => {
  const settingsStore = useSettingsStore();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState(settingsStore.contactInfo);

  useAutoRefresh(() => settingsStore.fetchContact(), [settingsStore], { intervalMs: 7000 });

  useEffect(() => {
    if (!isEditing) {
      setFormData(settingsStore.contactInfo);
    }
  }, [isEditing, settingsStore.contactInfo]);

  const handleSave = async () => {
    await settingsStore.updateContactInfo(formData);
    setIsEditing(false);
    pushBellNotification({
      title: 'Contact updated',
      message: 'Contact information has been updated successfully.',
      type: 'system',
      priority: 'low',
    });
  };

  const handleCancel = () => {
    setFormData(settingsStore.contactInfo);
    setIsEditing(false);
  };

  return (
    <Layout className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#eef6ff_100%)] p-4 dark:bg-[linear-gradient(180deg,#020617_0%,#0f172a_100%)]">
      <div className="mb-4 overflow-hidden rounded-[20px] border border-slate-200/70 bg-white/92 shadow-[0_14px_40px_rgba(15,23,42,0.05)] backdrop-blur dark:border-slate-800 dark:bg-slate-950/78">
        <div className="grid gap-3 px-4 py-4 lg:grid-cols-[minmax(0,1.5fr),360px] lg:px-5">
          <div className="space-y-2.5">
            <span className="inline-flex w-fit items-center rounded-lg border border-sky-200 bg-sky-50 px-3 py-1 text-sm font-medium text-sky-700 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-200">
              Contact Desk
            </span>
            <div>
              <h1 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">Contact Information</h1>
              <p className="mt-0.5 text-sm font-medium text-slate-500 dark:text-slate-400">Manage contact details displayed on the public homepage</p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-3">
            <div className="rounded-2xl border border-sky-200/70 bg-sky-50/90 p-3 dark:border-sky-500/20 dark:bg-sky-500/10">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-sky-700 dark:text-sky-200">Email</p>
              <p className="mt-1 truncate text-sm font-semibold text-sky-900 dark:text-sky-50">{settingsStore.contactInfo.email || '-'}</p>
            </div>
            <div className="rounded-2xl border border-emerald-200/70 bg-emerald-50/90 p-3 dark:border-emerald-500/20 dark:bg-emerald-500/10">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-200">Phone</p>
              <p className="mt-1 truncate text-sm font-semibold text-emerald-900 dark:text-emerald-50">{settingsStore.contactInfo.phone || '-'}</p>
            </div>
            <div className="rounded-2xl border border-amber-200/70 bg-amber-50/90 p-3 dark:border-amber-500/20 dark:bg-amber-500/10">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-amber-700 dark:text-amber-200">Mode</p>
              <p className="mt-1 text-sm font-semibold text-amber-900 dark:text-amber-50">{isEditing ? 'Editing' : 'Viewing'}</p>
            </div>
          </div>
        </div>
      </div>

      {!isEditing && (
        <Card className="mb-4 border-slate-200/70 bg-white/92 p-3 shadow-[0_14px_40px_rgba(15,23,42,0.04)] dark:border-slate-800 dark:bg-slate-950/78">
          <div className="flex justify-end">
            <Button onClick={() => setIsEditing(true)} className="h-10 gap-2 rounded-xl">
              <Edit className="h-4 w-4" />
              Edit Contact
            </Button>
          </div>
        </Card>
      )}

      {isEditing ? (
        <Card>
          <CardHeader>
            <CardTitle>Edit Contact Information</CardTitle>
            <CardDescription>Update contact details for public homepage</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="info@islasakay.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+63 912 345 6789"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="officeHours">Office Hours</Label>
              <Input
                id="officeHours"
                value={formData.officeHours}
                onChange={(e) => setFormData({ ...formData, officeHours: e.target.value })}
                placeholder="Mon-Fri, 8:00 AM - 5:00 PM"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="officeAddress">Office Address</Label>
              <Textarea
                id="officeAddress"
                value={formData.officeAddress}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData({ ...formData, officeAddress: e.target.value })}
                placeholder="Enter office address"
                rows={4}
              />
            </div>

            <div className="flex gap-2 pt-4">
              <Button onClick={() => void handleSave()} className="gap-2">
                <Save className="h-4 w-4" />
                Save Changes
              </Button>
              <Button onClick={handleCancel} variant="outline" className="gap-2">
                <X className="h-4 w-4" />
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Email
              </CardTitle>
              <CardDescription>Send us an email</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-lg font-semibold text-blue-600">{settingsStore.contactInfo.email}</p>
              <p className="text-sm text-gray-500 mt-2">We typically respond within 24 hours</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Phone className="h-5 w-5" />
                Phone
              </CardTitle>
              <CardDescription>Call us directly</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-lg font-semibold text-blue-600">{settingsStore.contactInfo.phone}</p>
              <p className="text-sm text-gray-500 mt-2">{settingsStore.contactInfo.officeHours}</p>
            </CardContent>
          </Card>

          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Office Location
              </CardTitle>
              <CardDescription>Visit our office</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-lg font-semibold mb-2">Isla Sakay Main Office</p>
              <p className="text-gray-600 whitespace-pre-line">
                {settingsStore.contactInfo.officeAddress}
              </p>
            </CardContent>
          </Card>
        </div>
      )}
    </Layout>
  );
});

export default ContactPage;
