import { FormEvent, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "../api/client";
import { useSession } from "../state/SessionContext";
import { ParchmentCard } from "../components/ParchmentCard";
import { RuneButton } from "../components/RuneButton";
import { GuideCharacter } from "../components/GuideCharacter";
import { Starfield } from "../components/Starfield";

export function ProfilePage() {

    const { parent, setParent, clearSession, token } = useSession();

    const navigate = useNavigate();

    const [displayName, setDisplayName] = useState(parent?.displayName ?? "");

    const [weeklyReportEmailEnabled, setWeeklyReportEmailEnabled] = useState(
        parent?.settings.weeklyReportEmailEnabled ?? true
    );

    const [dailyPlayLimitMinutes, setDailyPlayLimitMinutes] = useState(
        parent?.settings.dailyPlayLimitMinutes ?? 30
    );

    const [profileSaved, setProfileSaved] = useState(false);

    const [profileError, setProfileError] = useState<string | null>(null);

    async function handleSaveProfile(event: FormEvent) {

        event.preventDefault();

        if (!token) return;

        setProfileError(null);

        setProfileSaved(false);

        try {

            const result = await api.updateProfile(token, {
                displayName,
                settings: { weeklyReportEmailEnabled, dailyPlayLimitMinutes }
            });

            setParent(result.parent);

            setProfileSaved(true);

        }
        catch (err) {

            setProfileError(err instanceof Error ? err.message : "Could not save changes.");

        }

    }

    return (
        <div className="relative min-h-screen px-6 py-10">

            <Starfield count={14} />

            <div className="relative z-10 max-w-xl mx-auto">

                <header className="flex items-center justify-between mb-8">

                    <div>
                        <p className="font-data text-mystic text-xs tracking-[0.3em] uppercase mb-1">
                            Your Account
                        </p>
                        <h1 className="font-display text-3xl text-parchment">Settings</h1>
                    </div>

                    <RuneButton variant="ghost" onClick={() => navigate("/dashboard")}>
                        Back to the Study
                    </RuneButton>

                </header>

                <div className="flex flex-col gap-6">

                    <SettingsSection title="General" defaultOpen>

                        <form onSubmit={handleSaveProfile} className="flex flex-col gap-4">

                            <label className="flex flex-col gap-1 text-sm">
                                <span className="text-parchmentDim font-semibold">Your name</span>
                                <input
                                    value={displayName}
                                    onChange={event => setDisplayName(event.target.value)}
                                    className="bg-night/60 border border-parchmentDim/30 rounded-lg px-3 py-2 text-parchment focus:border-ember outline-none"
                                    required
                                />
                            </label>

                            <label className="flex items-center justify-between gap-3 text-sm">
                                <span className="text-parchmentDim font-semibold">Weekly report emails</span>
                                <input
                                    type="checkbox"
                                    checked={weeklyReportEmailEnabled}
                                    onChange={event => setWeeklyReportEmailEnabled(event.target.checked)}
                                    className="w-5 h-5 accent-ember"
                                />
                            </label>

                            <label className="flex flex-col gap-1 text-sm">
                                <span className="text-parchmentDim font-semibold">Daily play limit (minutes)</span>
                                <input
                                    type="number"
                                    min={5}
                                    max={180}
                                    value={dailyPlayLimitMinutes}
                                    onChange={event => setDailyPlayLimitMinutes(Number(event.target.value))}
                                    className="bg-night/60 border border-parchmentDim/30 rounded-lg px-3 py-2 text-parchment focus:border-ember outline-none w-32"
                                />
                            </label>

                            {profileError && <p className="text-rose text-sm" role="alert">{profileError}</p>}

                            <AnimatePresence>
                                {profileSaved && (
                                    <motion.p
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        className="text-mystic text-sm"
                                        role="status"
                                    >
                                        Saved.
                                    </motion.p>
                                )}
                            </AnimatePresence>

                            <RuneButton type="submit" className="self-start">Save profile</RuneButton>

                        </form>

                    </SettingsSection>

                    <SettingsSection title="API Key">
                        <ApiKeySection />
                    </SettingsSection>

                    <SettingsSection title="Security">
                        <SecuritySection />
                    </SettingsSection>

                    <RuneButton
                        variant="ghost"
                        onClick={() => { clearSession(); navigate("/"); }}
                        className="self-center"
                    >
                        Sign out
                    </RuneButton>

                </div>

            </div>

            <GuideCharacter guideKey="account" />

        </div>
    );

}

// A section that lives permanently on Settings but only reveals its
// contents on demand -- the actual fix for "the password section is
// always visible": nothing sensitive is rendered until the parent
// chooses to open it, with a real animated expand/collapse rather
// than the form being permanently on the page.
function SettingsSection({
    title,
    defaultOpen = false,
    children
}: {
    title: string;
    defaultOpen?: boolean;
    children: React.ReactNode;
}) {

    const [open, setOpen] = useState(defaultOpen);

    return (
        <ParchmentCard className="overflow-hidden">

            <button
                type="button"
                onClick={() => setOpen(current => !current)}
                className="w-full flex items-center justify-between text-left"
                aria-expanded={open}
            >
                <h2 className="font-display text-lg text-ember">{title}</h2>

                <motion.span
                    animate={{ rotate: open ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                    className="text-parchmentDim text-sm"
                    aria-hidden="true"
                >
                    ▾
                </motion.span>

            </button>

            <AnimatePresence initial={false}>

                {open && (

                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: "easeInOut" }}
                        className="overflow-hidden"
                    >

                        <div className="pt-4">
                            {children}
                        </div>

                    </motion.div>

                )}

            </AnimatePresence>

        </ParchmentCard>
    );

}

function SecuritySection() {

    const { token } = useSession();

    const [currentPassword, setCurrentPassword] = useState("");

    const [newPassword, setNewPassword] = useState("");

    const [confirmPassword, setConfirmPassword] = useState("");

    const [passwordSaved, setPasswordSaved] = useState(false);

    const [passwordError, setPasswordError] = useState<string | null>(null);

    async function handleChangePassword(event: FormEvent) {

        event.preventDefault();

        if (!token) return;

        setPasswordError(null);

        setPasswordSaved(false);

        if (newPassword !== confirmPassword) {

            setPasswordError("New passwords don't match.");

            return;

        }

        try {

            await api.changePassword(token, { currentPassword, newPassword });

            setCurrentPassword("");

            setNewPassword("");

            setConfirmPassword("");

            setPasswordSaved(true);

        }
        catch (err) {

            setPasswordError(err instanceof Error ? err.message : "Could not change password.");

        }

    }

    return (
        <form onSubmit={handleChangePassword} className="flex flex-col gap-4">

            <label className="flex flex-col gap-1 text-sm">
                <span className="text-parchmentDim font-semibold">Current password</span>
                <input
                    type="password"
                    value={currentPassword}
                    onChange={event => setCurrentPassword(event.target.value)}
                    className="bg-night/60 border border-parchmentDim/30 rounded-lg px-3 py-2 text-parchment focus:border-ember outline-none"
                    required
                />
            </label>

            <label className="flex flex-col gap-1 text-sm">
                <span className="text-parchmentDim font-semibold">New password</span>
                <input
                    type="password"
                    value={newPassword}
                    onChange={event => setNewPassword(event.target.value)}
                    minLength={8}
                    className="bg-night/60 border border-parchmentDim/30 rounded-lg px-3 py-2 text-parchment focus:border-ember outline-none"
                    required
                />
            </label>

            <label className="flex flex-col gap-1 text-sm">
                <span className="text-parchmentDim font-semibold">Confirm new password</span>
                <input
                    type="password"
                    value={confirmPassword}
                    onChange={event => setConfirmPassword(event.target.value)}
                    minLength={8}
                    className="bg-night/60 border border-parchmentDim/30 rounded-lg px-3 py-2 text-parchment focus:border-ember outline-none"
                    required
                />
            </label>

            {passwordError && <p className="text-rose text-sm" role="alert">{passwordError}</p>}

            {passwordSaved && (
                <p className="text-mystic text-sm" role="status">Password updated.</p>
            )}

            <RuneButton type="submit" variant="secondary" className="self-start">
                Update password
            </RuneButton>

        </form>
    );

}

// BYOK management -- calls the already-existing /settings/api-key
// routes. Status/Update/Remove, matching the flow requested.
function ApiKeySection() {

    const { token } = useSession();

    const [connected, setConnected] = useState<boolean | null>(null);

    const [apiKey, setApiKey] = useState("");

    const [saving, setSaving] = useState(false);

    const [error, setError] = useState<string | null>(null);

    const [justSaved, setJustSaved] = useState(false);

    useEffect(() => {

        if (!token) return;

        api.getApiKeyStatus(token)
            .then(result => setConnected(result.connected))
            .catch(() => setConnected(null));

    }, [token]);

    async function handleSave() {

        if (!token || apiKey.trim().length < 10) {

            setError("That doesn't look like a complete API key yet.");

            return;

        }

        setError(null);

        setSaving(true);

        try {

            const result = await api.setApiKey(token, apiKey.trim());

            setConnected(result.connected);

            setApiKey("");

            setJustSaved(true);

            setTimeout(() => setJustSaved(false), 2000);

        }
        catch (err) {

            setError(err instanceof Error ? err.message : "Could not save that key.");

        }
        finally {

            setSaving(false);

        }

    }

    async function handleRemove() {

        if (!token) return;

        try {

            const result = await api.removeApiKey(token);

            setConnected(result.connected);

        }
        catch (err) {

            setError(err instanceof Error ? err.message : "Could not remove the key.");

        }

    }

    return (
        <div className="flex flex-col gap-4">

            <div className="flex items-center gap-2 text-sm">

                <span className="text-parchmentDim font-semibold">Status:</span>

                {connected === null ? (

                    <span className="text-parchmentDim/60">Checking…</span>

                ) : connected ? (

                    <span className="text-mystic flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-mystic inline-block" aria-hidden="true" />
                        Connected
                    </span>

                ) : (

                    <span className="text-parchmentDim/70 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-parchmentDim/40 inline-block" aria-hidden="true" />
                        No API key
                    </span>

                )}

            </div>

            <label className="flex flex-col gap-1 text-sm">
                <span className="text-parchmentDim font-semibold">
                    {connected ? "Replace your key" : "Add your Gemini API key"}
                </span>
                <input
                    type="password"
                    value={apiKey}
                    onChange={event => setApiKey(event.target.value)}
                    placeholder="AIza..."
                    className="bg-night/60 border border-parchmentDim/30 rounded-lg px-3 py-2 text-parchment focus:border-ember outline-none font-data"
                />
            </label>

            {error && <p className="text-rose text-sm" role="alert">{error}</p>}

            <AnimatePresence>
                {justSaved && (
                    <motion.p
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0 }}
                        className="text-mystic text-sm"
                        role="status"
                    >
                        ✓ Key validated and saved.
                    </motion.p>
                )}
            </AnimatePresence>

            <div className="flex items-center gap-3">

                <RuneButton onClick={handleSave} disabled={saving} className="self-start">
                    {saving ? "Validating…" : "Save key"}
                </RuneButton>

                {connected && (
                    <RuneButton variant="ghost" onClick={handleRemove}>
                        Remove key
                    </RuneButton>
                )}

            </div>

        </div>
    );

}
