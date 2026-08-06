import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { api, ChildProfile, WeeklyReport, WeeklyTrendPoint, LearningSummary } from "../api/client";
import { useSession } from "../state/SessionContext";
import { ParchmentCard } from "../components/ParchmentCard";
import { RuneButton } from "../components/RuneButton";
import { GuideCharacter } from "../components/GuideCharacter";
import { Starfield } from "../components/Starfield";

const AVATARS = ["fox", "owl", "dragon", "rabbit", "otter"];

const AGE_RANGES = ["5-6", "7-8", "9-10", "11-12"];

export function ParentDashboardPage() {

    const { token, parent, clearSession } = useSession();

    const navigate = useNavigate();

    const [children, setChildren] = useState<ChildProfile[]>([]);

    const [selectedChildId, setSelectedChildId] = useState<string | null>(null);

    const [report, setReport] = useState<WeeklyReport | null>(null);

    const [weeklyTrend, setWeeklyTrend] = useState<WeeklyTrendPoint[] | null>(null);

    const [summary, setSummary] = useState<LearningSummary | null>(null);

    const [trendLoading, setTrendLoading] = useState(false);

    const [showCreateForm, setShowCreateForm] = useState(false);

    const [loading, setLoading] = useState(true);

    useEffect(() => {

        if (!token) return;

        api.listChildren(token).then(result => {

            setChildren(result.children);

            setSelectedChildId(current => current ?? result.children[0]?.id ?? null);

            setLoading(false);

        });

    }, [token]);

    useEffect(() => {

        if (!token || !selectedChildId) {
            setReport(null);
            setWeeklyTrend(null);
            setSummary(null);
            return;
        }

        api.weeklyReport(token, selectedChildId).then(result => setReport(result.report));

        setTrendLoading(true);

        api.weeklyTrend(token, selectedChildId)

            .then(result => {
                setWeeklyTrend(result.weeklyTrend);
                setSummary(result.summary);
            })

            .finally(() => setTrendLoading(false));

    }, [token, selectedChildId]);

    async function handleCreateChild(input: { name: string; ageRange: string; avatarId: string; aboutChild?: string }) {

        if (!token) return;

        const result = await api.createChild(token, input);

        setChildren(current => [...current, result.child]);

        setSelectedChildId(result.child.id);

        setShowCreateForm(false);

    }

    const selectedChild = children.find(child => child.id === selectedChildId) ?? null;

    return (
        <div className="relative min-h-screen px-6 py-10">

            <Starfield count={14} />

            <div className="relative z-10 max-w-[1600px] mx-auto px-2 md:px-6">

                <motion.header
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
                    className="flex items-center justify-between mb-10"
                >

                    <div>
                        <p className="font-data text-mystic text-xs tracking-[0.3em] uppercase mb-1">
                            The Study
                        </p>
                        <h1 className="font-display text-3xl text-parchment">
                            Welcome back, {parent?.displayName || "friend"}
                        </h1>
                    </div>

                    <div className="flex items-center gap-2">
                        <RuneButton variant="ghost" onClick={() => navigate("/profile")}>
                            My Account
                        </RuneButton>
                        <RuneButton variant="ghost" onClick={() => { clearSession(); navigate("/"); }}>
                            Sign out
                        </RuneButton>
                    </div>

                </motion.header>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

                    <ParchmentCard className="lg:col-span-3 h-fit">

                        <h2 className="font-display text-lg text-ember mb-4">Storybook Shelf</h2>

                        {loading && <p className="text-parchmentDim text-sm">Loading…</p>}

                        <ul className="flex flex-col gap-2 mb-4">

                            {children.map((child, index) => (
                                <motion.li
                                    key={child.id}
                                    initial={{ opacity: 0, x: -8 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: index * 0.06, duration: 0.3 }}
                                >
                                    <motion.button
                                        whileHover={{ x: 3 }}
                                        whileTap={{ scale: 0.98 }}
                                        onClick={() => setSelectedChildId(child.id)}
                                        className={`w-full text-left px-4 py-3 rounded-lg border transition-colors ${
                                            selectedChildId === child.id
                                                ? "bg-ember/15 border-ember text-parchment"
                                                : "border-parchmentDim/20 text-parchmentDim hover:border-ember/40"
                                        }`}
                                    >
                                        <span className="font-body font-bold block">{child.name}</span>
                                        <span className="text-xs opacity-70">
                                            Age {child.ageRange} · {child.adventureWorldIds.length} adventure{child.adventureWorldIds.length === 1 ? "" : "s"}
                                        </span>
                                    </motion.button>
                                </motion.li>
                            ))}

                        </ul>

                        {!showCreateForm ? (
                            <RuneButton
                                variant="secondary"
                                className="w-full"
                                onClick={() => setShowCreateForm(true)}
                            >
                                + New hero
                            </RuneButton>
                        ) : (
                            <CreateChildForm
                                onCancel={() => setShowCreateForm(false)}
                                onCreate={handleCreateChild}
                            />
                        )}

                    </ParchmentCard>

                    <div className="lg:col-span-9 grid grid-cols-1 md:grid-cols-2 gap-6 items-start">

                        {selectedChild ? (
                            <>
                                <ParchmentCard className="md:col-span-2 flex items-center justify-between">
                                    <div>
                                        <h2 className="font-display text-xl text-parchment">
                                            {selectedChild.name}'s Adventure
                                        </h2>
                                        <p className="text-parchmentDim text-sm">
                                            {selectedChild.adventureWorldIds.length} adventure
                                            {selectedChild.adventureWorldIds.length === 1 ? "" : "s"} so far
                                        </p>
                                    </div>
                                    <RuneButton onClick={() => navigate(`/adventure/${selectedChild.id}`)}>
                                        Play now
                                    </RuneButton>
                                </ParchmentCard>

                                <TrendPanel trend={weeklyTrend} summary={summary} loading={trendLoading} />

                                <WeeklyReportPanel report={report} />
                            </>
                        ) : (
                            !loading && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.97 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ duration: 0.4 }}
                                    className="md:col-span-2"
                                >
                                    <ParchmentCard className="flex flex-col items-center text-center gap-4 py-12">
                                        <GuideCharacter guideKey="dashboard-empty" position="corner" />
                                        <h3 className="font-display text-xl text-parchment">
                                            No heroes yet
                                        </h3>
                                        <p className="text-parchmentDim text-sm max-w-sm">
                                            Create a hero on the left to begin their first adventure.
                                        </p>
                                        <RuneButton onClick={() => setShowCreateForm(true)}>
                                            + New hero
                                        </RuneButton>
                                    </ParchmentCard>
                                </motion.div>
                            )
                        )}

                    </div>

                </div>

            </div>

            <GuideCharacter guideKey={children.length === 0 ? "dashboard-empty" : "dashboard"} />

        </div>
    );

}

