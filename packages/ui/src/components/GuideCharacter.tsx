import { useEffect, useState } from "react";
import { EmberSprite } from "./EmberSprite";
import { GuideKey, GuideLine, pickGuideLine } from "../guide/guideDialogue";

interface GuideCharacterProps {

    guideKey: GuideKey;

    // When provided, overrides the stock dialogue line for this key --
    // used to have Ember speak dynamic content, e.g. the actual
    // reflection question just generated for this turn.
    override?: { mood: GuideLine["mood"]; text: string };

    position?: "corner" | "center";

}

export function GuideCharacter({ guideKey, override, position = "corner" }: GuideCharacterProps) {

    const [line, setLine] = useState<GuideLine>(() => override ?? pickGuideLine(guideKey));

    useEffect(() => {

        setLine(override ?? pickGuideLine(guideKey));

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [guideKey, override?.text]);

    const containerClasses =
        position === "corner"
            ? "fixed bottom-6 right-6 z-40 flex items-end gap-3 max-w-sm"
            : "relative flex flex-col items-center gap-3 max-w-md mx-auto";

    return (
        <div className={containerClasses}>

            {position === "corner" && (
                <SpeechBubble text={line.text} guideKey={guideKey} align="right" />
            )}

            <div className="animate-float shrink-0" aria-hidden="true">
                <EmberSprite mood={line.mood} size={position === "corner" ? 72 : 100} />
            </div>

            {position === "center" && (
                <SpeechBubble text={line.text} guideKey={guideKey} align="center" />
            )}

        </div>
    );

}

function SpeechBubble({
    text,
    guideKey,
    align
}: {
    text: string;
    guideKey: GuideKey;
    align: "right" | "center";
}) {

    return (
        <div
            key={`${guideKey}-${text}`}
            role="status"
            className={`animate-popIn parchment-panel rounded-2xl px-4 py-3 shadow-page text-sm text-parchment font-body leading-snug ${
                align === "center" ? "text-center" : ""
            }`}
        >
            <p className="text-ember font-semibold text-xs tracking-wide uppercase mb-1">
                Ember says
            </p>
            <p>{text}</p>
        </div>
    );

}
