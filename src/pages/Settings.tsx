import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import PageHead from "@/components/PageHead";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { User, Shield, Bell, AlertTriangle, Camera, Loader2, Monitor, Smartphone, Globe, KeyRound, Copy, Trash2, Plus, Sun, Moon, Laptop } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";

const profileSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required").max(50),
  lastName: z.string().trim().min(1, "Last name is required").max(50),
  email: z.string().trim().email("Invalid email"),
  phone: z.string().trim().max(20).optional().or(z.literal("")),
  currency: z.string().min(1, "Select a currency"),
});
type ProfileValues = z.infer<typeof profileSchema>;

const passwordSchema = z.object({
  newPassword: z.string().min(8, "At least 8 characters"),
  confirmPassword: z.string().min(1, "Confirm your password"),
}).refine((d) => d.newPassword === d.confirmPassword, { message: "Passwords don't match", path: ["confirmPassword"] });
type PasswordValues = z.infer<typeof passwordSchema>;

const currencies = [
  { value: "USD", label: "USD — US Dollar" }, { value: "EUR", label: "EUR — Euro" },
  { value: "GBP", label: "GBP — British Pound" }, { value: "INR", label: "INR — Indian Rupee" },
  { value: "JPY", label: "JPY — Japanese Yen" }, { value: "CAD", label: "CAD — Canadian Dollar" },
  { value: "AUD", label: "AUD — Australian Dollar" },
];

const staticSessions = [
  { device: "Chrome on Windows", icon: Monitor, location: "New York, US", lastActive: "Now", current: true },
  { device: "Safari on iPhone", icon: Smartphone, location: "New York, US", lastActive: "2 hours ago", current: false },
  { device: "Firefox on macOS", icon: Globe, location: "London, UK", lastActive: "3 days ago", current: false },
];