function CreateChildForm({
    onCreate,
    onCancel
}: {
    onCreate: (input: { name: string; ageRange: string; avatarId: string; aboutChild?: string }) => void;
    onCancel: () => void;
}) {

    const [name, setName] = useState("");

    const [ageRange, setAgeRange] = useState(AGE_RANGES[0]);

    const [avatarId, setAvatarId] = useState(AVATARS[0]);

    const [aboutChild, setAboutChild] = useState("");

    return (
        <form
            className="flex flex-col gap-3 pt-2 border-t border-parchmentDim/20"
            onSubmit={event => {
                event.preventDefault();
                if (!name.trim()) return;
                onCreate({ name: name.trim(), ageRange, avatarId, aboutChild: aboutChild.trim() || undefined });
            }}
        >

            <input
                value={name}
                onChange={event => setName(event.target.value)}
                placeholder="Hero's name"
                className="bg-night/60 border border-parchmentDim/30 rounded-lg px-3 py-2 text-sm text-parchment placeholder:text-parchmentDim/40 focus:border-ember outline-none"
                required
            />

            <select
                value={ageRange}
                onChange={event => setAgeRange(event.target.value)}
                className="bg-night/60 border border-parchmentDim/30 rounded-lg px-3 py-2 text-sm text-parchment"
            >
                {AGE_RANGES.map(range => (
                    <option key={range} value={range}>Age {range}</option>
                ))}
            </select>

            <div className="flex gap-2">
                {AVATARS.map(avatar => (
                    <button
                        type="button"
                        key={avatar}
                        onClick={() => setAvatarId(avatar)}
                        className={`w-9 h-9 rounded-full border-2 text-xs capitalize flex items-center justify-center ${
                            avatarId === avatar ? "border-ember bg-ember/20" : "border-parchmentDim/30"
                        }`}
                        title={avatar}
                    >
                        {avatar[0].toUpperCase()}
                    </button>
                ))}
            </div>

            <label className="flex flex-col gap-1">
                <span className="text-xs text-parchmentDim">About your child (optional)</span>
                <textarea
                    value={aboutChild}
                    onChange={event => setAboutChild(event.target.value)}
                    placeholder="Loves dragons, a little shy, enjoys mysteries..."
                    rows={2}
                    className="bg-night/60 border border-parchmentDim/30 rounded-lg px-3 py-2 text-sm text-parchment placeholder:text-parchmentDim/40 focus:border-ember outline-none resize-none"
                />
            </label>

            <div className="flex gap-2">
                <RuneButton type="submit" className="flex-1 !py-2 text-sm">Create</RuneButton>
                <RuneButton type="button" variant="ghost" className="!py-2 text-sm" onClick={onCancel}>
                    Cancel
                </RuneButton>
            </div>

        </form>
    );

}

