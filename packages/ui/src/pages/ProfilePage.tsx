import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { useSession } from "../state/SessionContext";
import { ParchmentCard } from "../components/ParchmentCard";
import { RuneButton } from "../components/RuneButton";
import { GuideCharacter } from "../components/GuideCharacter";
import { Starfield } from "../components/Starfield";

export function ProfilePage() {

    const { parent, setParent, clearSession } = useSession();

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

    const [currentPassword, setCurrentPassword] = useState("");

    const [newPassword, setNewPassword] = useState("");

    const [confirmPassword, setConfirmPassword] = useState("");

    const [passwordSaved, setPasswordSaved] = useState(false);

    const [passwordError, setPasswordError] = useState<string | null>(null);

    const { token } = useSession();

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
        <div className="relative min-h-screen px-6 py-10">

            <Starfield count={14} />

            <div className="relative z-10 max-w-xl mx-auto">

                <header className="flex items-center justify-between mb-8">

                    <div>
                        <p className="font-data text-mystic text-xs tracking-[0.3em] uppercase mb-1">
                            Your Account
                        </p>
                        <h1 className="font-display text-3xl text-parchment">Profile & Settings</h1>
                    </div>

                    <RuneButton variant="ghost" onClick={() => navigate("/dashboard")}>
                        Back to the Study
                    </RuneButton>

                </header>

                <div className="flex flex-col gap-6">

                    <ParchmentCard>

                        <h2 className="font-display text-lg text-ember mb-4">Profile</h2>

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

                            {profileSaved && (
                                <p className="text-mystic text-sm" role="status">Saved.</p>
                            )}

                            <RuneButton type="submit" className="self-start">Save profile</RuneButton>

                        </form>

                    </ParchmentCard>

                    <ParchmentCard>

                        <h2 className="font-display text-lg text-ember mb-4">Change password</h2>

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

                    </ParchmentCard>

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