const Settings = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [savingNotifs, setSavingNotifs] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [accessCodes, setAccessCodes] = useState<any[]>([]);
  const [loadingCodes, setLoadingCodes] = useState(false);
  const [generatingCode, setGeneratingCode] = useState(false);
  const [customCode, setCustomCode] = useState("");

  const [notifications, setNotifications] = useState({
    emailAlerts: true, budgetWarnings: true, weeklySummary: false, aiTips: true,
  });

  const profileForm = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: { firstName: "", lastName: "", email: "", phone: "", currency: "USD" },
  });

  const passwordForm = useForm<PasswordValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { newPassword: "", confirmPassword: "" },
  });

  // Fetch profile from Supabase
  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { user: su } } = await supabase.auth.getUser();
      if (!su) return;

      const { data: profile } = await supabase.from("profiles").select("*").eq("user_id", su.id).single();

      if (profile) {
        profileForm.reset({
          firstName: profile.first_name || "",
          lastName: profile.last_name || "",
          email: su.email || "",
          phone: profile.phone || "",
          currency: profile.currency || "USD",
        });
        if (profile.avatar_url) setAvatarPreview(profile.avatar_url);
        setNotifications({
          emailAlerts: profile.email_alerts,
          budgetWarnings: profile.budget_warnings,
          weeklySummary: profile.weekly_summary,
          aiTips: profile.ai_tips,
        });
      } else if (user) {
        profileForm.reset({
          firstName: user.firstName, lastName: user.lastName, email: user.email, phone: "", currency: "USD",
        });
      }
    };
    fetchProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSaveProfile = async (values: ProfileValues) => {
    setSavingProfile(true);
    try {
      const { data: { user: su } } = await supabase.auth.getUser();
      if (!su) throw new Error("Not authenticated");

      const { error } = await supabase.from("profiles").update({
        first_name: values.firstName,
        last_name: values.lastName,
        phone: values.phone || "",
        currency: values.currency,
      }).eq("user_id", su.id);

      if (error) throw error;

      // Update user metadata
      await supabase.auth.updateUser({
        data: { first_name: values.firstName, last_name: values.lastName },
      });

      toast({ title: "Profile updated" });
    } catch {
      toast({ title: "Error", description: "Failed to update profile.", variant: "destructive" });
    } finally {
      setSavingProfile(false);
    }
  };

  const onAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarPreview(URL.createObjectURL(file));

    const { data: { user: su } } = await supabase.auth.getUser();
    if (!su) return;

    const filePath = `${su.id}/avatar.${file.name.split(".").pop()}`;
    const { error: uploadError } = await supabase.storage.from("avatars").upload(filePath, file, { upsert: true });

    if (uploadError) { toast({ title: "Upload failed", variant: "destructive" }); return; }

    const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(filePath);

    await supabase.from("profiles").update({ avatar_url: publicUrl }).eq("user_id", su.id);
    setAvatarPreview(publicUrl);
    toast({ title: "Avatar uploaded" });
  };

  const onChangePassword = async (values: PasswordValues) => {
    setSavingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: values.newPassword });
      if (error) throw error;
      passwordForm.reset();
      toast({ title: "Password changed" });
    } catch {
      toast({ title: "Error", description: "Failed to change password.", variant: "destructive" });
    } finally {
      setSavingPassword(false);
    }
  };

  const onSaveNotifications = async () => {
    setSavingNotifs(true);
    try {
      const { data: { user: su } } = await supabase.auth.getUser();
      if (!su) throw new Error("Not authenticated");

      const { error } = await supabase.from("profiles").update({
        email_alerts: notifications.emailAlerts,
        budget_warnings: notifications.budgetWarnings,
        weekly_summary: notifications.weeklySummary,
        ai_tips: notifications.aiTips,
      }).eq("user_id", su.id);

      if (error) throw error;
      toast({ title: "Preferences saved" });
    } catch {
      toast({ title: "Error", description: "Failed to save preferences.", variant: "destructive" });
    } finally {
      setSavingNotifs(false);
    }
  };

  const onDeleteAccount = async () => {
    setDeletingAccount(true);
    try {
      const { data: { user: su } } = await supabase.auth.getUser();
      if (su) {
        await supabase.from("profiles").delete().eq("user_id", su.id);
        await supabase.from("expenses").delete().eq("user_id", su.id);
        await supabase.from("budgets").delete().eq("user_id", su.id);
        await supabase.from("access_codes").delete().eq("user_id", su.id);
      }
      await logout();
      navigate("/");
    } catch {
      toast({ title: "Error", description: "Failed to delete account.", variant: "destructive" });
      setDeletingAccount(false);
    }
  };

  // ── Access Codes ──────────────────────────
  const fetchAccessCodes = async () => {
    setLoadingCodes(true);
    try {
      const { data: { user: su } } = await supabase.auth.getUser();
      if (!su) return;
      const { data } = await supabase.from("access_codes").select("*").eq("user_id", su.id).order("created_at", { ascending: false });
      setAccessCodes(data || []);
    } catch { /* ignore */ }
    finally { setLoadingCodes(false); }
  };

  const generateCode = async () => {
    const code = customCode.trim();
    if (!code || code.length < 4) {
      toast({ title: "Code must be at least 4 characters", variant: "destructive" });
      return;
    }
    if (code.length > 20) {
      toast({ title: "Code must be 20 characters or less", variant: "destructive" });
      return;
    }
    setGeneratingCode(true);
    try {
      const { data: { user: su } } = await supabase.auth.getUser();
      if (!su) throw new Error("Not authenticated");
      const { error } = await supabase.from("access_codes").insert({
        user_id: su.id,
        code,
        label: `Code ${accessCodes.length + 1}`,
      });
      if (error) {
        if (error.message?.includes("duplicate") || error.code === "23505") {
          toast({ title: "This code is already taken", description: "Please choose a different code.", variant: "destructive" });
        } else throw error;
        return;
      }
      toast({ title: "Access code created", description: code });
      setCustomCode("");
      fetchAccessCodes();
    } catch {
      toast({ title: "Error creating code", variant: "destructive" });
    } finally { setGeneratingCode(false); }
  };

  const deleteCode = async (id: string) => {
    try {
      await supabase.from("access_codes").delete().eq("id", id);
      setAccessCodes((prev) => prev.filter((c) => c.id !== id));
      toast({ title: "Code deleted" });
    } catch {
      toast({ title: "Error", variant: "destructive" });
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast({ title: "Copied to clipboard" });
  };

  useEffect(() => { fetchAccessCodes(); }, []);

  const initials = `${(user?.firstName || "?")[0]}${(user?.lastName || "?")[0]}`.toUpperCase();

  return (
    <div className="mx-auto max-w-4xl space-y-6 animate-fade-in">
      <PageHead title="Settings" description="Manage your account preferences" />
      <div>
        <h1 className="font-display text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Manage your account preferences</p>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="grid w-full grid-cols-6 bg-secondary">
          <TabsTrigger value="profile" className="gap-2 text-xs sm:text-sm"><User className="h-4 w-4" /> Profile</TabsTrigger>
          <TabsTrigger value="appearance" className="gap-2 text-xs sm:text-sm"><Sun className="h-4 w-4" /> Theme</TabsTrigger>
          <TabsTrigger value="security" className="gap-2 text-xs sm:text-sm"><Shield className="h-4 w-4" /> Security</TabsTrigger>
          <TabsTrigger value="sharing" className="gap-2 text-xs sm:text-sm"><KeyRound className="h-4 w-4" /> Sharing</TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2 text-xs sm:text-sm"><Bell className="h-4 w-4" /> Alerts</TabsTrigger>
          <TabsTrigger value="danger" className="gap-2 text-xs sm:text-sm"><AlertTriangle className="h-4 w-4" /> Danger</TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile">
          <Card className="border-border bg-card">
            <CardHeader><CardTitle>Profile Information</CardTitle><CardDescription>Update your personal details</CardDescription></CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-5">
                <div className="relative">
                  <Avatar className="h-20 w-20">
                    {avatarPreview ? <AvatarImage src={avatarPreview} alt="Avatar" /> : null}
                    <AvatarFallback className="bg-primary text-primary-foreground text-lg font-semibold">{initials}</AvatarFallback>
                  </Avatar>
                  <button type="button" onClick={() => fileInputRef.current?.click()} className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-110"><Camera className="h-4 w-4" /></button>
                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={onAvatarChange} />
                </div>
                <div><p className="text-sm font-medium">Profile Photo</p><p className="text-xs text-muted-foreground">JPG, PNG or GIF. Max 5MB.</p></div>
              </div>
              <Separator />
              <Form {...profileForm}>
                <form onSubmit={profileForm.handleSubmit(onSaveProfile)} className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormField control={profileForm.control} name="firstName" render={({ field }) => (<FormItem><FormLabel>First Name</FormLabel><FormControl><Input placeholder="John" {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={profileForm.control} name="lastName" render={({ field }) => (<FormItem><FormLabel>Last Name</FormLabel><FormControl><Input placeholder="Doe" {...field} /></FormControl><FormMessage /></FormItem>)} />
                  </div>
                  <FormField control={profileForm.control} name="email" render={({ field }) => (<FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" disabled {...field} /></FormControl><FormMessage /></FormItem>)} />
                  <FormField control={profileForm.control} name="phone" render={({ field }) => (<FormItem><FormLabel>Phone</FormLabel><FormControl><Input placeholder="+1 (555) 000-0000" {...field} /></FormControl><FormMessage /></FormItem>)} />
                  <FormField control={profileForm.control} name="currency" render={({ field }) => (
                    <FormItem><FormLabel>Currency</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select currency" /></SelectTrigger></FormControl>
                        <SelectContent>{currencies.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
                      </Select><FormMessage />
                    </FormItem>
                  )} />
                  <div className="flex justify-end pt-2"><Button type="submit" disabled={savingProfile}>{savingProfile && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save Changes</Button></div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Appearance Tab */}
        <TabsContent value="appearance">
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle>Appearance</CardTitle>
              <CardDescription>Customize the look and feel of the app</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Label className="text-sm font-medium">Theme</Label>
              <div className="grid grid-cols-3 gap-3">
                {([
                  { value: "light" as const, label: "Light", icon: Sun },
                  { value: "dark" as const, label: "Dark", icon: Moon },
                  { value: "system" as const, label: "System", icon: Laptop },
                ]).map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setTheme(opt.value)}
                    className={`flex flex-col items-center gap-2 rounded-lg border p-4 transition-colors ${
                      theme === opt.value
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-muted-foreground hover:bg-secondary hover:text-foreground"
                    }`}
                  >
                    <opt.icon className="h-6 w-6" />
                    <span className="text-sm font-medium">{opt.label}</span>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security" className="space-y-6">
          <Card className="border-border bg-card">
            <CardHeader><CardTitle>Change Password</CardTitle><CardDescription>Update your account password</CardDescription></CardHeader>
            <CardContent>
              <Form {...passwordForm}>
                <form onSubmit={passwordForm.handleSubmit(onChangePassword)} className="space-y-4">
                  <FormField control={passwordForm.control} name="newPassword" render={({ field }) => (<FormItem><FormLabel>New Password</FormLabel><FormControl><Input type="password" placeholder="••••••••" {...field} /></FormControl><FormMessage /></FormItem>)} />
                  <FormField control={passwordForm.control} name="confirmPassword" render={({ field }) => (<FormItem><FormLabel>Confirm Password</FormLabel><FormControl><Input type="password" placeholder="••••••••" {...field} /></FormControl><FormMessage /></FormItem>)} />
                  <div className="flex justify-end pt-2"><Button type="submit" disabled={savingPassword}>{savingPassword && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Update Password</Button></div>
                </form>
              </Form>
            </CardContent>
          </Card>
          <Card className="border-border bg-card">
            <CardHeader><div className="flex items-center gap-3"><CardTitle>Two-Factor Authentication</CardTitle><Badge variant="secondary" className="text-xs">Coming Soon</Badge></div><CardDescription>Add an extra layer of security</CardDescription></CardHeader>
            <CardContent><div className="flex items-center justify-between rounded-lg border border-border p-4 opacity-60"><div><p className="text-sm font-medium">Enable 2FA</p><p className="text-xs text-muted-foreground">Use an authenticator app</p></div><Switch disabled /></div></CardContent>
          </Card>
          <Card className="border-border bg-card">
            <CardHeader><CardTitle>Active Sessions</CardTitle><CardDescription>Devices currently logged in</CardDescription></CardHeader>
            <CardContent className="space-y-3">
              {staticSessions.map((s, i) => (
                <div key={i} className="flex items-center justify-between rounded-lg border border-border p-4">
                  <div className="flex items-center gap-3">
                    <s.icon className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">{s.device}{s.current && <Badge variant="outline" className="ml-2 text-xs text-primary border-primary">Current</Badge>}</p>
                      <p className="text-xs text-muted-foreground">{s.location} · {s.lastActive}</p>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Sharing Tab */}
        <TabsContent value="sharing">
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle>Access Codes</CardTitle>
              <CardDescription>Set your own code so others can view and manage your expenses without signing in</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-6 flex gap-2">
                <Input
                  placeholder="Enter your custom code (4-20 chars)"
                  value={customCode}
                  onChange={(e) => setCustomCode(e.target.value)}
                  className="tracking-widest"
                  maxLength={20}
                />
                <Button onClick={generateCode} disabled={generatingCode || !customCode.trim()}>
                  {generatingCode ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-1 h-4 w-4" />}
                  Create
                </Button>
              </div>
              {loadingCodes ? (
                <div className="space-y-3">
                  {Array.from({ length: 2 }).map((_, i) => (
                    <div key={i} className="h-16 animate-pulse rounded-lg bg-secondary" />
                  ))}
                </div>
              ) : accessCodes.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border p-8 text-center">
                  <KeyRound className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">No access codes yet. Generate one to share access.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {accessCodes.map((ac) => (
                    <div key={ac.id} className="flex items-center justify-between rounded-lg border border-border p-4">
                      <div className="flex items-center gap-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                          <KeyRound className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-mono text-lg font-bold tracking-widest">{ac.code}</p>
                          <p className="text-xs text-muted-foreground">
                            Created {new Date(ac.created_at).toLocaleDateString()} · {ac.is_active ? (
                              <span className="text-primary">Active</span>
                            ) : (
                              <span className="text-destructive">Inactive</span>
                            )}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => copyCode(ac.code)}>
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-9 w-9 text-destructive hover:text-destructive" onClick={() => deleteCode(ac.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications">
          <Card className="border-border bg-card">
            <CardHeader><CardTitle>Notification Preferences</CardTitle><CardDescription>Choose what you want to be notified about</CardDescription></CardHeader>
            <CardContent className="space-y-6">
              {([
                { key: "emailAlerts" as const, label: "Email Alerts", desc: "Receive important account emails" },
                { key: "budgetWarnings" as const, label: "Budget Limit Warnings", desc: "Get notified when nearing budget limits" },
                { key: "weeklySummary" as const, label: "Weekly Summary", desc: "Receive a weekly spending summary email" },
                { key: "aiTips" as const, label: "AI Tips", desc: "Receive personalized AI financial tips" },
              ]).map((item) => (
                <div key={item.key} className="flex items-center justify-between rounded-lg border border-border p-4">
                  <div><p className="text-sm font-medium">{item.label}</p><p className="text-xs text-muted-foreground">{item.desc}</p></div>
                  <Switch checked={notifications[item.key]} onCheckedChange={(checked) => setNotifications((prev) => ({ ...prev, [item.key]: checked }))} />
                </div>
              ))}
              <div className="flex justify-end pt-2"><Button onClick={onSaveNotifications} disabled={savingNotifs}>{savingNotifs && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save Preferences</Button></div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Danger Tab */}
        <TabsContent value="danger">
          <Card className="border-destructive/30 bg-card">
            <CardHeader><CardTitle className="text-destructive">Danger Zone</CardTitle><CardDescription>Irreversible actions — proceed with caution</CardDescription></CardHeader>
            <CardContent>
              <div className="rounded-lg border border-destructive/30 p-6 text-center">
                <AlertTriangle className="mx-auto mb-3 h-10 w-10 text-destructive" />
                <h3 className="text-lg font-semibold">Delete Your Account</h3>
                <p className="mb-5 text-sm text-muted-foreground">This will permanently delete all your data.</p>
                <AlertDialog>
                  <AlertDialogTrigger asChild><Button variant="destructive">Delete My Account</Button></AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                      <AlertDialogDescription>Type <span className="font-bold text-destructive">DELETE</span> below to confirm.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <Input placeholder='Type "DELETE" to confirm' value={deleteConfirmText} onChange={(e) => setDeleteConfirmText(e.target.value)} />
                    <AlertDialogFooter>
                      <AlertDialogCancel onClick={() => setDeleteConfirmText("")}>Cancel</AlertDialogCancel>
                      <AlertDialogAction disabled={deleteConfirmText !== "DELETE" || deletingAccount} onClick={onDeleteAccount} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                        {deletingAccount && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Permanently Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Settings;