const CANONICAL_SKILL_COLORS: Record<string, string> = {
    confidence: "#FFB454",
    empathy: "#FF6B81",
    creativity: "#4ED9C5",
    perseverance: "#F0DFB4",
    curiosity: "#B87A2E",
    collaboration: "#4E3080",
    "problem-solving": "#D8C592"
};

function skillColor(skill: string): string {
    return CANONICAL_SKILL_COLORS[skill.toLowerCase()] ?? "#4ED9C5";
}

function TrendPanel({
    trend,
    summary,
    loading
}: {
    trend: WeeklyTrendPoint[] | null;
    summary: LearningSummary | null;
    loading: boolean;
}) {

    if (loading && !trend) {
        return (
            <ParchmentCard>
                <p className="text-parchmentDim text-sm animate-pulseGlow">Charting growth over time…</p>
            </ParchmentCard>
        );
    }

    if (!trend || trend.every(week => week.sessionsPlayed === 0)) {
        return (
            <ParchmentCard>
                <h3 className="font-display text-lg text-mystic mb-2">Growth Over Time</h3>
                <p className="text-parchmentDim text-sm">
                    Once a few adventures are played, trends will appear here.
                </p>
            </ParchmentCard>
        );
    }

    // Part 15 (Performance): memoized so re-renders that don't
    // change `trend` (e.g. the parent card re-rendering for an
    // unrelated reason) don't recompute this on every render.
    const skills = useMemo(
        () => [...new Set(trend.flatMap(week => week.skillGrowth.map(p => p.skill)))],
        [trend]
    );

    return (
        <ParchmentCard>

            <h3 className="font-display text-lg text-mystic mb-4">Growth Over Time</h3>

            {summary && (
                <div className="mb-6 bg-night/40 rounded-lg p-4">
                    <p className="text-parchment font-semibold mb-2">{summary.headline}</p>
                    <ul className="text-sm text-parchmentDim flex flex-col gap-1 mb-3">
                        {summary.trendHighlights.map((highlight, index) => (
                            <li key={index}>&bull; {highlight}</li>
                        ))}
                    </ul>
                    <div className="text-xs">
                        <span className="text-ember font-semibold uppercase tracking-wide">
                            Suggested next goal: {summary.suggestedNextGoal}
                        </span>
                        <p className="text-parchmentDim mt-1">{summary.suggestedNextGoalRationale}</p>
                    </div>
                </div>
            )}

            <div className="flex flex-col gap-4">
                {skills.map(skill => (
                    <Sparkline
                        key={skill}
                        skill={skill}
                        color={skillColor(skill)}
                        points={trend.map(week => {
                            const point = week.skillGrowth.find(p => p.skill === skill);
                            return point?.averageDelta ?? 0;
                        })}
                    />
                ))}
            </div>

        </ParchmentCard>
    );

}

