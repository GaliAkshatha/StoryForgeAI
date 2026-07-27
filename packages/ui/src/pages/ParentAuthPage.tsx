import { FormEvent, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../api/client";
import { useSession } from "../state/SessionContext";
import { ParchmentCard } from "../components/ParchmentCard";
import { RuneButton } from "../components/RuneButton";
import { GuideCharacter } from "../components/GuideCharacter";
import { Starfield } from "../components/Starfield";

export function ParentAuthPage() {

    const [params] = useSearchParams();

    const [mode, setMode] = useState<"login" | "register">(
        params.get("mode") === "register" ? "register" : "login"
    );

    const [email, setEmail] = useState("");

    const [password, setPassword] = useState("");

    const [displayName, setDisplayName] = useState("");

    const [error, setError] = useState<string | null>(null);

    const [loading, setLoading] = useState(false);

    const { setSession } = useSession();

    const navigate = useNavigate();

    async function handleSubmit(event: FormEvent) {

        event.preventDefault();

        setError(null);

        setLoading(true);

        try {

            const result =
                mode === "register"
                    ? await api.register(email, password, displayName)
                    : await api.login(email, password);

            setSession(result.token, result.parent);

            navigate("/dashboard");

        }
        catch (err) {

            setError(err instanceof Error ? err.message : "Something went wrong.");

        }
        finally {

            setLoading(false);

        }

    }

    return (
        <div className="relative min-h-screen flex items-center justify-center px-6 py-16">

            <Starfield />

            <div className="relative z-10 w-full max-w-md">

                <ParchmentCard>

                    <div className="flex mb-6 rounded-xl overflow-hidden border border-parchmentDim/30">

                        <button
                            className={`flex-1 py-2 font-body font-bold text-sm ${
                                mode === "login" ? "bg-ember text-night" : "text-parchmentDim"
                            }`}
                            onClick={() => setMode("login")}
                            type="button"
                        >
                            Sign in
                        </button>

                        <button
                            className={`flex-1 py-2 font-body font-bold text-sm ${
                                mode === "register" ? "bg-ember text-night" : "text-parchmentDim"
                            }`}
                            onClick={() => setMode("register")}
                            type="button"
                        >
                            Create account
                        </button>

                    </div>

                    <form onSubmit={handleSubmit} className="flex flex-col gap-4">

                        {mode === "register" && (
                            <Field
                                label="Your name"
                                value={displayName}
                                onChange={setDisplayName}
                                placeholder="Riley"
                                required
                            />
                        )}

                        <Field
                            label="Email"
                            type="email"
                            value={email}
                            onChange={setEmail}
                            placeholder="you@example.com"
                            required
                        />

                        <Field
                            label="Password"
                            type="password"
                            value={password}
                            onChange={setPassword}
                            placeholder="••••••••"
                            required
                        />

                        {error && (
                            <p className="text-rose text-sm" role="alert">{error}</p>
                        )}

                        <RuneButton type="submit" disabled={loading}>
                            {loading ? "One moment…" : mode === "register" ? "Create account" : "Sign in"}
                        </RuneButton>

                    </form>

                </ParchmentCard>

            </div>

            <GuideCharacter guideKey={mode === "register" ? "auth-register" : "auth-login"} />

        </div>
    );

}

function Field({
    label,
    value,
    onChange,
    type = "text",
    placeholder,
    required
}: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    type?: string;
    placeholder?: string;
    required?: boolean;
}) {

    return (
        <label className="flex flex-col gap-1 text-sm">
            <span className="text-parchmentDim font-body font-semibold">{label}</span>
            <input
                type={type}
                value={value}
                onChange={event => onChange(event.target.value)}
                placeholder={placeholder}
                required={required}
                className="bg-night/60 border border-parchmentDim/30 rounded-lg px-3 py-2 text-parchment placeholder:text-parchmentDim/40 focus:border-ember outline-none"
            />
        </label>
    );

}
