import { useNavigate } from "react-router-dom";
import { RuneButton } from "../components/RuneButton";
import { GuideCharacter } from "../components/GuideCharacter";
import { Starfield } from "../components/Starfield";

export function LandingPage() {

    const navigate = useNavigate();

    return (
        <div className="relative min-h-screen flex items-center justify-center px-6">

            <Starfield />

            <div className="relative z-10 max-w-2xl text-center">

                <p className="font-data text-mystic text-xs tracking-[0.3em] uppercase mb-4">
                    An Adaptive Learning Adventure
                </p>

                <h1 className="font-display text-4xl md:text-6xl text-parchment leading-tight mb-6">
                    Every Choice
                    <br />
                    <span className="text-ember">Writes the Lesson</span>
                </h1>

                <p className="text-parchmentDim text-lg max-w-lg mx-auto mb-10 font-body">
                    Your child steps into a living story. They decide what happens next —
                    and the world remembers. You watch what they learn along the way.
                </p>

                <div className="flex items-center justify-center gap-4 mb-16">

                    <RuneButton onClick={() => navigate("/auth?mode=register")}>
                        Begin the Journey
                    </RuneButton>

                    <RuneButton variant="secondary" onClick={() => navigate("/auth?mode=login")}>
                        I have an account
                    </RuneButton>

                </div>

                <GuideCharacter guideKey="landing" position="center" />

            </div>

        </div>
    );

}