function Sparkline({
    skill,
    color,
    points
}: {
    skill: string;
    color: string;
    points: number[];
}) {

    const width = 260;

    const height = 36;

    const coords = points.map((value, index) => {

        const x = (index / Math.max(points.length - 1, 1)) * width;

        const y = height - ((value + 1) / 2) * height;

        return `${x},${y}`;

    });

    return (
        <div>
            <p className="text-xs text-parchmentDim capitalize mb-1">{skill}</p>
            <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
                <motion.polyline
                    points={coords.join(" ")}
                    fill="none"
                    stroke={color}
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={{ pathLength: 1, opacity: 1 }}
                    transition={{ duration: 0.9, ease: "easeOut" }}
                />
                <motion.circle
                    cx={coords[coords.length - 1]?.split(",")[0]}
                    cy={coords[coords.length - 1]?.split(",")[1]}
                    r={3}
                    fill={color}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.7, type: "spring", stiffness: 400, damping: 15 }}
                />
            </svg>
        </div>
    );

}

function WeeklyReportPanel({ report }: { report: WeeklyReport | null }) {

    const [expanded, setExpanded] = useState(false);

    if (!report) {
        return (
            <ParchmentCard>
                <p className="text-parchmentDim text-sm">Loading this week's report…</p>
            </ParchmentCard>
        );
    }

    const visibleSkills = expanded ? report.skillGrowth : report.skillGrowth.slice(0, 1);

    return (
        <ParchmentCard>

            <div className="flex items-center justify-between mb-2">
                <h3 className="font-display text-lg text-mystic">This Week</h3>
                <button
                    onClick={() => setExpanded(current => !current)}
                    className="text-xs text-ember hover:underline"
                    aria-expanded={expanded}
                >
                    {expanded ? "Show less" : "View Details"}
                </button>
            </div>

            <p className="text-parchmentDim text-sm mb-5">{report.summary}</p>

            {visibleSkills.length > 0 && (
                <div className="mb-5">
                    <p className="text-xs uppercase tracking-widest text-parchmentDim mb-2">
                        Observed skills
                    </p>
                    <div className="flex flex-col gap-2">
                        {visibleSkills.map(point => (
                            <div key={point.skill}>
                                <div className="flex justify-between text-xs mb-1">
                                    <span className="capitalize">{point.skill}</span>
                                    <span className="font-data text-parchmentDim">
                                        {point.observationCount} moment{point.observationCount === 1 ? "" : "s"}
                                    </span>
                                </div>
                                <div className="h-2 rounded-full bg-night/60 overflow-hidden">
                                    <motion.div
                                        className="h-full bg-mystic rounded-full"
                                        initial={{ width: 0 }}
                                        animate={{ width: `${Math.max(6, ((point.averageDelta + 1) / 2) * 100)}%` }}
                                        transition={{ duration: 0.6, ease: "easeOut" }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {!expanded && (report.behaviorHighlights.length > 0 || report.recommendations.length > 0) && (
                <p className="text-xs text-parchmentDim/60">
                    Click "View Details" for the full breakdown and Ember's suggestions.
                </p>
            )}

            {expanded && report.behaviorHighlights.length > 0 && (
                <div className="mb-5">
                    <p className="text-xs uppercase tracking-widest text-parchmentDim mb-2">
                        What they did
                    </p>
                    <ul className="text-sm flex flex-col gap-1 list-disc list-inside text-parchment/90">
                        {report.behaviorHighlights.map((note, index) => (
                            <li key={index}>{note}</li>
                        ))}
                    </ul>
                </div>
            )}

            {expanded && report.recommendations.length > 0 && (
                <div>
                    <p className="text-xs uppercase tracking-widest text-parchmentDim mb-2">
                        Ember's suggestions
                    </p>
                    <div className="flex flex-col gap-2">
                        {report.recommendations.map(rec => (
                            <div key={rec.title} className="bg-night/40 rounded-lg p-3">
                                <p className="font-semibold text-sm text-ember">{rec.title}</p>
                                <p className="text-xs text-parchmentDim mt-1">{rec.description}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

        </ParchmentCard>
    );

}
